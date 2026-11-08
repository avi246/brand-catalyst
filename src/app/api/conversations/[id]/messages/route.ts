import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getConversationForUser, getMessages, markRead } from "@/lib/messages";

/**
 * The chat window calls this every few seconds ("polling") to fetch new messages.
 * GET /api/conversations/:id/messages?after=<ISO time>
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/conversations/[id]/messages">) {
  const me = await getCurrentUser();
  if (!me) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await ctx.params;
  const convo = await getConversationForUser(id, me.id);
  if (!convo) return Response.json({ error: "Not found" }, { status: 404 });

  const afterParam = req.nextUrl.searchParams.get("after");
  const after = afterParam && !Number.isNaN(Date.parse(afterParam)) ? new Date(afterParam) : undefined;

  const [fresh] = await Promise.all([getMessages(id, after), markRead(id, me.id)]);
  // Also return read receipts for my own recent messages so "Seen" updates.
  const all = after ? await getMessages(id) : fresh;
  const seenIds = all.filter((m) => m.senderId === me.id && m.readAt).map((m) => m.id);

  return Response.json({ messages: fresh, seenIds }, { headers: { "Cache-Control": "no-store" } });
}
