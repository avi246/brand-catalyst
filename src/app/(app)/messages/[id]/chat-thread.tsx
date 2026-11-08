"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage } from "@/lib/actions/messages";
import type { ChatMessage } from "@/lib/messages";
import { cn } from "@/lib/utils";

const POLL_MS = 3000;

/**
 * The chat window. New messages arrive by "polling": every 3 seconds it asks the server
 * for anything newer than the last message it has. Simple and reliable; Pusher can replace
 * it later for instant delivery.
 */
export function ChatThread({
  conversationId,
  meId,
  otherName,
  initial,
}: {
  conversationId: string;
  meId: string;
  otherName: string;
  initial: ChatMessage[];
}) {
  const [items, setItems] = useState<ChatMessage[]>(initial);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  // The poller reads the latest list through a ref, kept in sync after each render.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const merge = useCallback((incoming: ChatMessage[], seenIds: string[] = []) => {
    setItems((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) byId.set(m.id, m);
      for (const id of seenIds) {
        const m = byId.get(id);
        if (m && !m.readAt) byId.set(id, { ...m, readAt: new Date().toISOString() });
      }
      return [...byId.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    });
  }, []);

  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      const last = itemsRef.current.at(-1);
      const qs = last ? `?after=${encodeURIComponent(last.createdAt)}` : "";
      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages${qs}`, { cache: "no-store" });
        if (res.ok && !stopped) {
          const data = (await res.json()) as { messages: ChatMessage[]; seenIds: string[] };
          merge(data.messages, data.seenIds);
        }
      } catch {
        // Network blip: try again on the next tick.
      }
    };
    const timer = setInterval(tick, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [conversationId, merge]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [items.length]);

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    startTransition(async () => {
      const res = await sendMessage({ conversationId, body });
      if (res.ok) merge([res.message]);
      else {
        toast.error(res.error);
        setDraft(body);
      }
    });
  };

  const lastMineId = [...items].reverse().find((m) => m.senderId === meId)?.id;

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {items.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            You&apos;re connected with {otherName}. Start with campaign ideas, timing and budget.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {items.map((m) => {
              const mine = m.senderId === meId;
              return (
                <li key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                      mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted",
                    )}
                  >
                    {m.body}
                  </div>
                  <span className="mt-0.5 text-[11px] text-muted-foreground">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    {mine && m.id === lastMineId && (m.readAt ? " · Seen" : " · Sent")}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={`Message ${otherName}…`}
          rows={1}
          maxLength={2000}
          className="max-h-32 min-h-9 resize-none"
          aria-label="Message"
        />
        <Button type="submit" size="icon-lg" disabled={pending || !draft.trim()} aria-label="Send">
          <SendHorizontal />
        </Button>
      </form>
    </>
  );
}
