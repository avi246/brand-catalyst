import Link from "next/link";
import { FilePlus2, Handshake } from "lucide-react";
import { DealStatusBadge } from "@/components/deals/status-badge";
import { EmptyState, PageHeader } from "@/components/page-header";
import { RelationActions } from "@/components/relation-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { listMyConnections, type ConnectionRow } from "@/lib/connections";
import { listMyDeals } from "@/lib/consignments/queries";
import type { Person } from "@/lib/people";
import { cn } from "@/lib/utils";

export const metadata = { title: "Collaborations" };

const ago = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
function timeAgo(d: Date) {
  const mins = Math.round((d.getTime() - Date.now()) / 60000);
  if (Math.abs(mins) < 60) return ago.format(mins, "minute");
  const hrs = Math.round(mins / 60);
  if (Math.abs(hrs) < 24) return ago.format(hrs, "hour");
  return ago.format(Math.round(hrs / 24), "day");
}

/**
 * The pipeline: every relationship moves left to right.
 * Invitations -> Connected -> Proposal sent -> Negotiating -> Final.
 */
export default async function CollaborationsPage() {
  const me = await requireUser();
  const [rows, deals] = await Promise.all([listMyConnections(me.id), listMyDeals(me.id)]);

  const toAnswer = rows.filter((r) => r.status === "pending" && r.direction === "received");
  const sent = rows.filter((r) => r.status === "pending" && r.direction === "sent");
  const dealConnectionIds = new Set(deals.filter((d) => d.status !== "cancelled").map((d) => d.connectionId));
  const connected = rows.filter((r) => r.status === "accepted" && !dealConnectionIds.has(r.id));
  const byStatus = (...s: string[]) => deals.filter((d) => s.includes(d.status));
  const cancelled = byStatus("cancelled");

  const empty = rows.length === 0 && deals.length === 0;

  return (
    <>
      <PageHeader
        title="Collaborations"
        description="Every relationship moves left to right: invitation, conversation, proposal, negotiation, locked deal."
      />

      {empty ? (
        <EmptyState
          icon={Handshake}
          title="No collaborations yet"
          body={
            me.role === "brand"
              ? "Find creators in Discover and invite the ones who fit. Their answers show up here."
              : "Find brands in Discover and invite them, or wait for brands to invite you."
          }
        />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
          <div className="grid min-w-[1320px] grid-cols-6 gap-4">
            <Column title="To answer" count={toAnswer.length} hint="Invitations waiting for you" highlight={toAnswer.length > 0}>
              {toAnswer.map((r) => (
                <InvitationCard key={r.id} row={r} />
              ))}
            </Column>
            <Column title="Sent" count={sent.length} hint="Waiting for them to accept">
              {sent.map((r) => (
                <InvitationCard key={r.id} row={r} />
              ))}
            </Column>
            <Column title="Connected" count={connected.length} hint="Chatting, no proposal yet">
              {connected.map((r) => (
                <ConnectedCard key={r.id} row={r} isBrand={me.role === "brand"} />
              ))}
            </Column>
            <Column title="Proposal sent" count={byStatus("sent").length} hint="v1 waiting for review">
              {byStatus("sent").map((d) => (
                <DealCard key={d.id} deal={d} />
              ))}
            </Column>
            <Column title="Negotiating" count={byStatus("negotiating").length} hint="Changes going back and forth">
              {byStatus("negotiating").map((d) => (
                <DealCard key={d.id} deal={d} />
              ))}
            </Column>
            <Column title="Final" count={byStatus("final", "in_progress", "completed").length} hint="Locked by both sides">
              {byStatus("final", "in_progress", "completed").map((d) => (
                <DealCard key={d.id} deal={d} />
              ))}
            </Column>
          </div>
        </div>
      )}

      {cancelled.length > 0 && (
        <details className="mt-6 text-sm">
          <summary className="cursor-pointer text-muted-foreground">Cancelled ({cancelled.length})</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {cancelled.map((d) => (
              <DealCard key={d.id} deal={d} />
            ))}
          </div>
        </details>
      )}

      <div className="mt-8">
        <Link href="/discover" className={cn(buttonVariants({ variant: "outline" }))}>
          Find more in Discover
        </Link>
      </div>
    </>
  );
}

function Column({
  title,
  count,
  hint,
  highlight = false,
  children,
}: {
  title: string;
  count: number;
  hint: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-xl border bg-muted/30 p-3",
        highlight && "border-primary/40 bg-primary/5",
      )}
    >
      <header>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">{title}</h2>
          <Badge variant="secondary">{count}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </header>
      {count === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">Nothing here</p> : children}
    </section>
  );
}

function PersonLine({ person }: { person: Person }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="size-8">
        {person.avatarUrl && <AvatarImage src={person.avatarUrl} alt="" />}
        <AvatarFallback>{person.name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <Link href={person.href} className="block truncate text-sm font-medium hover:underline">
          {person.name}
        </Link>
        <span className="block truncate text-xs text-muted-foreground">{person.subtitle}</span>
      </div>
      {person.isDemo && <Badge variant="outline">Demo</Badge>}
    </div>
  );
}

function InvitationCard({ row }: { row: ConnectionRow }) {
  const state =
    row.direction === "sent"
      ? ({ kind: "sent", connectionId: row.id } as const)
      : ({ kind: "received", connectionId: row.id } as const);
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-background p-3">
      <PersonLine person={row.other} />
      <span className="text-xs text-muted-foreground">
        {row.direction === "sent" ? "Sent" : "Received"} {timeAgo(row.createdAt)}
      </span>
      {row.note && <p className="rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">&ldquo;{row.note}&rdquo;</p>}
      <RelationActions otherUserId={row.other.id} otherName={row.other.name} state={state} size="sm" />
    </div>
  );
}

function ConnectedCard({ row, isBrand }: { row: ConnectionRow; isBrand: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-background p-3">
      <PersonLine person={row.other} />
      <div className="flex flex-wrap gap-2">
        <RelationActions otherUserId={row.other.id} otherName={row.other.name} state={{ kind: "connected", connectionId: row.id }} size="sm" />
        {isBrand && (
          <Link href={`/deals/new?connection=${row.id}`} className={cn(buttonVariants({ size: "sm" }))}>
            <FilePlus2 /> Consignment
          </Link>
        )}
      </div>
    </div>
  );
}

function DealCard({ deal }: { deal: Awaited<ReturnType<typeof listMyDeals>>[number] }) {
  return (
    <Link href={`/deals/${deal.id}`} className="flex flex-col gap-2 rounded-lg border bg-background p-3 hover:border-foreground/30">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium">{deal.title}</span>
        <span className="text-xs text-muted-foreground">v{deal.currentVersion}</span>
      </div>
      <span className="truncate text-xs text-muted-foreground">with {deal.other.name}</span>
      <div className="flex items-center justify-between">
        <DealStatusBadge status={deal.status} />
        <span className="text-xs text-muted-foreground">{timeAgo(deal.updatedAt)}</span>
      </div>
    </Link>
  );
}
