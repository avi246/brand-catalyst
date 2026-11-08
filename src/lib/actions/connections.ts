"use server";

import { and, count, eq, gte, inArray, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { connections, conversations, notifications, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const MAX_INVITES_PER_DAY = 20;

const inviteSchema = z.object({
  toUserId: z.uuid(),
  note: z.string().trim().max(300, "Keep the note under 300 characters").optional(),
});

function refresh() {
  // Pages that show invitation state. revalidatePath tells Next.js to re-render them.
  for (const p of ["/discover", "/collaborations", "/dashboard", "/notifications"]) revalidatePath(p);
  revalidatePath("/creators/[handle]", "page");
  revalidatePath("/brands/[slug]", "page");
}

export async function sendInvitation(input: { toUserId: string; note?: string }): Promise<ActionResult> {
  const me = await requireUser();
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { toUserId, note } = parsed.data;

  if (toUserId === me.id) return { ok: false, error: "You can't invite yourself." };

  const [other] = await db.select().from(users).where(eq(users.id, toUserId)).limit(1);
  if (!other) return { ok: false, error: "That account no longer exists." };
  if (other.role === me.role) {
    return { ok: false, error: "Brands invite creators, and creators invite brands." };
  }

  // One open invitation or connection per pair, in either direction.
  const [existing] = await db
    .select({ id: connections.id, status: connections.status })
    .from(connections)
    .where(
      and(
        inArray(connections.status, ["pending", "accepted"]),
        or(
          and(eq(connections.fromUserId, me.id), eq(connections.toUserId, toUserId)),
          and(eq(connections.fromUserId, toUserId), eq(connections.toUserId, me.id)),
        ),
      ),
    )
    .limit(1);
  if (existing) {
    return {
      ok: false,
      error: existing.status === "accepted" ? "You're already connected." : "There's already an open invitation.",
    };
  }

  // Simple spam protection.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ n }] = await db
    .select({ n: count() })
    .from(connections)
    .where(and(eq(connections.fromUserId, me.id), gte(connections.createdAt, since)));
  if (n >= MAX_INVITES_PER_DAY) {
    return { ok: false, error: `You can send up to ${MAX_INVITES_PER_DAY} invitations a day.` };
  }

  await db.transaction(async (tx) => {
    const [c] = await tx
      .insert(connections)
      .values({ fromUserId: me.id, toUserId, note: note || null })
      .returning({ id: connections.id });
    await tx.insert(notifications).values({
      userId: toUserId,
      type: "invitation_received",
      payload: { connectionId: c.id, fromUserId: me.id, fromName: me.displayName },
    });
  });

  refresh();
  return { ok: true, message: `Invitation sent to ${other.displayName}.` };
}

/** Accept, decline (receiver) or withdraw (sender) a pending invitation. */
export async function respondToInvitation(input: {
  connectionId: string;
  action: "accept" | "decline" | "withdraw";
}): Promise<ActionResult> {
  const me = await requireUser();
  const parsed = z
    .object({ connectionId: z.uuid(), action: z.enum(["accept", "decline", "withdraw"]) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { connectionId, action } = parsed.data;

  const [c] = await db.select().from(connections).where(eq(connections.id, connectionId)).limit(1);
  if (!c || c.status !== "pending") return { ok: false, error: "This invitation is no longer open." };

  // Only the receiver may accept or decline; only the sender may withdraw.
  const allowed = action === "withdraw" ? c.fromUserId === me.id : c.toUserId === me.id;
  if (!allowed) return { ok: false, error: "You can't do that with this invitation." };

  const status = action === "accept" ? "accepted" : action === "decline" ? "declined" : "withdrawn";

  await db.transaction(async (tx) => {
    await tx
      .update(connections)
      .set({ status, respondedAt: new Date() })
      .where(and(eq(connections.id, c.id), eq(connections.status, "pending")));

    if (action === "accept") {
      // Messaging opens only now.
      await tx.insert(conversations).values({ connectionId: c.id }).onConflictDoNothing();
      await tx.insert(notifications).values({
        userId: c.fromUserId,
        type: "invitation_accepted",
        payload: { connectionId: c.id, byUserId: me.id, byName: me.displayName },
      });
    }
  });

  refresh();
  return {
    ok: true,
    message:
      action === "accept"
        ? "Connected. You can now message each other."
        : action === "decline"
          ? "Invitation declined."
          : "Invitation withdrawn.",
  };
}
