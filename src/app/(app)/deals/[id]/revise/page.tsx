import { notFound, redirect } from "next/navigation";
import { ConsignmentEditor } from "@/components/deals/consignment-editor";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { getDealForUser } from "@/lib/consignments/queries";

export const metadata = { title: "Edit consignment" };

/** Brand only: edit the consignment in response to the creator's comments. */
export default async function EditDealPage({ params }: PageProps<"/deals/[id]/revise">) {
  const me = await requireUser("brand");
  const { id } = await params;
  const view = await getDealForUser(id, me.id);
  if (!view || view.role !== "brand") notFound();
  if (!["sent", "negotiating"].includes(view.deal.status)) redirect(`/deals/${id}`);

  return (
    <>
      <PageHeader
        title="Edit consignment"
        description={`Change any term in response to ${view.creator.name}'s comments. They'll see exactly what changed.`}
      />
      <ConsignmentEditor
        initial={view.current.content}
        mode={{ kind: "revise", consignmentId: id, baseVersion: view.current.versionNo }}
        otherName={view.creator.name}
      />
    </>
  );
}
