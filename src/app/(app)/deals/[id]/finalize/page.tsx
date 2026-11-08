import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai/gemini";
import { getDealForUser } from "@/lib/consignments/queries";
import { FinalizeWorkspace } from "./finalize-workspace";

export const metadata = { title: "Prepare final agreement" };

/** Brand only: turn the negotiated terms + discussion into the clean final agreement. */
export default async function FinalizePage({ params }: PageProps<"/deals/[id]/finalize">) {
  const me = await requireUser("brand");
  const { id } = await params;
  const view = await getDealForUser(id, me.id);
  if (!view || view.role !== "brand") notFound();
  if (!["sent", "negotiating"].includes(view.deal.status)) redirect(`/deals/${id}`);

  // Comment texts, so each resolution note can show the comments it came from.
  const commentText = Object.fromEntries(
    view.comments.map((c) => [
      c.id,
      { author: view.people.get(c.userId)?.name ?? "Someone", body: c.body },
    ]),
  );

  return (
    <>
      <PageHeader
        title="Prepare final agreement"
        description={`Turn the discussion with ${view.creator.name} into a clean agreement they can accept. You review everything before it's sent.`}
      />
      <FinalizeWorkspace
        consignmentId={id}
        baseVersion={view.current.versionNo}
        current={view.current.content}
        creatorName={view.creator.name}
        commentCount={view.comments.length}
        commentText={commentText}
        aiAvailable={aiConfigured()}
      />
    </>
  );
}
