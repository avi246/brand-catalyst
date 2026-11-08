import "server-only";
import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { acceptances, clauseComments, consignments, consignmentVersions, conversations, deliverables } from "@/db/schema";
import { getPeople } from "@/lib/people";
import { isUuid } from "@/lib/utils";
import type { ConsignmentContent } from "./schema";

/** A deal with everything the deal page needs, or null if `meId` isn't one of its two parties. */
export async function getDealForUser(id: string, meId: string) {
  if (!isUuid(id)) return null;
  const [deal] = await db
    .select()
    .from(consignments)
    .where(and(eq(consignments.id, id), or(eq(consignments.brandUserId, meId), eq(consignments.influencerUserId, meId))))
    .limit(1);
  if (!deal) return null;

  const [versions, accepts, items, convo] = await Promise.all([
    db
      .select()
      .from(consignmentVersions)
      .where(eq(consignmentVersions.consignmentId, id))
      .orderBy(asc(consignmentVersions.versionNo)),
    db.select().from(acceptances).where(eq(acceptances.consignmentId, id)),
    db.select().from(deliverables).where(eq(deliverables.consignmentId, id)).orderBy(asc(deliverables.dueAt)),
    db.select({ id: conversations.id }).from(conversations).where(eq(conversations.connectionId, deal.connectionId)),
  ]);

  const current = versions.find((v) => v.versionNo === deal.currentVersion) ?? versions.at(-1)!;
  // Comments from every version, so a question asked on v1 isn't lost when v2 arrives.
  const versionNoById = new Map(versions.map((v) => [v.id, v.versionNo]));
  const comments = (
    await db
      .select()
      .from(clauseComments)
      .where(inArray(clauseComments.versionId, versions.map((v) => v.id)))
      .orderBy(asc(clauseComments.createdAt))
  ).map((c) => ({ ...c, versionNo: versionNoById.get(c.versionId) ?? 0 }));

  const people = await getPeople([deal.brandUserId, deal.influencerUserId, ...comments.map((c) => c.userId)]);

  return {
    deal,
    versions: versions.map((v) => ({ ...v, content: v.content as ConsignmentContent })),
    current: { ...current, content: current.content as ConsignmentContent },
    acceptances: accepts,
    comments,
    deliverables: items,
    conversationId: convo[0]?.id ?? null,
    brand: people.get(deal.brandUserId)!,
    creator: people.get(deal.influencerUserId)!,
    people,
    role: deal.brandUserId === meId ? ("brand" as const) : ("influencer" as const),
  };
}

export type DealView = NonNullable<Awaited<ReturnType<typeof getDealForUser>>>;

/** All deals I'm part of, newest activity first, with the other party. */
export async function listMyDeals(meId: string) {
  const rows = await db
    .select()
    .from(consignments)
    .where(or(eq(consignments.brandUserId, meId), eq(consignments.influencerUserId, meId)))
    .orderBy(desc(consignments.updatedAt));
  const people = await getPeople(rows.map((r) => (r.brandUserId === meId ? r.influencerUserId : r.brandUserId)));
  return rows.flatMap((r) => {
    const other = people.get(r.brandUserId === meId ? r.influencerUserId : r.brandUserId);
    return other ? [{ ...r, other }] : [];
  });
}
