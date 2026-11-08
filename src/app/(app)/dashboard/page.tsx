import Link from "next/link";
import { and, count, eq, inArray, or } from "drizzle-orm";
import { ArrowRight, CheckCircle2, Circle, Compass, Handshake, Inbox, Lock, Send } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { db } from "@/db";
import { connections, consignments } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { completeness, getProfileBundle, profileChecklist } from "@/lib/profiles";
import { cn } from "@/lib/utils";

export const metadata = { title: "Home" };

export default async function DashboardPage() {
  const user = await requireUser();
  const bundle = await getProfileBundle(user);

  const myDeals = or(eq(consignments.brandUserId, user.id), eq(consignments.influencerUserId, user.id));
  const [[toAnswer], [sentPending], [negotiating], [locked]] = await Promise.all([
    db
      .select({ n: count() })
      .from(connections)
      .where(and(eq(connections.toUserId, user.id), eq(connections.status, "pending"))),
    db
      .select({ n: count() })
      .from(connections)
      .where(and(eq(connections.fromUserId, user.id), eq(connections.status, "pending"))),
    db
      .select({ n: count() })
      .from(consignments)
      .where(and(myDeals, inArray(consignments.status, ["sent", "negotiating", "awaiting_acceptance"]))),
    db
      .select({ n: count() })
      .from(consignments)
      .where(and(myDeals, inArray(consignments.status, ["final", "in_progress"]))),
  ]);

  const checks = bundle ? profileChecklist(bundle) : [];
  const score = bundle ? completeness(checks) : 0;
  const firstName = user.displayName.split(" ")[0];
  const isBrand = user.role === "brand";

  const stats = [
    { label: "Invitations to answer", hint: "Others invited you", value: toAnswer.n, icon: Inbox, highlight: toAnswer.n > 0 },
    { label: "Invitations you sent", hint: "Waiting for them to accept", value: sentPending.n, icon: Send, highlight: false },
    { label: "Deals in negotiation", hint: "Proposal sent or changes in progress", value: negotiating.n, icon: Handshake, highlight: false },
    { label: "Locked deals", hint: "Both sides accepted the same version", value: locked.n, icon: Lock, highlight: false },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome, ${firstName}`}
        description={
          isBrand
            ? "Find creators who fit, send a clear brief, and lock terms both sides trust."
            : "Brands can find you, invite you, and send proposals you negotiate clause by clause."
        }
        actions={
          <Link href="/discover" className={cn(buttonVariants())}>
            <Compass />
            {isBrand ? "Find creators" : "Find brands"}
          </Link>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, hint, value, icon: Icon, highlight }) => (
          <Link key={label} href="/collaborations" className="group">
            <Card
              className={cn(
                "h-full transition-colors group-hover:border-foreground/20",
                highlight && "border-primary/40 bg-primary/5",
              )}
            >
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <Icon className="size-4" /> {label}
                </CardDescription>
                <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile strength</CardTitle>
            <CardDescription>
              {isBrand
                ? "Complete profiles get more creators accepting invitations."
                : "Complete profiles rank higher in brand searches."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Progress value={score} className="flex-1" aria-label="Profile completeness" />
              <span className="text-sm font-medium tabular-nums">{score}%</span>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              {checks.map((c) => (
                <li key={c.label} className="flex items-center gap-2">
                  {c.done ? (
                    <CheckCircle2 className="size-4 text-emerald-600" aria-label="Done" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground" aria-label="To do" />
                  )}
                  <span className={cn(c.done && "text-muted-foreground line-through")}>{c.label}</span>
                </li>
              ))}
            </ul>
            <Link href="/profile/edit" className={cn(buttonVariants({ variant: "outline" }), "self-start")}>
              Edit profile <ArrowRight />
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>How a collaboration works here</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                ["Discover", "Search and see match reasons."],
                ["Invite", "Messaging unlocks only after the other side accepts."],
                ["Propose", "The brand sends a consignment: clause by clause, with priorities."],
                ["Negotiate and lock", "Every change is a new version. Final when both accept the same one."],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium">
                    {i + 1}
                  </span>
                  <span>
                    <span className="font-medium">{title}.</span>{" "}
                    <span className="text-muted-foreground">{body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
