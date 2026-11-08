/**
 * Computes Gemini embeddings for every profile whose text changed (or that has none).
 * Run after seeding:  npm run db:embed
 */
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { GoogleGenAI } from "@google/genai";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { brandText, creatorText } from "../src/lib/ai/profile-text";

config({ path: ".env.local" });

const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
const db = drizzle(client, { schema, casing: "snake_case" });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const { users, influencerProfiles, brandProfiles } = schema;

const normalize = (v: number[]) => {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
};

async function embedAll(texts: string[]) {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 50) {
    const res = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: texts.slice(i, i + 50),
      config: { outputDimensionality: schema.EMBEDDING_DIMS, taskType: "RETRIEVAL_DOCUMENT" },
    });
    for (const e of res.embeddings ?? []) out.push(normalize(e.values ?? []));
  }
  return out;
}

async function main() {
  const creators = await db
    .select({ user: users, p: influencerProfiles })
    .from(influencerProfiles)
    .innerJoin(users, eq(users.id, influencerProfiles.userId));
  const brands = await db.select().from(brandProfiles);

  const todoC = creators
    .map((r) => ({ id: r.p.userId, text: creatorText(r.user.displayName, r.p), old: r.p.embeddingSource }))
    .filter((x) => x.text !== x.old);
  const todoB = brands.map((p) => ({ id: p.userId, text: brandText(p), old: p.embeddingSource })).filter((x) => x.text !== x.old);
  console.log(`Embedding ${todoC.length} creators and ${todoB.length} brands…`);

  const t0 = Date.now();
  const vc = await embedAll(todoC.map((x) => x.text));
  for (const [i, x] of todoC.entries()) {
    await db.update(influencerProfiles).set({ embedding: vc[i], embeddingSource: x.text }).where(eq(influencerProfiles.userId, x.id));
  }
  const vb = await embedAll(todoB.map((x) => x.text));
  for (const [i, x] of todoB.entries()) {
    await db.update(brandProfiles).set({ embedding: vb[i], embeddingSource: x.text }).where(eq(brandProfiles.userId, x.id));
  }
  console.log(`Done in ${Date.now() - t0}ms.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
