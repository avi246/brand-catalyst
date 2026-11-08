"use server";

import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  acceptances,
  clauseComments,
  connections,
  consignments,
  consignmentVersions,
  conversations,
  deliverables,
  messages,
  notifications,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { hashContent } from "@/lib/consignments/hash";
import { consignmentContentSchema, type ConsignmentContent } from "@/lib/consignments/schema";

type Result<T = object> = ({ ok: true; message?: string } & T) | { ok: false; error: string };

/** Statuses in which terms can still change. */
const OPEN_STATUSES = ["sent", "negotiating"] as const;

function firstIssue(e: z.ZodError) {
  const i = e.issues[0];
  return i ? `${i.path.join(" › ") || "Form"}: ${i.message}` : "Invalid input";
}

function refreshDeal(id?: string) {
  revalidatePath("/collaborations");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  revalidatePath("/messages", "layout");
  if (id) revalidatePath(`/deals/${id}`);
}

/** Posts a short system line in the pair's chat so the deal shows up in the conversation. */
async function postToChat(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  connectionId: string,
  senderId: string,
  body: string,
) {
  const [c] = await tx.select({ id: conversations.id }).from(conversations).where(eq(conversations.connectionId, connectionId));
  if (c) await tx.insert(messages).values({ conversationId: c.id, senderId, body });
}

/* ------------------------------------------------------------------------------------------
 * Create (brand only): version 1, which the brand automatically accepts by sending it.
 * ---------------------------------------------------------------------------------------- */

