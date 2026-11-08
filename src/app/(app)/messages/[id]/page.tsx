import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, FilePlus2, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/db";
import { consignments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getConversationForUser, getMessages, markRead } from "@/lib/messages";
import { getPerson } from "@/lib/people";
import { cn } from "@/lib/utils";
import { ChatThread } from "./chat-thread";

export const metadata = { title: "Messages" };

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const me = await requireUser();
  const { id } = await params;
  const convo = await getConversationForUser(id, me.id);
  if (!convo) notFound();

  await markRead(id, me.id);
  const [other, initial, deals] = await Promise.all([
    getPerson(convo.otherId),
    getMessages(id),
    db
      .select({ id: consignments.id, title: consignments.title, status: consignments.status })
      .from(consignments)
      .where(and(eq(consignments.connectionId, convo.connection.id)))
      .orderBy(desc(consignments.updatedAt)),
  ]);
  if (!other) notFound();

  return (
    <>
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Link href="/messages" className="md:hidden" aria-label="Back to conversations">
          <ArrowLeft className="size-4" />
        </Link>
        <Avatar className="size-9">
          {other.avatarUrl && <AvatarImage src={other.avatarUrl} alt="" />}
          <AvatarFallback>{other.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <Link href={other.href} className="block truncate font-medium hover:underline">
            {other.name}
          </Link>
          <span className="block truncate text-xs text-muted-foreground">{other.subtitle}</span>
        </div>
        {other.isDemo && <Badge variant="outline">Demo</Badge>}
        {me.role === "brand" && (
          <Link
            href={`/deals/new?connection=${convo.connection.id}`}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            <FilePlus2 /> New consignment
          </Link>
        )}
      </header>

      {deals.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b bg-muted/40 px-4 py-2">
          {deals.map((d) => (
            <Link
              key={d.id}
              href={`/deals/${d.id}`}
              className="flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs hover:border-foreground/30"
            >
              <FileText className="size-3.5" /> {d.title}
              <span className="text-muted-foreground">· {d.status.replace("_", " ")}</span>
            </Link>
          ))}
        </div>
      )}

      <ChatThread conversationId={id} meId={me.id} otherName={other.name} initial={initial} />
    </>
  );
}
