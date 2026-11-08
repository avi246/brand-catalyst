/**
 * Seeds fictional demo creators and brands, all tagged is_demo = true and shown with a
 * "Demo data" badge. Safe to re-run: it deletes previous demo rows first.
 *
 *   npx tsx scripts/seed.ts
 *
 * Numbers are generated, self-reported style data. Nothing here is presented as verified.
 */
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";

config({ path: ".env.local" });

const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
const db = drizzle(client, { schema, casing: "snake_case" });
const { users, influencerProfiles, brandProfiles, socialAccounts } = schema;

// Deterministic random numbers, so every teammate gets the same demo data.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(2026);
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
const roundTo = (n: number, step: number) => Math.round(n / step) * step;

const FIRST = [
  "Maya", "Jordan", "Priya", "Leo", "Sofia", "Ethan", "Aisha", "Noah", "Chloe", "Diego",
  "Hana", "Marcus", "Zoe", "Arjun", "Lena", "Kai", "Nia", "Owen", "Ivy", "Mateo",
  "Ruby", "Sam", "Tara", "Felix", "Amara", "Jae", "Elena", "Theo", "Leila", "Ravi",
];
const LAST = [
  "Patel", "Kim", "Nguyen", "Garcia", "Okafor", "Rossi", "Chen", "Haddad", "Silva", "Brooks",
  "Shah", "Lopez", "Novak", "Ali", "Park", "Mensah", "Costa", "Reyes", "Singh", "Wright",
];

const LOCATIONS = [
  { city: "New York", country: "United States", audience: "US", weight: 4 },
  { city: "Los Angeles", country: "United States", audience: "US", weight: 4 },
  { city: "Buffalo", country: "United States", audience: "US", weight: 2 },
  { city: "Austin", country: "United States", audience: "US", weight: 2 },
  { city: "Chicago", country: "United States", audience: "US", weight: 2 },
  { city: "Toronto", country: "Canada", audience: "CA", weight: 2 },
  { city: "London", country: "United Kingdom", audience: "GB", weight: 2 },
  { city: "Mumbai", country: "India", audience: "IN", weight: 2 },
  { city: "Sydney", country: "Australia", audience: "AU", weight: 1 },
];
const weightedLocation = () => {
  const total = LOCATIONS.reduce((s, l) => s + l.weight, 0);
  let r = rand() * total;
  for (const l of LOCATIONS) if ((r -= l.weight) < 0) return l;
  return LOCATIONS[0];
};

