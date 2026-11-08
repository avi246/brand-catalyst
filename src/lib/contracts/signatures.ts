import "server-only";
import type { Signature } from "@/components/deals/contract-view";
import type { DealView } from "@/lib/consignments/queries";

/** Brand and creator signature blocks for the current contract version. */
export function contractSignatures(view: DealView): Signature[] {
  const { current, acceptances, brand, creator } = view;
  const sig = (userId: string) =>
    acceptances.find((a) => a.userId === userId && a.versionNo === current.versionNo && a.contentHash === current.contentHash);
  const b = sig(brand.id);
  const c = sig(creator.id);
  return [
    { role: "Brand", party: brand.name, name: b?.signedName ?? null, at: b?.acceptedAt ?? null },
    { role: "Creator", party: creator.name, name: c?.signedName ?? null, at: c?.acceptedAt ?? null },
  ];
}
