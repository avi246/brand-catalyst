import { Handshake } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Collaborations" };

export default async function CollaborationsPage() {
  await requireUser();
  return (
    <>
      <PageHeader
        title="Collaborations"
        description="Every deal in one pipeline: invitations, conversations, proposals, negotiation, final and completed."
      />
      <EmptyState
        icon={Handshake}
        title="No collaborations yet"
        body="Invitations you send or receive, and every consignment after that, will appear here as a pipeline board."
        milestone="Milestone 2"
      />
    </>
  );
}