// Niche -> believable bio lines, content formats and related secondary niches.
const NICHE_DETAILS: Record<string, { bios: string[]; related: string[] }> = {
  "Beauty & Skincare": {
    bios: [
      "Honest skincare reviews for sensitive skin. Ingredient-first, no hype.",
      "Clean beauty routines that take under five minutes.",
      "Dermatologist-approved routines explained in plain English.",
    ],
    related: ["Sustainability", "Lifestyle", "Health & Wellness"],
  },
  Fashion: {
    bios: [
      "Thrifted and sustainable outfits on a student budget.",
      "Minimal capsule wardrobes and styling tips for real bodies.",
      "Streetwear drops, fits and how to style them.",
    ],
    related: ["Lifestyle", "Sustainability", "Beauty & Skincare"],
  },
  Fitness: {
    bios: [
      "Home workouts with zero equipment. Consistency over intensity.",
      "Strength training for beginners, form first.",
      "Marathon training diaries and recovery tips.",
    ],
    related: ["Health & Wellness", "Food & Cooking", "Lifestyle"],
  },
  "Food & Cooking": {
    bios: [
      "15-minute vegetarian dinners for busy weeknights.",
      "Budget meal prep: feed yourself well for $40 a week.",
      "Street food tours and recreating them at home.",
    ],
    related: ["Travel", "Health & Wellness", "Lifestyle"],
  },
  Travel: {
    bios: [
      "Weekend trips on a budget, mostly by train.",
      "Slow travel and remote work from small towns.",
      "Hidden food spots and day trips around North America.",
    ],
    related: ["Food & Cooking", "Lifestyle", "Entertainment"],
  },
  Technology: {
    bios: [
      "Gadget reviews that tell you what not to buy.",
      "Productivity setups, apps and desk tours.",
      "Explaining AI tools for people who are not engineers.",
    ],
    related: ["Gaming", "Education", "Finance"],
  },
  Gaming: {
    bios: [
      "Indie game discoveries and cozy game reviews.",
      "Competitive FPS tips and weekly streams.",
      "Retro consoles, restorations and collector finds.",
    ],
    related: ["Technology", "Entertainment"],
  },
  Lifestyle: {
    bios: [
      "Day-in-the-life vlogs from a grad student in the city.",
      "Small habits, slow mornings and apartment living.",
      "Weekly resets, organization and routines.",
    ],
    related: ["Home & Decor", "Fashion", "Health & Wellness"],
  },
  Education: {
    bios: [
      "Study techniques that got me through engineering school.",
      "Explaining science in 60 seconds.",
      "Language learning tips and daily practice.",
    ],
    related: ["Technology", "Finance"],
  },
  Finance: {
    bios: [
      "Personal finance for your twenties: budgets, credit and first investments.",
      "Side hustles tested honestly, with real numbers.",
    ],
    related: ["Education", "Technology", "Lifestyle"],
  },
  "Health & Wellness": {
    bios: [
      "Mental health, sleep and gentle movement.",
      "Nutrition myths debunked by a registered dietitian.",
    ],
    related: ["Fitness", "Food & Cooking", "Beauty & Skincare"],
  },
  "Home & Decor": {
    bios: [
      "Renter-friendly apartment makeovers under $200.",
      "Plants, shelves and small-space design ideas.",
    ],
    related: ["Lifestyle", "Sustainability"],
  },
  Sustainability: {
    bios: [
      "Low-waste swaps that actually save money.",
      "Sustainable brands, tested and reviewed honestly.",
    ],
    related: ["Fashion", "Beauty & Skincare", "Home & Decor"],
  },
  Parenting: {
    bios: ["Real parenting with two toddlers and a small apartment."],
    related: ["Lifestyle", "Home & Decor", "Food & Cooking"],
  },
  Entertainment: {
    bios: ["Movie breakdowns and weekly pop culture takes.", "Comedy sketches about college life."],
    related: ["Gaming", "Lifestyle"],
  },
};

// Weighting toward niches small brands hire most.
const NICHE_POOL = [
  ...Array(6).fill("Beauty & Skincare"),
  ...Array(5).fill("Fashion"),
  ...Array(5).fill("Fitness"),
  ...Array(4).fill("Food & Cooking"),
  ...Array(3).fill("Travel"),
  ...Array(4).fill("Technology"),
  ...Array(3).fill("Gaming"),
  ...Array(4).fill("Lifestyle"),
  ...Array(2).fill("Education"),
  ...Array(2).fill("Finance"),
  ...Array(2).fill("Health & Wellness"),
  ...Array(2).fill("Home & Decor"),
  ...Array(2).fill("Sustainability"),
  "Parenting",
  "Entertainment",
] as string[];

const FORMATS_BY_PLATFORM = {
  instagram: ["reel", "story", "post", "carousel"],
  youtube: ["integration", "dedicated video", "short"],
  tiktok: ["video", "live"],
} as const;

// Fictional brand names only: demo profiles must not claim deals with real companies.
const PAST_BRANDS = [
  "Aurora Teas", "Fernwood Goods", "Peakline", "Saltwater Studio", "Nimbus Notes",
  "Orchard & Oak", "Brightpath", "Cobalt Cycles", "Velvet Vine", "Quarry Supply",
  "Little Lark", "Summit Snacks", "Harbor Lane", "Driftwood Labs",
];

