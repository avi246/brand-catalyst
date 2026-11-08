import "server-only";
import { and, asc, desc, eq, gt, inArray, isNull, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { connections, conversations, messages } from "@/db/schema";
import { getPeople, type Person } from "@/lib/people";
import { isUuid } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string; // ISO string so it can travel to the browser as JSON
  readAt: string | null;
};

const toChat = (m: typeof messages.$inferSelect): ChatMessage => ({
  id: m.id,
  senderId: m.senderId,
  body: m.body,
  createdAt: m.createdAt.toISOString(),
  readAt: m.readAt?.toISOString() ?? null,
});

/**
 * Returns the conversation only if `meId` is one of its two parties and the connection
 * is still accepted. Every chat read and write goes through this check.
 */
export async function getConversationForUser(conversationId: string, meId: string) {
  if (!isUuid(conversationId)) return null;
  const [row] = await db
    .select({ conversation: conversations, connection: connections })
    .from(conversations)
    .innerJoin(connections, eq(connections.id, conversations.connectionId))
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(connections.status, "accepted"),
        or(eq(connections.fromUserId, meId), eq(connections.toUserId, meId)),
      ),
    )
    .limit(1);
  if (!row) return null;
  const otherId = row.connection.fromUserId === meId ? row.connection.toUserId : row.connection.fromUserId;
  return { ...row, otherId };
}

export async function getMessages(conversationId: string, after?: Date): Promise<ChatMessage[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(
      after
        ? and(eq(messages.conversationId, conversationId), gt(messages.createdAt, after))
        : eq(messages.conversationId, conversationId),
    )
    .orderBy(asc(messages.createdAt))
    .limit(500);
  return rows.map(toChat);
}

/** Marks the other person's messages as read (powers "Seen" ticks). */
export async function markRead(conversationId: string, meId: string) {
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(and(eq(messages.conversationId, conversationId), ne(messages.senderId, meId), isNull(messages.readAt)));
}

export type ConversationSummary = {
  id: string;
  connectionId: string;
  other: Person;
  last: ChatMessage | null;
  unread: number;
};

export async function listConversations(meId: string): Promise<ConversationSummary[]> {
  const rows = await db
    .select({ conversation: conversations, connection: connections })
    .from(conversations)
    .innerJoin(connections, eq(connections.id, conversations.connectionId))
    .where(and(eq(connections.status, "accepted"), or(eq(connections.fromUserId, meId), eq(connections.toUserId, meId))));
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.conversation.id);
  const [people, recent] = await Promise.all([
    getPeople(rows.map((r) => (r.connection.fromUserId === meId ? r.connection.toUserId : r.connection.fromUserId))),
    db.select().from(messages).where(inArray(messages.conversationId, ids)).orderBy(desc(messages.createdAt)),
  ]);

  const summaries = rows.flatMap(({ conversation, connection }) => {
    const other = people.get(connection.fromUserId === meId ? connection.toUserId : connection.fromUserId);
    if (!other) return [];
    const mine = recent.filter((m) => m.conversationId === conversation.id);
    return [
      {
        id: conversation.id,
        connectionId: connection.id,
        other,
        last: mine[0] ? toChat(mine[0]) : null,
        unread: mine.filter((m) => m.senderId !== meId && !m.readAt).length,
      },
    ];
  });
  // Most recent activity first; brand-new conversations by creation time.
  const at = (s: ConversationSummary) =>
    s.last ? Date.parse(s.last.createdAt) : (rows.find((r) => r.conversation.id === s.id)?.conversation.createdAt.getTime() ?? 0);
  return summaries.sort((a, b) => at(b) - at(a));
}
