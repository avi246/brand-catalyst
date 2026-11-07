import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  brandProfiles,
  influencerProfiles,
  socialAccounts,
  type BrandProfile,
  type InfluencerProfile,
  type SocialAccount,
  type User,
} from "@/db/schema";

export type InfluencerBundle = {
  kind: "influencer";
  user: User;
  profile: InfluencerProfile;
  accounts: SocialAccount[];
};

export type BrandBundle = {
  kind: "brand";
  user: User;
  profile: BrandProfile;
};

export type ProfileBundle = InfluencerBundle | BrandBundle;

export async function getProfileBundle(user: User): Promise<ProfileBundle | null> {
  if (user.role === "influencer") {
    const [profile] = await db
      .select()
      .from(influencerProfiles)
      .where(eq(influencerProfiles.userId, user.id))
      .limit(1);
    if (!profile) return null;
    const accounts = await db
      .select()
      .from(socialAccounts)
      .where(eq(socialAccounts.userId, user.id));
    return { kind: "influencer", user, profile, accounts };
  }
  const [profile] = await db
    .select()
    .from(brandProfiles)
    .where(eq(brandProfiles.userId, user.id))
    .limit(1);
  return profile ? { kind: "brand", user, profile } : null;
}

type Check = { label: string; done: boolean };

/** Which optional fields are filled in. Drives the completeness meter and the "next steps" list. */
export function profileChecklist(bundle: ProfileBundle): Check[] {
  if (bundle.kind === "influencer") {
    const p = bundle.profile;
    return [
      { label: "Add a short bio", done: !!p.bio },
      { label: "Add a profile photo", done: !!bundle.user.avatarUrl },
      { label: "Set your rate card", done: Object.keys(p.rateCard).length > 0 },
      { label: "Add your audience's top countries", done: p.audienceTopCountries.length > 0 },
      { label: "Add audience age bands", done: p.audienceAgeBands.length > 0 },
      { label: "List content formats you make", done: p.contentFormats.length > 0 },
      { label: "Add average views per post", done: bundle.accounts.some((a) => a.avgViews != null) },
      { label: "List past brand collaborations", done: p.pastBrands.length > 0 },
    ];
  }
  const p = bundle.profile;
  return [
    { label: "Add a brand description", done: !!p.description },
    { label: "Upload your logo", done: !!p.logoUrl },
    { label: "Set a typical campaign budget", done: p.budgetMin != null || p.budgetMax != null },
    { label: "Describe your target audience", done: !!p.targetAudience },
    { label: "Pick preferred creator niches", done: p.preferredNiches.length > 0 },
    { label: "Pick preferred platforms", done: p.preferredPlatforms.length > 0 },
    { label: "Set your usual payment terms", done: !!p.paymentTerms },
  ];
}

export function completeness(checks: Check[]): number {
  // Signup fields count as the first 40%; optional fields fill the rest.
  const done = checks.filter((c) => c.done).length;
  return Math.round(40 + (60 * done) / checks.length);
}
