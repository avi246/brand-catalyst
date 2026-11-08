import { notFound, redirect } from "next/navigation";
import { ConsignmentEditor } from "@/components/deals/consignment-editor";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { getDealForUser } from "@/lib/consignments/queries";

export const metadata = { title: "Propose changes" };

export default async function ReviseDealPage({ params }: PageProps<"/deals/[id]/revise">) {
  const me = await requireUser();
  const { id } = await params;
  const view = await getDealForUser(id, me.id);
  if (!view) notFound();
  if (!["sent", "negotiating"].includes(view.deal.status)) redirect(`/deals/${id}`);
  const other = view.role === "brand" ? view.creator : view.brand;

  return (
    <>
      <PageHeader
        title={`Propose changes to v${view.current.versionNo}`}
        description={`Edit any term. ${other.name} will see exactly what changed, side by side.`}
      />
      <ConsignmentEditor
        initial={view.current.content}
        mode={{ kind: "revise", consignmentId: id, baseVersion: view.current.versionNo }}
        otherName={other.name}
      />
    </>
  );
}
