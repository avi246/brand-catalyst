import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { brandProfiles, influencerProfiles, users } from "@/db/schema";

/** What every list needs to show about another account. */
export type Person = {
  id: string;
  role: "brand" | "influencer";
  name: string;
  subtitle: string;
  href: string;
  avatarUrl: string | null;
  isDemo: boolean;
};

/** Looks up many people in one query (no N+1 queries). */
export async function getPeople(ids: string[]): Promise<Map<string, Person>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({ user: users, creator: influencerProfiles, brand: brandProfiles })
    .from(users)
    .leftJoin(influencerProfiles, eq(influencerProfiles.userId, users.id))
    .leftJoin(brandProfiles, eq(brandProfiles.userId, users.id))
    .where(inArray(users.id, unique));

  return new Map(
    rows.map(({ user, creator, brand }) => [
      user.id,
      brand
        ? {
            id: user.id,
            role: "brand",
            name: brand.brandName,
            subtitle: `${brand.industry} · ${brand.country}`,
            href: `/brands/${brand.slug}`,
            avatarUrl: brand.logoUrl,
            isDemo: user.isDemo,
          }
        : {
            id: user.id,
            role: "influencer",
            name: user.displayName,
            subtitle: creator ? `@${creator.handle} · ${creator.primaryNiche}` : "",
            href: creator ? `/creators/${creator.handle}` : "#",
            avatarUrl: user.avatarUrl,
            isDemo: user.isDemo,
          },
    ]),
  );
}

export async function getPerson(id: string) {
  return (await getPeople([id])).get(id) ?? null;
}
