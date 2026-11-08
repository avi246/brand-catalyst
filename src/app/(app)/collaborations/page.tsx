import Link from "next/link";
import { Handshake } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { RelationActions } from "@/components/relation-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { listMyConnections, type ConnectionRow } from "@/lib/connections";
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

export default async function CollaborationsPage() {
  const me = await requireUser();
  const rows = await listMyConnections(me.id);
  const received = rows.filter((r) => r.status === "pending" && r.direction === "received");
  const sent = rows.filter((r) => r.status === "pending" && r.direction === "sent");
  const connected = rows.filter((r) => r.status === "accepted");

  return (
    <>
      <PageHeader
        title="Collaborations"
        description="Invitations in both directions and the people you're connected with. Proposals and deal stages arrive in the next milestone."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="No invitations yet"
          body={
            me.role === "brand"
              ? "Find creators in Discover and invite the ones who fit. Their answers show up here."
              : "Find brands in Discover and invite them, or wait for brands to invite you."
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Column title="Waiting for you" count={received.length} empty="No invitations to answer.">
            {received.map((r) => (
              <Row key={r.id} row={r} />
            ))}
          </Column>
          <Column title="Sent" count={sent.length} empty="Nothing waiting on others.">
            {sent.map((r) => (
              <Row key={r.id} row={r} />
            ))}
          </Column>
          <Column title="Connected" count={connected.length} empty="Accepted invitations appear here.">
            {connected.map((r) => (
              <Row key={r.id} row={r} />
            ))}
          </Column>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-8">
          <Link href="/discover" className={cn(buttonVariants({ variant: "outline" }))}>
            Find more in Discover
          </Link>
        </div>
      )}
    </>
  );
}

function Column({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-muted/30">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Badge variant="secondary">{count}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {count === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : children}
      </CardContent>
    </Card>
  );
}

function Row({ row }: { row: ConnectionRow }) {
  const state =
    row.status === "accepted"
      ? ({ kind: "connected", connectionId: row.id } as const)
      : row.direction === "sent"
        ? ({ kind: "sent", connectionId: row.id } as const)
        : ({ kind: "received", connectionId: row.id } as const);

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-background p-3">
      <div className="flex items-center gap-3">
        <Avatar className="size-9">
          {row.other.avatarUrl && <AvatarImage src={row.other.avatarUrl} alt="" />}
          <AvatarFallback>{row.other.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <Link href={row.other.href} className="block truncate font-medium hover:underline">
            {row.other.name}
          </Link>
          <span className="block truncate text-xs text-muted-foreground">{row.other.subtitle}</span>
        </div>
        {row.other.isDemo && <Badge variant="outline">Demo</Badge>}
      </div>
      {row.note && (
        <p className="rounded-md bg-muted/60 p-2 text-sm text-muted-foreground">&ldquo;{row.note}&rdquo;</p>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{timeAgo(row.createdAt)}</span>
        <RelationActions otherUserId={row.other.id} otherName={row.other.name} state={state} size="sm" />
      </div>
    </div>
  );
}