function creatorRow(i: number) {
  const first = FIRST[i % FIRST.length];
  const last = LAST[(i * 7) % LAST.length];
  const name = `${first} ${last}`;
  const niche = NICHE_POOL[Math.floor(rand() * NICHE_POOL.length)];
  const details = NICHE_DETAILS[niche];
  const loc = weightedLocation();
  const platform: "instagram" | "youtube" | "tiktok" =
    rand() < 0.6 ? "instagram" : rand() < 0.75 ? "youtube" : "tiktok";

  // Log-uniform follower counts from 3k (nano) to 900k (macro).
  const followers = roundTo(Math.exp(between(Math.log(3_000), Math.log(900_000))), 100);
  // Smaller accounts tend to have higher engagement.
  const engagement = Math.max(0.8, Math.min(9.5, 7.5 - Math.log10(followers) + between(-0.8, 1.2)));
  const avgViews = roundTo(followers * between(0.08, platform === "youtube" ? 0.6 : 0.35), 10);

  const formats = [...FORMATS_BY_PLATFORM[platform]];
  // Rough market rate: about $10 per 1k followers for a main deliverable, with variation.
  const base = Math.max(50, roundTo((followers / 1000) * between(6, 14), 25));
  const rateCard: Record<string, number> = {};
  if (platform === "instagram") {
    rateCard.reel = base;
    rateCard.story = roundTo(base * 0.35, 25) || 25;
    rateCard.post = roundTo(base * 0.7, 25);
  } else if (platform === "youtube") {
    rateCard.integration = roundTo(base * 1.4, 25);
    rateCard["dedicated video"] = roundTo(base * 3, 50);
    rateCard.short = roundTo(base * 0.5, 25);
  } else {
    rateCard.video = base;
  }

  const homeShare = Math.round(between(45, 75));
  const others = ["US", "CA", "GB", "IN", "AU", "DE", "BR"].filter((c) => c !== loc.audience);
  const second = pick(others);
  const third = pick(others.filter((c) => c !== second));
  const secondShare = Math.round(between(8, (100 - homeShare) * 0.6));
  const thirdShare = Math.round(between(3, Math.max(4, (100 - homeShare - secondShare) * 0.6)));

  const young = niche === "Gaming" || niche === "Fashion" || niche === "Education";
  const a1824 = Math.round(young ? between(38, 55) : between(22, 40));
  const a2534 = Math.round(between(25, 40));
  const a1317 = Math.round(young ? between(5, 15) : between(1, 6));
  const a35 = Math.max(0, 100 - a1824 - a2534 - a1317);

  const handleBase = `${first}${pick(["", ".", "_"])}${pick([last, niche.split(/[ &]/)[0], "creates", "daily"])}`
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "");
  const handle = `${handleBase}${i % 3 === 0 ? "" : Math.floor(rand() * 90 + 10)}`;

  const secondary = details.related.filter(() => rand() < 0.5).slice(0, 2);
  const url =
    platform === "instagram"
      ? `https://instagram.com/${handle}`
      : platform === "youtube"
        ? `https://youtube.com/@${handle}`
        : `https://tiktok.com/@${handle}`;

  return {
    user: { name, platform },
    profile: {
      handle,
      bio: pick(details.bios),
      primaryNiche: niche,
      secondaryNiches: secondary,
      city: loc.city,
      country: loc.country,
      languages: loc.audience === "IN" ? ["English", "Hindi"] : ["English"],
      primaryPlatform: platform,
      contentFormats: formats,
      rateCard,
      currency: "USD",
      audienceTopCountries: [
        { country: loc.audience, pct: homeShare },
        { country: second, pct: secondShare },
        { country: third, pct: thirdShare },
      ],
      audienceAgeBands: [
        { band: "13-17", pct: a1317 },
        { band: "18-24", pct: a1824 },
        { band: "25-34", pct: a2534 },
        { band: "35+", pct: a35 },
      ],
      pastBrands: PAST_BRANDS.filter(() => rand() < 0.15).slice(0, 3),
      availability: pick(["Booking 2 weeks out", "Open for collaborations", "Limited slots this month"]),
    },
    account: {
      platform,
      handle,
      url,
      followers,
      avgViews,
      engagementRate: engagement.toFixed(2),
    },
  };
}

