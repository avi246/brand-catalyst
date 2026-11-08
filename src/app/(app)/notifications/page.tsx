import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Bell, Check, FileText, Lock, MessageCircle, Send, X } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notifications" };

function describe(type: string, payload: Record<string, unknown>) {
  switch (type) {
    case "invitation_received":
      return { icon: Send, text: `${payload.fromName ?? "Someone"} invited you to connect.`, href: "/collaborations" };
    case "invitation_accepted":
      return { icon: Check, text: `${payload.byName ?? "Someone"} accepted your invitation. Messaging is open.`, href: "/messages" };
    case "consignment_received":
      return { icon: FileText, text: `${payload.fromName ?? "A brand"} sent you a consignment: "${payload.title}".`, href: `/deals/${payload.consignmentId}` };
    case "consignment_revised":
      return { icon: FileText, text: `${payload.byName ?? "The brand"} updated "${payload.title}". See what changed.`, href: `/deals/${payload.consignmentId}` };
    case "consignment_accepted_one_side":
      return { icon: Check, text: `${payload.byName ?? "Someone"} accepted "${payload.title}".`, href: `/deals/${payload.consignmentId}` };
    case "consignment_final":
      return { icon: Lock, text: `"${payload.title}" was accepted and is now final.`, href: `/deals/${payload.consignmentId}` };
    case "consignment_comment":
      return { icon: MessageCircle, text: `${payload.byName ?? "Someone"} ${payload.kind === "question" ? "asked a question" : "commented"} on "${payload.title}".`, href: `/deals/${payload.consignmentId}` };
    case "consignment_cancelled":
      return { icon: X, text: `${payload.byName ?? "Someone"} ${payload.verb ?? "cancelled"} "${payload.title}".`, href: `/deals/${payload.consignmentId}` };
    default:
      return { icon: Bell, text: type.replace(/_/g, " "), href: "/dashboard" };
  }
}

export default async function NotificationsPage() {
  const me = await requireUser();
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, me.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  // Opening this page marks everything as read; we render the unread dots from the rows above.
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, me.id), isNull(notifications.readAt)));

  return (
    <>
      <PageHeader title="Notifications" />
      {rows.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="You're all caught up"
          body="Invitations, new messages, proposal changes and deadline reminders will show up here."
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col divide-y p-0">
            {rows.map((n) => {
              const { icon: Icon, text, href } = describe(n.type, n.payload);
              return (
                <Link key={n.id} href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted">
                    <Icon className="size-4 text-muted-foreground" />
                  </span>
                  <span className={cn("flex-1 text-sm", !n.readAt && "font-medium")}>{text}</span>
                  <span className="text-xs text-muted-foreground">{n.createdAt.toLocaleString()}</span>
                  {!n.readAt && <span className="size-2 rounded-full bg-primary" aria-label="Unread" />}
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}
    </>
  );
}
