"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ConversationSummary } from "@/lib/messages";
import { cn } from "@/lib/utils";

export function ConversationList({ conversations }: { conversations: ConversationSummary[] }) {
  const pathname = usePathname();
  const inThread = pathname !== "/messages";

  return (
    <aside className={cn("flex min-h-0 flex-col border-r", inThread && "hidden md:flex")}>
      <div className="border-b px-4 py-3 font-medium">Messages</div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No conversations yet. They open when an invitation is accepted.
          </p>
        ) : (
          conversations.map((c) => {
            const active = pathname === `/messages/${c.id}`;
            return (
              <Link
                key={c.id}
                href={`/messages/${c.id}`}
                className={cn("flex items-center gap-3 border-b px-4 py-3 hover:bg-muted/50", active && "bg-muted")}
              >
                <Avatar className="size-9">
                  {c.other.avatarUrl && <AvatarImage src={c.other.avatarUrl} alt="" />}
                  <AvatarFallback>{c.other.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("truncate text-sm", c.unread ? "font-semibold" : "font-medium")}>
                      {c.other.name}
                    </span>
                    {c.unread > 0 && (
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">
                        {c.unread}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{c.last ? c.last.body : "Say hello 👋"}</p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </aside>
  );
}