const BRANDS = [
  {
    brandName: "Lumen Skincare", industry: "Beauty & Personal Care", country: "United States",
    website: "https://lumenskin.example", description: "Vegan SPF and barrier-repair skincare for sensitive, acne-prone skin. Dermatologist tested, reef safe.",
    budget: [500, 2500], niches: ["Beauty & Skincare", "Sustainability", "Health & Wellness"], platforms: ["instagram", "tiktok"],
    audience: "Gen Z and millennials in the US, 18-30, into simple skincare.", goals: ["Product launch", "Awareness"], size: "11-50",
  },
  {
    brandName: "Northbound Outfitters", industry: "Apparel & Accessories", country: "Canada",
    website: "https://northbound.example", description: "Recycled-fabric outerwear and everyday layers built for cold cities.",
    budget: [1000, 6000], niches: ["Fashion", "Travel", "Sustainability"], platforms: ["instagram", "youtube"],
    audience: "Urban adults 22-40 in Canada and the northern US.", goals: ["Seasonal campaign", "Sales"], size: "51-200",
  },
  {
    brandName: "Fuel Kitchen", industry: "Food & Beverage", country: "United States",
    website: "https://fuelkitchen.example", description: "High-protein frozen meals for people who train hard and cook rarely.",
    budget: [800, 4000], niches: ["Fitness", "Food & Cooking", "Health & Wellness"], platforms: ["instagram", "youtube", "tiktok"],
    audience: "Gym-goers 20-35, mostly US.", goals: ["Sales", "Discount code"], size: "11-50",
  },
  {
    brandName: "Pixel Forge Games", industry: "Gaming", country: "United States",
    website: "https://pixelforge.example", description: "Indie studio making cozy co-op games. Next release: Lanternfall.",
    budget: [500, 3000], niches: ["Gaming", "Entertainment"], platforms: ["youtube", "tiktok"],
    audience: "Players 16-30 who love cozy and indie games.", goals: ["Game launch", "Wishlists"], size: "1-10",
  },
  {
    brandName: "Studybuddy AI", industry: "Software & Apps", country: "United States",
    website: "https://studybuddy.example", description: "AI flashcards and spaced repetition for college students.",
    budget: [300, 2000], niches: ["Education", "Technology"], platforms: ["tiktok", "instagram", "youtube"],
    audience: "College students in the US and Canada.", goals: ["App installs"], size: "1-10",
  },
  {
    brandName: "Wander Rail", industry: "Travel & Hospitality", country: "United Kingdom",
    website: "https://wanderrail.example", description: "Rail passes and planned train itineraries across Europe.",
    budget: [1500, 8000], niches: ["Travel", "Lifestyle", "Food & Cooking"], platforms: ["youtube", "instagram"],
    audience: "Travelers 25-45 from the US, UK and Canada.", goals: ["Bookings", "Awareness"], size: "51-200",
  },
  {
    brandName: "Copper & Clay", industry: "Home & Living", country: "United States",
    website: "https://copperclay.example", description: "Handmade ceramics and small-space home goods.",
    budget: [300, 1500], niches: ["Home & Decor", "Lifestyle", "Sustainability"], platforms: ["instagram"],
    audience: "Renters 24-38 decorating small apartments.", goals: ["Sales"], size: "1-10",
  },
  {
    brandName: "Ledger Lane", industry: "Financial Services", country: "United States",
    website: "https://ledgerlane.example", description: "A budgeting app that rounds up purchases into savings goals.",
    budget: [1000, 5000], niches: ["Finance", "Education", "Lifestyle"], platforms: ["youtube", "tiktok"],
    audience: "Young professionals 21-32.", goals: ["App installs", "Sign-ups"], size: "11-50",
  },
  {
    brandName: "Stride Labs", industry: "Health & Fitness", country: "United States",
    website: "https://stridelabs.example", description: "Running shoes with recycled foam, designed for beginners.",
    budget: [1500, 7000], niches: ["Fitness", "Health & Wellness", "Sustainability"], platforms: ["instagram", "youtube"],
    audience: "New runners 20-40.", goals: ["Product launch", "Sales"], size: "51-200",
  },
  {
    brandName: "Halo Audio", industry: "Consumer Electronics", country: "United States",
    website: "https://haloaudio.example", description: "Noise-cancelling earbuds under $100.",
    budget: [2000, 10000], niches: ["Technology", "Gaming", "Fitness"], platforms: ["youtube", "tiktok", "instagram"],
    audience: "Students and commuters 16-30.", goals: ["Sales", "Reviews"], size: "51-200",
  },
  {
    brandName: "Masala Mornings", industry: "Food & Beverage", country: "India",
    website: "https://masalamornings.example", description: "Ready-to-cook Indian breakfast mixes, no preservatives.",
    budget: [200, 1200], niches: ["Food & Cooking", "Health & Wellness"], platforms: ["instagram", "youtube"],
    audience: "Home cooks 22-45 in India and the Indian diaspora.", goals: ["Sales", "Awareness"], size: "11-50",
  },
  {
    brandName: "Bloom Botanics", industry: "Beauty & Personal Care", country: "United Kingdom",
    website: "https://bloombotanics.example", description: "Plant-based hair care in refillable aluminium bottles.",
    budget: [600, 3000], niches: ["Beauty & Skincare", "Sustainability"], platforms: ["instagram", "tiktok"],
    audience: "Women 20-35 in the UK and US.", goals: ["Product launch"], size: "11-50",
  },
  {
    brandName: "Buffalo Brew Co.", industry: "Food & Beverage", country: "United States",
    website: "https://buffalobrew.example", description: "Local cold brew roasted in Buffalo, NY.",
    budget: [150, 800], niches: ["Food & Cooking", "Lifestyle"], platforms: ["instagram", "tiktok"],
    audience: "Coffee drinkers 21-35 in Western New York.", goals: ["Local awareness", "Store visits"], size: "1-10",
  },
  {
    brandName: "Kinetic Desk", industry: "Home & Living", country: "Canada",
    website: "https://kineticdesk.example", description: "Standing desks and ergonomic setups for home offices.",
    budget: [1000, 5000], niches: ["Technology", "Lifestyle", "Home & Decor"], platforms: ["youtube", "instagram"],
    audience: "Remote workers and students 22-40.", goals: ["Sales", "Reviews"], size: "11-50",
  },
  {
    brandName: "Tidewater Swim", industry: "Apparel & Accessories", country: "Australia",
    website: "https://tidewater.example", description: "Swimwear made from recycled fishing nets.",
    budget: [800, 4000], niches: ["Fashion", "Travel", "Sustainability"], platforms: ["instagram", "tiktok"],
    audience: "Women 18-34 in Australia, the US and the UK.", goals: ["Seasonal campaign"], size: "11-50",
  },
] as const;

