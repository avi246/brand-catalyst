"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { brandProfiles, influencerProfiles, socialAccounts, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { AGE_BANDS, FORMATS, INDUSTRIES, NICHES } from "@/lib/constants";

export type EditState = { error?: string; fieldErrors?: Record<string, string[] | undefined> };

/* ---- helpers that turn raw form fields into clean values ---- */
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);
const list = (fd: FormData, key: string) =>
  String(fd.get(key) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
const optInt = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Math.round(Number(s));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
const flatten = (e: z.ZodError) => z.flattenError(e).fieldErrors as Record<string, string[] | undefined>;

const influencerSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name").max(60),
  bio: text(600),
  primaryNiche: z.enum(NICHES),
  secondaryNiches: z.array(z.enum(NICHES)).max(3, "Pick up to 3"),
  city: text(60),
  country: z.string().trim().min(2, "Enter your country").max(60),
  languages: z.array(z.string().max(30)),
  contentFormats: z.array(z.enum(FORMATS)),
  availability: text(80),
  pastBrands: z.array(z.string().max(60)),
  rateCard: z.record(z.string(), z.number().int().min(0).max(1_000_000)),
  audienceTopCountries: z
    .array(z.object({ country: z.string().max(40), pct: z.number().min(0).max(100) }))
    .refine((xs) => xs.reduce((s, x) => s + x.pct, 0) <= 100, "Country shares can't add up to more than 100%"),
  audienceAgeBands: z
    .array(z.object({ band: z.string(), pct: z.number().min(0).max(100) }))
    .refine((xs) => xs.reduce((s, x) => s + x.pct, 0) <= 100, "Age shares can't add up to more than 100%"),
  followers: z.number().int().min(0).nullable(),
  avgViews: z.number().int().min(0).nullable(),
  engagementRate: z.number().min(0).max(100).nullable(),
});

const brandSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name").max(60),
  brandName: z.string().trim().min(2, "Enter your brand name").max(80),
  companyName: text(100),
  website: z.url({ error: "Enter the full website address" }),
  industry: z.enum(INDUSTRIES),
  country: z.string().trim().min(2).max(60),
  markets: z.array(z.string().max(40)),
  description: text(800),
  logoUrl: z.union([z.url({ error: "Logo must be a full image link" }), z.literal("").transform(() => null)]),
  companySize: text(20),
  budgetMin: z.number().int().min(0).nullable(),
  budgetMax: z.number().int().min(0).nullable(),
  targetAudience: text(300),
  campaignGoals: z.array(z.string().max(40)),
  preferredNiches: z.array(z.enum(NICHES)),
  preferredPlatforms: z.array(z.enum(["instagram", "youtube", "tiktok"])),
  paymentTerms: text(120),
}).refine((b) => b.budgetMin == null || b.budgetMax == null || b.budgetMin <= b.budgetMax, {
  message: "Minimum budget must be below the maximum",
  path: ["budgetMax"],
});

export async function updateProfile(_prev: EditState, fd: FormData): Promise<EditState> {
  const me = await requireUser();

  if (me.role === "influencer") {
    const rateCard: Record<string, number> = {};
    for (const f of FORMATS) {
      const n = optInt(fd.get(`rate:${f}`));
      if (n != null && !Number.isNaN(n)) rateCard[f] = n;
    }
    const audienceTopCountries = [1, 2, 3].flatMap((i) => {
      const country = String(fd.get(`audCountry${i}`) ?? "").trim();
      const pct = optInt(fd.get(`audPct${i}`));
      return country && pct != null && !Number.isNaN(pct) ? [{ country, pct }] : [];
    });
    const audienceAgeBands = AGE_BANDS.flatMap((band) => {
      const pct = optInt(fd.get(`age:${band}`));
      return pct != null && !Number.isNaN(pct) ? [{ band, pct }] : [];
    });
    const er = String(fd.get("engagementRate") ?? "").trim();

    const parsed = influencerSchema.safeParse({
      displayName: fd.get("displayName"),
      bio: fd.get("bio") ?? "",
      primaryNiche: fd.get("primaryNiche"),
      secondaryNiches: fd.getAll("secondaryNiches").filter((n) => n !== fd.get("primaryNiche")),
      city: fd.get("city") ?? "",
      country: fd.get("country"),
      languages: list(fd, "languages"),
      contentFormats: fd.getAll("contentFormats"),
      availability: fd.get("availability") ?? "",
      pastBrands: list(fd, "pastBrands"),
      rateCard,
      audienceTopCountries,
      audienceAgeBands,
      followers: optInt(fd.get("followers")),
      avgViews: optInt(fd.get("avgViews")),
      engagementRate: er ? Number(er) : null,
    });
    if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: flatten(parsed.error) };
    const d = parsed.data;

    const [profile] = await db
      .select({ platform: influencerProfiles.primaryPlatform })
      .from(influencerProfiles)
      .where(eq(influencerProfiles.userId, me.id));

    await db.transaction(async (tx) => {
      await tx.update(users).set({ displayName: d.displayName }).where(eq(users.id, me.id));
      await tx
        .update(influencerProfiles)
        .set({
          bio: d.bio,
          primaryNiche: d.primaryNiche,
          secondaryNiches: d.secondaryNiches,
          city: d.city,
          country: d.country,
          languages: d.languages,
          contentFormats: d.contentFormats,
          availability: d.availability,
          pastBrands: d.pastBrands,
          rateCard: d.rateCard,
          audienceTopCountries: d.audienceTopCountries,
          audienceAgeBands: d.audienceAgeBands,
        })
        .where(eq(influencerProfiles.userId, me.id));
      // Users may only edit self-reported numbers. Verified rows are written by the sync job.
      if (profile) {
        await tx
          .update(socialAccounts)
          .set({
            followers: d.followers,
            avgViews: d.avgViews,
            engagementRate: d.engagementRate != null ? d.engagementRate.toFixed(2) : null,
          })
          .where(
            and(
              eq(socialAccounts.userId, me.id),
              eq(socialAccounts.platform, profile.platform),
              eq(socialAccounts.source, "self"),
            ),
          );
      }
    });
  } else {
    const parsed = brandSchema.safeParse({
      displayName: fd.get("displayName"),
      brandName: fd.get("brandName"),
      companyName: fd.get("companyName") ?? "",
      website: fd.get("website"),
      industry: fd.get("industry"),
      country: fd.get("country"),
      markets: list(fd, "markets"),
      description: fd.get("description") ?? "",
      logoUrl: String(fd.get("logoUrl") ?? "").trim(),
      companySize: fd.get("companySize") ?? "",
      budgetMin: optInt(fd.get("budgetMin")),
      budgetMax: optInt(fd.get("budgetMax")),
      targetAudience: fd.get("targetAudience") ?? "",
      campaignGoals: list(fd, "campaignGoals"),
      preferredNiches: fd.getAll("preferredNiches"),
      preferredPlatforms: fd.getAll("preferredPlatforms"),
      paymentTerms: fd.get("paymentTerms") ?? "",
    });
    if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: flatten(parsed.error) };
    const { displayName, ...b } = parsed.data;

    await db.transaction(async (tx) => {
      await tx.update(users).set({ displayName }).where(eq(users.id, me.id));
      await tx.update(brandProfiles).set(b).where(eq(brandProfiles.userId, me.id));
    });
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  redirect("/profile");
}
