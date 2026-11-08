import { notFound } from "next/navigation";
import { and, eq, or } from "drizzle-orm";
import { ConsignmentEditor } from "@/components/deals/consignment-editor";
import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { connections } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { defaultContent } from "@/lib/consignments/schema";
import { getPerson } from "@/lib/people";
import { isUuid } from "@/lib/utils";

export const metadata = { title: "New proposal" };

export default async function NewDealPage({ searchParams }: PageProps<"/deals/new">) {
  const me = await requireUser("brand");
  const { connection } = await searchParams;
  if (!isUuid(connection)) notFound();

  const [conn] = await db
    .select()
    .from(connections)
    .where(
      and(
        eq(connections.id, connection),
        eq(connections.status, "accepted"),
        or(eq(connections.fromUserId, me.id), eq(connections.toUserId, me.id)),
      ),
    );
  if (!conn) notFound();
  const creator = await getPerson(conn.fromUserId === me.id ? conn.toUserId : conn.fromUserId);
  if (!creator) notFound();

  return (
    <>
      <PageHeader
        title={`New proposal for ${creator.name}`}
        description="Start from the suggested terms, change what you need, and mark how firm each one is."
      />
      <ConsignmentEditor initial={defaultContent()} mode={{ kind: "create", connectionId: conn.id }} otherName={creator.name} />
    </>
  );
}