const CREATOR_COUNT = 60;

async function main() {
  console.log("Removing previous demo rows…");
  await db.delete(users).where(eq(users.isDemo, true)); // cascades to profiles and accounts

  console.log(`Inserting ${CREATOR_COUNT} demo creators…`);
  const usedHandles = new Set<string>();
  for (let i = 0; i < CREATOR_COUNT; i++) {
    const row = creatorRow(i);
    let handle = row.profile.handle;
    while (usedHandles.has(handle)) handle = `${handle}${Math.floor(rand() * 9)}`;
    usedHandles.add(handle);

    const [u] = await db
      .insert(users)
      .values({
        clerkId: `demo_creator_${i}`,
        role: "influencer",
        displayName: row.user.name,
        isDemo: true,
      })
      .returning({ id: users.id });
    await db.insert(influencerProfiles).values({ ...row.profile, handle, userId: u.id });
    await db.insert(socialAccounts).values({ ...row.account, handle, userId: u.id, source: "self" });
  }

  console.log(`Inserting ${BRANDS.length} demo brands…`);
  for (const [i, b] of BRANDS.entries()) {
    const [u] = await db
      .insert(users)
      .values({
        clerkId: `demo_brand_${i}`,
        role: "brand",
        displayName: `${b.brandName} team`,
        isDemo: true,
      })
      .returning({ id: users.id });
    const baseSlug = b.brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const [taken] = await db
      .select({ slug: brandProfiles.slug })
      .from(brandProfiles)
      .where(eq(brandProfiles.slug, baseSlug))
      .limit(1);
    await db.insert(brandProfiles).values({
      userId: u.id,
      slug: taken ? `${baseSlug}-demo` : baseSlug,
      brandName: b.brandName,
      website: b.website,
      industry: b.industry,
      country: b.country,
      description: b.description,
      companySize: b.size,
      budgetMin: b.budget[0],
      budgetMax: b.budget[1],
      targetAudience: b.audience,
      campaignGoals: [...b.goals],
      preferredNiches: [...b.niches],
      preferredPlatforms: [...b.platforms],
      paymentTerms: pick(["50% upfront, 50% on publish", "Net 15 after publish", "100% on publish"]),
    });
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
