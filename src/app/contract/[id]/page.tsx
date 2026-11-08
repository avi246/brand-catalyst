import { notFound } from "next/navigation";
import { ContractView } from "@/components/deals/contract-view";
import { requireUser } from "@/lib/auth";
import { getDealForUser } from "@/lib/consignments/queries";
import { contractSignatures } from "@/lib/contracts/signatures";
import { PrintButton } from "./print-button";

export const metadata = { title: "Contract" };

/** A clean, printable page with only the contract (Ctrl+P / "Save as PDF"). Parties only. */
export default async function ContractPrintPage({ params }: PageProps<"/contract/[id]">) {
  const me = await requireUser();
  const { id } = await params;
  const view = await getDealForUser(id, me.id);
  if (!view || !view.current.contractText) notFound();

  return (
    <div className="mx-auto max-w-3xl bg-white px-4 py-8 print:max-w-none print:p-0">
      <div className="mb-6 flex justify-end print:hidden">
        <PrintButton />
      </div>
      <ContractView
        text={view.current.contractText}
        signatures={contractSignatures(view)}
        fingerprint={view.current.contentHash}
      />
    </div>
  );
}
