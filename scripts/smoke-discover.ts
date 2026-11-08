// Quick check of Discover queries outside the browser.
// node --conditions=react-server --env-file=.env.local --import tsx scripts/smoke-discover.ts
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { searchBrands, searchCreators } from "@/lib/discover";

async function main() {
  const [brand] = await db.select().from(users).where(eq(users.clerkId, "demo_brand_0"));
  const all = await searchCreators(brand.id, {}, ["Beauty & Skincare", "Sustainability"]);
  console.log("creators (no filters):", all.length);
  console.log("top 3:", all.slice(0, 3).map((r) => `${r.user.displayName} | ${r.profile.primaryNiche} | ${r.account?.followers} | fits=${r.fitsPreferred}`));
  const beautyIg = await searchCreators(brand.id, { niche: "Beauty & Skincare", platform: "instagram", maxRate: 1000 });
  console.log("beauty + instagram + from <= $1000:", beautyIg.length);
  const q = await searchCreators(brand.id, { q: "vegan" });
  console.log('search "vegan":', q.map((r) => r.profile.handle));

  const [creator] = await db.select().from(users).where(eq(users.clerkId, "demo_creator_0"));
  const brands = await searchBrands(creator.id, { industry: "Food & Beverage" }, ["Food & Cooking"]);
  console.log("food brands:", brands.map((b) => `${b.profile.brandName} fits=${b.fitsMyNiche}`));
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
