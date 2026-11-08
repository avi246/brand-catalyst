import { and, count, eq, isNull, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { connections, conversations, messages, notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

/**
 * Unread counts for the sidebar badges. The sidebar asks for these when you change page
 * and every 15 seconds. GET /api/badges -> { notifications, messages }
 */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });

  const [[n], [m]] = await Promise.all([
    db
      .select({ n: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, me.id), isNull(notifications.readAt))),
    db
      .select({ n: count() })
      .from(messages)
      .innerJoin(conversations, eq(conversations.id, messages.conversationId))
      .innerJoin(connections, eq(connections.id, conversations.connectionId))
      .where(
        and(
          or(eq(connections.fromUserId, me.id), eq(connections.toUserId, me.id)),
          ne(messages.senderId, me.id),
          isNull(messages.readAt),
        ),
      ),
  ]);

  return Response.json({ notifications: n.n, messages: m.n }, { headers: { "Cache-Control": "no-store" } });
}
