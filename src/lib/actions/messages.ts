"use server";

import { and, count, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getConversationForUser, type ChatMessage } from "@/lib/messages";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_MESSAGES_PER_MINUTE = 30;

export async function sendMessage(input: {
  conversationId: string;
  body: string;
}): Promise<{ ok: true; message: ChatMessage } | { ok: false; error: string }> {
  const me = await requireUser();
  const parsed = z
    .object({
      conversationId: z.uuid(),
      body: z.string().trim().min(1, "Type a message").max(MAX_MESSAGE_LENGTH, "Message is too long"),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const convo = await getConversationForUser(parsed.data.conversationId, me.id);
  if (!convo) return { ok: false, error: "You can't message in this conversation." };

  // Flood protection.
  const [{ n }] = await db
    .select({ n: count() })
    .from(messages)
    .where(and(eq(messages.senderId, me.id), gte(messages.createdAt, new Date(Date.now() - 60_000))));
  if (n >= MAX_MESSAGES_PER_MINUTE) return { ok: false, error: "You're sending messages too fast. Wait a moment." };

  const [m] = await db
    .insert(messages)
    .values({ conversationId: convo.conversation.id, senderId: me.id, body: parsed.data.body })
    .returning();

  return {
    ok: true,
    message: { id: m.id, senderId: m.senderId, body: m.body, createdAt: m.createdAt.toISOString(), readAt: null },
  };
}
