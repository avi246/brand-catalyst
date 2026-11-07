import { MessageSquare } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="Messages" description="Conversations open only after an invitation is accepted." />
      <EmptyState
        icon={MessageSquare}
        title="No conversations yet"
        body="Accept an invitation, or have one of yours accepted, and the conversation appears here."
        milestone="Milestone 3"
      />
    </>
  );
}
