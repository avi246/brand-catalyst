// Real check of Discover ranking: Gemini query parsing + pgvector similarity + rules.
// node --conditions=react-server --env-file=.env.local --import tsx scripts/smoke-discover.ts
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brandProfiles, influencerProfiles, users } from "@/db/schema";
import { searchBrands, searchCreators } from "@/lib/discover";

const show = (label: string, rows: { score: number; reasons: string[]; name: string; extra: string }[]) => {
  console.log(`\n=== ${label}`);
  for (const r of rows.slice(0, 5)) console.log(`${String(r.score).padStart(3)}  ${r.name.padEnd(22)} ${r.extra}\n       ${r.reasons.join(" | ")}`);
};

async function main() {
  const [brandUser] = await db.select().from(users).where(eq(users.clerkId, "demo_brand_0")); // Lumen Skincare (demo)
  const [brand] = await db.select().from(brandProfiles).where(eq(brandProfiles.userId, brandUser.id));

  let t = Date.now();
  const forYou = await searchCreators(brandUser, {}, brand);
  show(`Brand "${brand.brandName}" with no search (${forYou.rankedBy}, ${Date.now() - t}ms, ${forYou.results.length} results)`,
    forYou.results.map((r) => ({ score: r.score, reasons: r.reasons, name: r.user.displayName, extra: `${r.profile.primaryNiche} · ${r.profile.primaryPlatform}` })));

  t = Date.now();
  const q = "creators who make clean beauty content for sensitive skin, US audience, under $500";
  const s = await searchCreators(brandUser, { q }, brand);
  console.log("\nunderstood:", s.understood.map((u) => `${u.label}=${u.value}`).join("; "), s.aiNote ?? "");
  show(`Search "${q}" (${Date.now() - t}ms, ${s.results.length} results)`,
    s.results.map((r) => ({ score: r.score, reasons: r.reasons, name: r.user.displayName, extra: `${r.profile.primaryNiche} · from $${r.fromRate}` })));

  t = Date.now();
  const again = await searchCreators(brandUser, { q }, brand);
  console.log(`\nSame search again (cached parse): ${Date.now() - t}ms, top = ${again.results[0]?.user.displayName}`);

  const [creatorUser] = await db.select().from(users).where(eq(users.clerkId, "demo_creator_0"));
  const [creator] = await db.select().from(influencerProfiles).where(eq(influencerProfiles.userId, creatorUser.id));
  t = Date.now();
  const b = await searchBrands(creatorUser, { q: "eco-friendly brands with big budgets" }, creator);
  console.log("\nunderstood:", b.understood.map((u) => `${u.label}=${u.value}`).join("; "));
  show(`Creator ${creatorUser.displayName} (${creator.primaryNiche}) searching brands (${Date.now() - t}ms)`,
    b.results.map((r) => ({ score: r.score, reasons: r.reasons, name: r.profile.brandName, extra: `${r.profile.industry} · up to $${r.profile.budgetMax}` })));
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
