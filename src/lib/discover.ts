import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { brandProfiles, influencerProfiles, socialAccounts, users } from "@/db/schema";

/*
 * Discover queries. For the hackathon we load the candidate set (a few hundred rows at most)
 * and filter in TypeScript: simple to read and change. Move filters into SQL when data grows.
 */

export type CreatorFilters = {
  q?: string;
  niche?: string;
  platform?: string;
  country?: string;
  minFollowers?: number;
  maxRate?: number;
};

export type BrandFilters = {
  q?: string;
  industry?: string;
  country?: string;
  niche?: string;
};

export async function searchCreators(
  meId: string,
  filters: CreatorFilters,
  preferredNiches: string[] = [],
) {
  const rows = await db
    .select({ user: users, profile: influencerProfiles, account: socialAccounts })
    .from(influencerProfiles)
    .innerJoin(users, eq(users.id, influencerProfiles.userId))
    .leftJoin(
      socialAccounts,
      and(
        eq(socialAccounts.userId, users.id),
        eq(socialAccounts.platform, influencerProfiles.primaryPlatform),
      ),
    )
    .where(ne(users.id, meId));

  const q = filters.q?.trim().toLowerCase();
  const results = rows
    .map((r) => {
      const rates = Object.values(r.profile.rateCard);
      const fromRate = rates.length ? Math.min(...rates) : null;
      const niches = [r.profile.primaryNiche, ...r.profile.secondaryNiches];
      return { ...r, fromRate, niches, fitsPreferred: niches.some((n) => preferredNiches.includes(n)) };
    })
    .filter((r) => {
      if (q) {
        const hay = [r.user.displayName, r.profile.handle, r.profile.bio ?? "", ...r.niches]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.niche && !r.niches.includes(filters.niche)) return false;
      if (filters.platform && r.profile.primaryPlatform !== filters.platform) return false;
      if (filters.country && r.profile.country !== filters.country) return false;
      if (filters.minFollowers && (r.account?.followers ?? 0) < filters.minFollowers) return false;
      if (filters.maxRate && (r.fromRate == null || r.fromRate > filters.maxRate)) return false;
      return true;
    });

  // Until AI match scores land: preferred niches first, then by audience size.
  results.sort(
    (a, b) =>
      Number(b.fitsPreferred) - Number(a.fitsPreferred) ||
      (b.account?.followers ?? 0) - (a.account?.followers ?? 0),
  );
  return results;
}

export async function searchBrands(meId: string, filters: BrandFilters, myNiches: string[] = []) {
  const rows = await db
    .select({ user: users, profile: brandProfiles })
    .from(brandProfiles)
    .innerJoin(users, eq(users.id, brandProfiles.userId))
    .where(ne(users.id, meId));

  const q = filters.q?.trim().toLowerCase();
  const results = rows
    .map((r) => ({ ...r, fitsMyNiche: r.profile.preferredNiches.some((n) => myNiches.includes(n)) }))
    .filter((r) => {
      if (q) {
        const hay = [r.profile.brandName, r.profile.industry, r.profile.description ?? "", ...r.profile.preferredNiches]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.industry && r.profile.industry !== filters.industry) return false;
      if (filters.country && r.profile.country !== filters.country) return false;
      if (filters.niche && !r.profile.preferredNiches.includes(filters.niche)) return false;
      return true;
    });

  results.sort(
    (a, b) =>
      Number(b.fitsMyNiche) - Number(a.fitsMyNiche) ||
      (b.profile.budgetMax ?? 0) - (a.profile.budgetMax ?? 0),
  );
  return results;
}

export async function distinctCountries(kind: "creators" | "brands") {
  const rows =
    kind === "creators"
      ? await db.selectDistinct({ c: influencerProfiles.country }).from(influencerProfiles)
      : await db.selectDistinct({ c: brandProfiles.country }).from(brandProfiles);
  return rows.map((r) => r.c).sort();
}
