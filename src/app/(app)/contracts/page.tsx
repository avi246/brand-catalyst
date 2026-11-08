import Link from "next/link";
import { eq } from "drizzle-orm";
import { FileSignature, Printer } from "lucide-react";
import { DealStatusBadge } from "@/components/deals/status-badge";
import { EmptyState, PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { brandProfiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { listMyDeals } from "@/lib/consignments/queries";
import { cn } from "@/lib/utils";
import { ContractTemplateForm } from "./contract-template-form";

export const metadata = { title: "Contracts" };

const CONTRACT_STATUSES = ["awaiting_acceptance", "final", "in_progress", "completed"];
const fmt = (d: Date) => d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });

/**
 * Everything about contracts in one place.
 * Brands: their contract template + every contract sent or signed. Creators: their contracts.
 */
export default async function ContractsPage() {
  const me = await requireUser();
  const deals = (await listMyDeals(me.id)).filter((d) => CONTRACT_STATUSES.includes(d.status));
  const awaiting = deals.filter((d) => d.status === "awaiting_acceptance");
  const signed = deals.filter((d) => d.status !== "awaiting_acceptance");

  const [brand] =
    me.role === "brand"
      ? await db
          .select({ brandName: brandProfiles.brandName, template: brandProfiles.contractTemplate })
          .from(brandProfiles)
          .where(eq(brandProfiles.userId, me.id))
      : [];

  return (
    <>
      <PageHeader
        title="Contracts"
        description={
          me.role === "brand"
            ? "Your contract template, and every contract you've sent or signed."
            : "Contracts brands have sent you, and the ones you've signed."
        }
      />

      <div className="flex flex-col gap-8">
        <div className="grid gap-4 lg:grid-cols-2">
          <ContractList
            title={me.role === "brand" ? "Waiting for the creator's signature" : "Waiting for your signature"}
            deals={awaiting}
            empty="Nothing waiting."
            highlight={me.role === "influencer" && awaiting.length > 0}
          />
          <ContractList title="Signed by both sides" deals={signed} empty="No signed contracts yet." />
        </div>

        {brand && <ContractTemplateForm brandName={brand.brandName} saved={brand.template} />}
      </div>
    </>
  );
}

function ContractList({
  title,
  deals,
  empty,
  highlight = false,
}: {
  title: string;
  deals: Awaited<ReturnType<typeof listMyDeals>>;
  empty: string;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(highlight && "border-primary/40 bg-primary/5")}>
      <CardHeader>
        <CardTitle className="text-base">
          {title} <span className="text-muted-foreground">({deals.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {deals.length === 0 ? (
          <EmptyState icon={FileSignature} title={empty} body="Contracts appear here once a proposal is settled and signed by the brand." />
        ) : (
          deals.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-lg border bg-background p-3">
              <div className="min-w-0 flex-1">
                <Link href={`/deals/${d.id}`} className="block truncate font-medium hover:underline">
                  {d.title}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  with {d.other.name} · {d.finalizedAt ? `signed ${fmt(d.finalizedAt)}` : `sent ${fmt(d.updatedAt)}`}
                </p>
              </div>
              <DealStatusBadge status={d.status} />
              <Link
                href={`/contract/${d.id}`}
                target="_blank"
                className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                aria-label="Printable contract"
                title="Printable version / PDF"
              >
                <Printer />
              </Link>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
