import { requireUser } from "@/lib/auth";
import { listConversations } from "@/lib/messages";
import { ConversationList } from "./conversation-list";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  const conversations = await listConversations(me.id);

  return (
    <div className="grid h-[calc(100vh-10rem)] min-h-[480px] overflow-hidden rounded-xl border bg-background md:grid-cols-[18rem_1fr]">
      <ConversationList conversations={conversations} />
      <div className="flex min-h-0 flex-col">{children}</div>
    </div>
  );
}
