import "server-only";
import { and, cosineDistance, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { brandProfiles, influencerProfiles, socialAccounts, users, type BrandProfile, type InfluencerProfile } from "@/db/schema";
import { aiConfigured, embed } from "@/lib/ai/gemini";
import { parseBrandQuery, parseCreatorQuery, type BrandQuery, type CreatorQuery } from "@/lib/ai/search";

/*
 * Discover = filter + MATCH SCORE (0-100) + up to 3 reasons.
 *
 *   score = 50% meaning match + 50% rules
 *
 *   meaning match: cosine similarity between Gemini embeddings (stored in Tiger Data with pgvector)
 *                  of the search text (or, with no search, the brand's/creator's own profile)
 *                  and each candidate profile. Scaled 0..1 across the candidates.
 *   rules:         simple, explainable checks (niche, audience country, budget, platform, engagement).
 *
 * Plain-English search: if you type a sentence, Gemini turns it into filters + meaning first.
 * If Gemini is unavailable, everything still works with keyword matching and rules only.
 */

export type CreatorFilters = {
  q?: string;
  niche?: string;
  platform?: string;
  country?: string;
  minFollowers?: number;
  maxRate?: number;
  plain?: boolean; // "search my exact words" (no Gemini parsing)
};

export type BrandFilters = {
  q?: string;
  industry?: string;
  country?: string;
  niche?: string;
  plain?: boolean;
};

export type Understood = { label: string; value: string }[];

/** Country names (profiles) <-> codes (audience data). */
const COUNTRY_CODE: Record<string, string> = {
  "united states": "US", usa: "US", us: "US", america: "US",
  canada: "CA", "united kingdom": "GB", uk: "GB", england: "GB", britain: "GB",
  india: "IN", australia: "AU", germany: "DE", brazil: "BR", france: "FR", spain: "ES",
};
const codeOf = (name?: string | null) => (name ? COUNTRY_CODE[name.trim().toLowerCase()] ?? name.toUpperCase() : undefined);

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const usd = (n: number) => n.toLocaleString("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Turns raw similarities into 0..1 across this result set (Gemini similarities cluster in a narrow band). */
function spread(values: (number | null)[]) {
  const nums = values.filter((v): v is number => v != null);
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  return (v: number | null) => (v == null || !nums.length ? 0.5 : hi - lo < 1e-6 ? 0.5 : (v - lo) / (hi - lo));
}

/* ======================================================================================
 * Brand looking for creators
 * ==================================================================================== */

export async function searchCreators(me: { id: string }, filters: CreatorFilters, brand: BrandProfile | null) {
  // 1. Understand the search text (Gemini), unless the user asked for exact words.
  let parsed: CreatorQuery | null = null;
  let aiNote: string | null = null;
  if (filters.q && !filters.plain && aiConfigured()) {
    try {
      parsed = await parseCreatorQuery(filters.q);
    } catch {
      aiNote = "Gemini couldn't read that search, so it's matched by keywords.";
    }
  }
  const eff = {
    niche: filters.niche ?? parsed?.niche ?? undefined,
    platform: filters.platform ?? parsed?.platform ?? undefined,
    country: filters.country ?? parsed?.country ?? undefined,
    minFollowers: filters.minFollowers ?? parsed?.minFollowers ?? undefined,
    maxRate: filters.maxRate ?? parsed?.maxRate ?? undefined,
    audienceCountry: parsed?.audienceCountry ?? undefined,
    youngAudience: parsed?.youngAudience ?? false,
  };

  // 2. What "meaning" do we compare against? The search, or the brand's own profile.
  let queryVector: number[] | null = null;
  const meaningText: string | null = parsed?.meaning || (filters.q && !filters.plain ? filters.q : null) || null;
  if (meaningText && aiConfigured()) {
    try {
      [queryVector] = await embed([meaningText], "query");
    } catch {
      aiNote = "Matching by meaning is unavailable right now; showing rule-based scores.";
    }
  } else if (!filters.q && brand?.embedding) {
    queryVector = brand.embedding;
  }

  // 3. One query: every creator + their main platform stats + similarity from pgvector.
  const similarity = queryVector
    ? sql<number>`1 - (${cosineDistance(influencerProfiles.embedding, queryVector)})`
    : sql<null>`null`;
  const rows = await db
    .select({ user: users, profile: influencerProfiles, account: socialAccounts, similarity })
    .from(influencerProfiles)
    .innerJoin(users, eq(users.id, influencerProfiles.userId))
    .leftJoin(
      socialAccounts,
      and(eq(socialAccounts.userId, users.id), eq(socialAccounts.platform, influencerProfiles.primaryPlatform)),
    )
    .where(ne(users.id, me.id));

  const keyword = filters.q && (filters.plain || !parsed) ? filters.q.trim().toLowerCase() : null;
  const scale = spread(rows.map((r) => (r.similarity == null ? null : Number(r.similarity))));
  const marketCodes = new Set([brand?.country, ...(brand?.markets ?? [])].map(codeOf).filter(Boolean) as string[]);
  const audienceTarget = (eff.audienceCountry && codeOf(eff.audienceCountry)) || null;

  const results = rows
    .map((r) => {
      const rates = Object.values(r.profile.rateCard);
      const fromRate = rates.length ? Math.min(...rates) : null;
      const niches = [r.profile.primaryNiche, ...r.profile.secondaryNiches];
      return { ...r, fromRate, niches, ...scoreCreator(r.profile, r.account, fromRate, {
        brand, semantic: queryVector ? scale(r.similarity == null ? null : Number(r.similarity)) : null,
        meaningText, marketCodes, audienceTarget, youngAudience: eff.youngAudience,
      }) };
    })
    .filter((r) => {
      if (keyword) {
        const hay = [r.user.displayName, r.profile.handle, r.profile.bio ?? "", ...r.niches].join(" ").toLowerCase();
        if (!hay.includes(keyword)) return false;
      }
      if (eff.niche && !r.niches.includes(eff.niche)) return false;
      if (eff.platform && r.profile.primaryPlatform !== eff.platform) return false;
      if (eff.country && r.profile.country.toLowerCase() !== eff.country.toLowerCase()) return false;
      if (eff.minFollowers && (r.account?.followers ?? 0) < eff.minFollowers) return false;
      if (eff.maxRate && (r.fromRate == null || r.fromRate > eff.maxRate)) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score || (b.account?.followers ?? 0) - (a.account?.followers ?? 0));

  // What Gemini understood, shown above the results so the user can check it.
  const understood: Understood = parsed
    ? [
        { label: "Looking for", value: parsed.meaning },
        ...(parsed.niche ? [{ label: "Niche", value: parsed.niche }] : []),
        ...(parsed.platform ? [{ label: "Platform", value: parsed.platform }] : []),
        ...(parsed.country ? [{ label: "Based in", value: parsed.country }] : []),
        ...(parsed.audienceCountry ? [{ label: "Audience in", value: parsed.audienceCountry }] : []),
        ...(parsed.minFollowers ? [{ label: "Followers", value: `${parsed.minFollowers.toLocaleString("en")}+` }] : []),
        ...(parsed.maxRate ? [{ label: "Max price", value: usd(parsed.maxRate) }] : []),
        ...(parsed.youngAudience ? [{ label: "Audience", value: "Young (18-24)" }] : []),
      ]
    : [];

  return { results, understood, aiNote, rankedBy: queryVector ? (filters.q ? "search" : "profile") : "rules" } as const;
}

function scoreCreator(
  p: InfluencerProfile,
  account: { followers: number | null; engagementRate: string | null } | null,
  fromRate: number | null,
  ctx: {
    brand: BrandProfile | null;
    semantic: number | null;
    meaningText: string | null;
    marketCodes: Set<string>;
    audienceTarget: string | null;
    youngAudience: boolean;
  },
) {
  const reasons: { weight: number; text: string }[] = [];
  const b = ctx.brand;

  // Niche (30%)
  let niche = 0.5;
  if (b?.preferredNiches.length) {
    if (b.preferredNiches.includes(p.primaryNiche)) {
      niche = 1;
      reasons.push({ weight: 0.3, text: `Main niche is ${p.primaryNiche}, one you look for` });
    } else if (p.secondaryNiches.some((n) => b.preferredNiches.includes(n))) {
      niche = 0.6;
      reasons.push({ weight: 0.15, text: `Also covers ${p.secondaryNiches.find((n) => b.preferredNiches.includes(n))}` });
    } else niche = 0;
  }

  // Audience location (25%): share of the audience in the target country or the brand's markets.
  const targets = ctx.audienceTarget ? new Set([ctx.audienceTarget]) : ctx.marketCodes;
  let audience = 0.5;
  if (targets.size && p.audienceTopCountries.length) {
    const share = p.audienceTopCountries.filter((c) => targets.has(c.country)).reduce((s, c) => s + c.pct, 0);
    audience = clamp01(share / 70);
    if (share >= 30) reasons.push({ weight: 0.25 * audience, text: `${share}% of audience in ${[...targets].join("/")}` });
  }
  if (ctx.youngAudience) {
    const young = p.audienceAgeBands.filter((a) => a.band === "13-17" || a.band === "18-24").reduce((s, a) => s + a.pct, 0);
    audience = (audience + clamp01(young / 50)) / 2;
    if (young >= 40) reasons.push({ weight: 0.2, text: `${young}% of audience is under 25` });
  }

  // Budget (20%)
  let budget = 0.5;
  if (b?.budgetMax && fromRate != null) {
    budget = fromRate <= b.budgetMax ? 1 : clamp01(b.budgetMax / fromRate);
    if (fromRate <= b.budgetMax) reasons.push({ weight: 0.18, text: `From ${usd(fromRate)}, within your ${usd(b.budgetMax)} budget` });
  }

  // Platform (10%)
  let platform = 0.5;
  if (b?.preferredPlatforms.length) {
    platform = b.preferredPlatforms.includes(p.primaryPlatform) ? 1 : 0;
  }

  // Engagement (15%)
  const er = account?.engagementRate != null ? Number(account.engagementRate) : null;
  const engagement = er == null ? 0.4 : clamp01(er / 5);
  if (er != null && er >= 4) reasons.push({ weight: 0.12, text: `Strong engagement: ${er.toFixed(1)}%` });

  const rules = 0.3 * niche + 0.25 * audience + 0.2 * budget + 0.1 * platform + 0.15 * engagement;
  const semantic = ctx.semantic;
  if (semantic != null && semantic >= 0.6) {
    reasons.push({
      weight: 0.5 * semantic,
      text: !ctx.meaningText ? "Content closely matches your brand" : ctx.meaningText.length <= 40 ? `Content closely matches "${ctx.meaningText}"` : "Content closely matches your search",
    });
  }

  const score = Math.round(100 * (semantic == null ? rules : 0.5 * semantic + 0.5 * rules));
  return { score, reasons: reasons.sort((x, y) => y.weight - x.weight).slice(0, 3).map((r) => r.text) };
}

/* ======================================================================================
 * Creator looking for brands
 * ==================================================================================== */

export async function searchBrands(me: { id: string }, filters: BrandFilters, creator: InfluencerProfile | null) {
  let parsed: BrandQuery | null = null;
  let aiNote: string | null = null;
  if (filters.q && !filters.plain && aiConfigured()) {
    try {
      parsed = await parseBrandQuery(filters.q);
    } catch {
      aiNote = "Gemini couldn't read that search, so it's matched by keywords.";
    }
  }
  const eff = {
    industry: filters.industry ?? parsed?.industry ?? undefined,
    country: filters.country ?? parsed?.country ?? undefined,
    niche: filters.niche ?? parsed?.niche ?? undefined,
    minBudget: parsed?.minBudget ?? undefined,
  };

  let queryVector: number[] | null = null;
  const meaningText: string | null = parsed?.meaning || (filters.q && !filters.plain ? filters.q : null) || null;
  if (meaningText && aiConfigured()) {
    try {
      [queryVector] = await embed([meaningText], "query");
    } catch {
      aiNote = "Matching by meaning is unavailable right now; showing rule-based scores.";
    }
  } else if (!filters.q && creator?.embedding) {
    queryVector = creator.embedding;
  }

  const similarity = queryVector ? sql<number>`1 - (${cosineDistance(brandProfiles.embedding, queryVector)})` : sql<null>`null`;
  const rows = await db
    .select({ user: users, profile: brandProfiles, similarity })
    .from(brandProfiles)
    .innerJoin(users, eq(users.id, brandProfiles.userId))
    .where(ne(users.id, me.id));

  const myNiches = creator ? [creator.primaryNiche, ...creator.secondaryNiches] : [];
  const myRates = creator ? Object.values(creator.rateCard) : [];
  const myFrom = myRates.length ? Math.min(...myRates) : null;
  const scale = spread(rows.map((r) => (r.similarity == null ? null : Number(r.similarity))));
  const keyword = filters.q && (filters.plain || !parsed) ? filters.q.trim().toLowerCase() : null;

  const results = rows
    .map((r) => {
      const p = r.profile;
      const reasons: { weight: number; text: string }[] = [];
      const overlap = p.preferredNiches.find((n) => myNiches.includes(n));
      const niche = !p.preferredNiches.length ? 0.5 : overlap ? 1 : 0;
      if (overlap) reasons.push({ weight: 0.4, text: `Looking for ${overlap} creators` });
      const platform = !p.preferredPlatforms.length || !creator ? 0.5 : p.preferredPlatforms.includes(creator.primaryPlatform) ? 1 : 0;
      if (creator && platform === 1) reasons.push({ weight: 0.15, text: `Works with ${creator.primaryPlatform} creators` });
      const budget = p.budgetMax == null || myFrom == null ? 0.5 : p.budgetMax >= myFrom ? 1 : clamp01(p.budgetMax / myFrom);
      if (p.budgetMax != null && myFrom != null && p.budgetMax >= myFrom) reasons.push({ weight: 0.3, text: `Budget up to ${usd(p.budgetMax)} fits your rates` });
      const country = creator && p.country === creator.country ? 1 : 0.5;
      const rules = 0.4 * niche + 0.2 * platform + 0.3 * budget + 0.1 * country;
      const semantic = queryVector ? scale(r.similarity == null ? null : Number(r.similarity)) : null;
      if (semantic != null && semantic >= 0.6) {
        reasons.push({ weight: 0.5 * semantic, text: !meaningText ? "Products match your content" : meaningText.length <= 40 ? `Matches "${meaningText}"` : "Matches your search" });
      }
      const score = Math.round(100 * (semantic == null ? rules : 0.5 * semantic + 0.5 * rules));
      return { ...r, fitsMyNiche: !!overlap, score, reasons: reasons.sort((x, y) => y.weight - x.weight).slice(0, 3).map((x) => x.text) };
    })
    .filter((r) => {
      if (keyword) {
        const hay = [r.profile.brandName, r.profile.industry, r.profile.description ?? "", ...r.profile.preferredNiches].join(" ").toLowerCase();
        if (!hay.includes(keyword)) return false;
      }
      if (eff.industry && r.profile.industry !== eff.industry) return false;
      if (eff.country && r.profile.country.toLowerCase() !== eff.country.toLowerCase()) return false;
      if (eff.niche && !r.profile.preferredNiches.includes(eff.niche)) return false;
      if (eff.minBudget && (r.profile.budgetMax ?? 0) < eff.minBudget) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score);

  const understood: Understood = parsed
    ? [
        { label: "Looking for", value: parsed.meaning },
        ...(parsed.industry ? [{ label: "Industry", value: parsed.industry }] : []),
        ...(parsed.niche ? [{ label: "Wants niche", value: parsed.niche }] : []),
        ...(parsed.country ? [{ label: "Based in", value: parsed.country }] : []),
        ...(parsed.minBudget ? [{ label: "Budget", value: `${usd(parsed.minBudget)}+` }] : []),
      ]
    : [];

  return { results, understood, aiNote, rankedBy: queryVector ? (filters.q ? "search" : "profile") : "rules" } as const;
}

export async function distinctCountries(kind: "creators" | "brands") {
  const rows =
    kind === "creators"
      ? await db.selectDistinct({ c: influencerProfiles.country }).from(influencerProfiles)
      : await db.selectDistinct({ c: brandProfiles.country }).from(brandProfiles);
  return rows.map((r) => r.c).sort();
}
