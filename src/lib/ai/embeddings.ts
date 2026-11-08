import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brandProfiles, influencerProfiles, users } from "@/db/schema";
import { aiConfigured, embed } from "./gemini";
import { brandText, creatorText } from "./profile-text";

/**
 * Re-embeds one user's profile if its text changed. Called after onboarding and profile edits.
 * Never throws: if Gemini is down, the profile simply keeps its old embedding (or none).
 */
export async function refreshProfileEmbedding(userId: string) {
  if (!aiConfigured()) return;
  try {
    const [row] = await db
      .select({ user: users, creator: influencerProfiles, brand: brandProfiles })
      .from(users)
      .leftJoin(influencerProfiles, eq(influencerProfiles.userId, users.id))
      .leftJoin(brandProfiles, eq(brandProfiles.userId, users.id))
      .where(eq(users.id, userId));
    if (!row) return;

    if (row.creator) {
      const text = creatorText(row.user.displayName, row.creator);
      if (text === row.creator.embeddingSource) return;
      const [v] = await embed([text]);
      await db.update(influencerProfiles).set({ embedding: v, embeddingSource: text }).where(eq(influencerProfiles.userId, userId));
    } else if (row.brand) {
      const text = brandText(row.brand);
      if (text === row.brand.embeddingSource) return;
      const [v] = await embed([text]);
      await db.update(brandProfiles).set({ embedding: v, embeddingSource: text }).where(eq(brandProfiles.userId, userId));
    }
  } catch (e) {
    console.warn("[embeddings] refresh failed", (e as Error).message);
  }
}