export async function createConsignment(input: {
  connectionId: string;
  content: ConsignmentContent;
}): Promise<Result<{ id: string }>> {
  const me = await requireUser("brand");
  const parsed = z.object({ connectionId: z.uuid(), content: consignmentContentSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { connectionId, content } = parsed.data;

  const [conn] = await db
    .select()
    .from(connections)
    .where(
      and(
        eq(connections.id, connectionId),
        eq(connections.status, "accepted"),
        or(eq(connections.fromUserId, me.id), eq(connections.toUserId, me.id)),
      ),
    );
  if (!conn) return { ok: false, error: "You can only send a consignment to someone you're connected with." };
  const creatorId = conn.fromUserId === me.id ? conn.toUserId : conn.fromUserId;
  const hash = hashContent(content);

  const id = await db.transaction(async (tx) => {
    const [deal] = await tx
      .insert(consignments)
      .values({
        brandUserId: me.id,
        influencerUserId: creatorId,
        connectionId,
        title: content.overview.title,
        status: "sent",
        currentVersion: 1,
      })
      .returning({ id: consignments.id });
    await tx.insert(consignmentVersions).values({
      consignmentId: deal.id,
      versionNo: 1,
      content,
      contentHash: hash,
      createdBy: me.id,
      changeNote: "First proposal",
    });
    await tx.insert(acceptances).values({ consignmentId: deal.id, versionNo: 1, userId: me.id, contentHash: hash });
    await tx.insert(notifications).values({
      userId: creatorId,
      type: "consignment_received",
      payload: { consignmentId: deal.id, title: content.overview.title, fromName: me.displayName },
    });
    await postToChat(tx, connectionId, me.id, `📄 Sent a consignment: "${content.overview.title}" (v1). Review it in Collaborations.`);
    return deal.id;
  });

  refreshDeal(id);
  return { ok: true, id, message: "Consignment sent." };
}

/* ------------------------------------------------------------------------------------------
 * Propose changes (either party): a new immutable version. Old versions are never edited.
 * ---------------------------------------------------------------------------------------- */

export async function proposeVersion(input: {
  consignmentId: string;
  baseVersion: number;
  content: ConsignmentContent;
  changeNote?: string;
}): Promise<Result<{ versionNo: number }>> {
  const me = await requireUser();
  const parsed = z
    .object({
      consignmentId: z.uuid(),
      baseVersion: z.number().int().min(1),
      content: consignmentContentSchema,
      changeNote: z.string().trim().max(300).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { consignmentId, baseVersion, content, changeNote } = parsed.data;

  const [deal] = await db
    .select()
    .from(consignments)
    .where(
      and(
        eq(consignments.id, consignmentId),
        or(eq(consignments.brandUserId, me.id), eq(consignments.influencerUserId, me.id)),
      ),
    );
  if (!deal) return { ok: false, error: "Deal not found." };
  if (!OPEN_STATUSES.includes(deal.status as (typeof OPEN_STATUSES)[number])) {
    return { ok: false, error: "This deal is locked. Terms can't change any more." };
  }
  // Someone else changed it while you were editing: don't silently overwrite their version.
  if (deal.currentVersion !== baseVersion) {
    return { ok: false, error: `A newer version (v${deal.currentVersion}) exists. Reload and edit that one.` };
  }

  const hash = hashContent(content);
  const [prev] = await db
    .select({ hash: consignmentVersions.contentHash })
    .from(consignmentVersions)
    .where(and(eq(consignmentVersions.consignmentId, deal.id), eq(consignmentVersions.versionNo, deal.currentVersion)));
  if (prev?.hash === hash) return { ok: false, error: "Nothing changed. Edit at least one term before proposing." };

  const versionNo = deal.currentVersion + 1;
  const otherId = deal.brandUserId === me.id ? deal.influencerUserId : deal.brandUserId;

  await db.transaction(async (tx) => {
    await tx.insert(consignmentVersions).values({
      consignmentId: deal.id,
      versionNo,
      content,
      contentHash: hash,
      createdBy: me.id,
      changeNote: changeNote || null,
    });
    await tx.insert(acceptances).values({ consignmentId: deal.id, versionNo, userId: me.id, contentHash: hash });
    await tx
      .update(consignments)
      .set({ currentVersion: versionNo, status: "negotiating", title: content.overview.title })
      .where(eq(consignments.id, deal.id));
    await tx.insert(notifications).values({
      userId: otherId,
      type: "consignment_revised",
      payload: { consignmentId: deal.id, title: content.overview.title, versionNo, byName: me.displayName },
    });
    await postToChat(tx, deal.connectionId, me.id, `✏️ Proposed changes: v${versionNo} of "${content.overview.title}".`);
  });

  refreshDeal(deal.id);
  return { ok: true, versionNo, message: `Sent v${versionNo}.` };
}

/* ------------------------------------------------------------------------------------------
 * Accept: binds to the exact version + hash. Final when both parties accepted the same hash.
 * ---------------------------------------------------------------------------------------- */

export async function acceptVersion(input: { consignmentId: string; versionNo: number }): Promise<Result> {
  const me = await requireUser();
  const parsed = z.object({ consignmentId: z.uuid(), versionNo: z.number().int().min(1) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const [deal] = await db
    .select()
    .from(consignments)
    .where(
      and(
        eq(consignments.id, parsed.data.consignmentId),
        or(eq(consignments.brandUserId, me.id), eq(consignments.influencerUserId, me.id)),
      ),
    );
  if (!deal) return { ok: false, error: "Deal not found." };
  if (!OPEN_STATUSES.includes(deal.status as (typeof OPEN_STATUSES)[number])) {
    return { ok: false, error: "This deal is already locked." };
  }
  if (deal.currentVersion !== parsed.data.versionNo) {
    return { ok: false, error: `You're looking at an old version. The latest is v${deal.currentVersion}.` };
  }

  const [version] = await db
    .select()
    .from(consignmentVersions)
    .where(and(eq(consignmentVersions.consignmentId, deal.id), eq(consignmentVersions.versionNo, deal.currentVersion)));
  const otherId = deal.brandUserId === me.id ? deal.influencerUserId : deal.brandUserId;

  let finalized = false;
  await db.transaction(async (tx) => {
    await tx
      .insert(acceptances)
      .values({ consignmentId: deal.id, versionNo: version.versionNo, userId: me.id, contentHash: version.contentHash })
      .onConflictDoNothing();

    const accepted = await tx
      .select({ userId: acceptances.userId, hash: acceptances.contentHash })
      .from(acceptances)
      .where(and(eq(acceptances.consignmentId, deal.id), eq(acceptances.versionNo, version.versionNo)));
    const both =
      accepted.some((a) => a.userId === deal.brandUserId && a.hash === version.contentHash) &&
      accepted.some((a) => a.userId === deal.influencerUserId && a.hash === version.contentHash);
    if (!both) return;

    finalized = true;
    await tx.update(consignments).set({ status: "final", finalizedAt: new Date() }).where(eq(consignments.id, deal.id));

    // Turn the agreed deliverables into a tracker the creator works through.
    const content = version.content as ConsignmentContent;
    if (content.deliverables.length) {
      await tx.insert(deliverables).values(
        content.deliverables.map((d) => ({
          consignmentId: deal.id,
          clauseKey: d.key,
          title: `${d.quantity} × ${d.format} on ${d.platform}`,
          dueAt: d.publishBy ? new Date(`${d.publishBy}T23:59:00`) : null,
        })),
      );
    }
    for (const userId of [deal.brandUserId, deal.influencerUserId]) {
      await tx.insert(notifications).values({
        userId,
        type: "consignment_final",
        payload: { consignmentId: deal.id, title: deal.title, versionNo: version.versionNo },
      });
    }
    await postToChat(tx, deal.connectionId, me.id, `🔒 Both sides accepted v${version.versionNo}. "${deal.title}" is final.`);
  });

  if (!finalized) {
    await db.insert(notifications).values({
      userId: otherId,
      type: "consignment_accepted_one_side",
      payload: { consignmentId: deal.id, title: deal.title, versionNo: version.versionNo, byName: me.displayName },
    });
  }

  refreshDeal(deal.id);
  return { ok: true, message: finalized ? "Both sides accepted. The deal is locked." : "Accepted. Waiting for the other side." };
}

/* ------------------------------------------------------------------------------------------
 * Comments and questions on a single term of the current version.
 * ---------------------------------------------------------------------------------------- */

export async function addClauseComment(input: {
  consignmentId: string;
  clauseKey: string;
  kind: "comment" | "question";
  body: string;
}): Promise<Result> {
  const me = await requireUser();
  const parsed = z
    .object({
      consignmentId: z.uuid(),
      clauseKey: z.string().min(1).max(40),
      kind: z.enum(["comment", "question"]),
      body: z.string().trim().min(1, "Write something").max(1000),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const [deal] = await db
    .select()
    .from(consignments)
    .where(
      and(
        eq(consignments.id, parsed.data.consignmentId),
        or(eq(consignments.brandUserId, me.id), eq(consignments.influencerUserId, me.id)),
      ),
    );
  if (!deal) return { ok: false, error: "Deal not found." };
  if (!OPEN_STATUSES.includes(deal.status as (typeof OPEN_STATUSES)[number])) {
    return { ok: false, error: "This deal is locked." };
  }

  const [version] = await db
    .select({ id: consignmentVersions.id })
    .from(consignmentVersions)
    .where(and(eq(consignmentVersions.consignmentId, deal.id), eq(consignmentVersions.versionNo, deal.currentVersion)));

  await db.insert(clauseComments).values({
    versionId: version.id,
    clauseKey: parsed.data.clauseKey,
    userId: me.id,
    kind: parsed.data.kind,
    body: parsed.data.body,
  });
  await db.insert(notifications).values({
    userId: deal.brandUserId === me.id ? deal.influencerUserId : deal.brandUserId,
    type: "consignment_comment",
    payload: { consignmentId: deal.id, title: deal.title, byName: me.displayName, kind: parsed.data.kind },
  });

  refreshDeal(deal.id);
  return { ok: true, message: parsed.data.kind === "question" ? "Question sent." : "Comment added." };
}

/* ------------------------------------------------------------------------------------------
 * Cancel (brand) or decline (creator) before the deal is final.
 * ---------------------------------------------------------------------------------------- */

export async function cancelConsignment(input: { consignmentId: string }): Promise<Result> {
  const me = await requireUser();
  const id = z.uuid().safeParse(input.consignmentId);
  if (!id.success) return { ok: false, error: "Invalid request." };

  const [deal] = await db
    .select()
    .from(consignments)
    .where(and(eq(consignments.id, id.data), or(eq(consignments.brandUserId, me.id), eq(consignments.influencerUserId, me.id))));
  if (!deal) return { ok: false, error: "Deal not found." };
  if (!OPEN_STATUSES.includes(deal.status as (typeof OPEN_STATUSES)[number])) {
    return { ok: false, error: "A final deal can't be cancelled here." };
  }

  const verb = me.role === "brand" ? "cancelled" : "declined";
  await db.transaction(async (tx) => {
    await tx.update(consignments).set({ status: "cancelled" }).where(eq(consignments.id, deal.id));
    await tx.insert(notifications).values({
      userId: deal.brandUserId === me.id ? deal.influencerUserId : deal.brandUserId,
      type: "consignment_cancelled",
      payload: { consignmentId: deal.id, title: deal.title, byName: me.displayName, verb },
    });
    await postToChat(tx, deal.connectionId, me.id, `✖️ ${verb[0].toUpperCase()}${verb.slice(1)} "${deal.title}".`);
  });

  refreshDeal(deal.id);
  return { ok: true, message: `Deal ${verb}.` };
}
