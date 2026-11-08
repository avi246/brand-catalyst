import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, Lock, MessageSquare } from "lucide-react";
import { DealActions, TermComments } from "@/components/deals/deal-actions";
import { PriorityBadge } from "@/components/deals/priority-badge";
import { DealStatusBadge } from "@/components/deals/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getDealForUser } from "@/lib/consignments/queries";
import { diffContent, SECTION_LABEL, TERM_SECTIONS } from "@/lib/consignments/schema";
import { PLATFORM_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata = { title: "Consignment" };

const fmtDate = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" }) : "Not set";
const fmtTime = (d: Date) =>
  d.toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default async function DealPage({ params }: PageProps<"/deals/[id]">) {
  const me = await requireUser();
  const { id } = await params;
  const view = await getDealForUser(id, me.id);
  if (!view) notFound();

  const { deal, current, versions, acceptances, comments, people, brand, creator } = view;
  const c = current.content;
  const open = deal.status === "sent" || deal.status === "negotiating";
  const locked = deal.status === "final" || deal.status === "in_progress" || deal.status === "completed";
  const other = view.role === "brand" ? creator : brand;

  const acceptedCurrent = acceptances.filter((a) => a.versionNo === current.versionNo && a.contentHash === current.contentHash);
  const iAccepted = acceptedCurrent.some((a) => a.userId === me.id);
  const theyAccepted = acceptedCurrent.some((a) => a.userId === other.id);
  const previous = versions.find((v) => v.versionNo === current.versionNo - 1);
  const changes = previous ? diffContent(previous.content, c) : [];

  const toView = (x: (typeof comments)[number]) => ({
    id: x.id,
    author: people.get(x.userId)?.name ?? "Someone",
    mine: x.userId === me.id,
    kind: x.kind,
    body: x.body,
    at: fmtTime(x.createdAt),
    version: x.versionNo !== current.versionNo ? `v${x.versionNo}` : null,
  });
  const commentsFor = (key: string) => comments.filter((x) => x.clauseKey === key).map(toView);

  // Human name for whatever a comment is attached to.
  const labelFor = (key: string) => {
    if (key === "general") return "General";
    if (key === "fee") return "Compensation";
    const d = c.deliverables.find((x) => x.key === key);
    if (d) return `Deliverable: ${d.format}`;
    return c.terms.find((x) => x.key === key)?.label ?? "A removed term";
  };
  const fromOther = comments.filter((x) => x.userId === other.id);
  const otherOnCurrent = fromOther.filter((x) => x.versionNo === current.versionNo);
  const otherQuestions = otherOnCurrent.filter((x) => x.kind === "question").length;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/collaborations" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Collaborations
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{c.overview.title}</h1>
            <DealStatusBadge status={deal.status} />
            <span className="text-sm text-muted-foreground">v{current.versionNo}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            <Link href={brand.href} className="hover:underline">{brand.name}</Link> ×{" "}
            <Link href={creator.href} className="hover:underline">{creator.name}</Link> · {c.overview.product}
          </p>
        </div>
        {view.conversationId && (
          <Link href={`/messages/${view.conversationId}`} className={cn(buttonVariants({ variant: "outline" }))}>
            <MessageSquare /> Open chat
          </Link>
        )}
      </div>

      {/* Status banner + actions */}
      <Card className={cn(locked && "border-emerald-300 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20")}>
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            {locked ? <Lock className="mt-0.5 size-5 text-emerald-700" /> : <Clock className="mt-0.5 size-5 text-muted-foreground" />}
            <div className="text-sm">
              {locked && (
                <>
                  <p className="font-medium">Locked. Both sides accepted v{current.versionNo}.</p>
                  <p className="text-muted-foreground">
                    Terms can no longer change. Fingerprint{" "}
                    <code className="rounded bg-muted px-1">{current.contentHash.slice(0, 12)}</code>
                    {deal.finalizedAt && ` · finalized ${fmtTime(deal.finalizedAt)}`}
                  </p>
                </>
              )}
              {deal.status === "cancelled" && <p className="font-medium">This deal was cancelled. Nothing here is binding.</p>}
              {open && (
                <>
                  <p className="font-medium">
                    {iAccepted && !theyAccepted && `You accepted v${current.versionNo}. Waiting for ${other.name}.`}
                    {!iAccepted && theyAccepted && `${other.name} accepted v${current.versionNo}. Your turn: accept, or propose changes.`}
                    {!iAccepted && !theyAccepted && `Nobody has accepted v${current.versionNo} yet.`}
                  </p>
                  <p className="text-muted-foreground">
                    The deal locks when both of you accept the same version. Any change creates a new version.
                  </p>
                  {otherOnCurrent.length > 0 && (
                    <a href="#discussion" className="mt-1 inline-block font-medium text-amber-800 hover:underline dark:text-amber-300">
                      {other.name} left {otherOnCurrent.length} comment{otherOnCurrent.length === 1 ? "" : "s"}
                      {otherQuestions > 0 && ` (${otherQuestions} question${otherQuestions === 1 ? "" : "s"})`} on v
                      {current.versionNo}. See below.
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
          {open && (
            <DealActions consignmentId={deal.id} versionNo={current.versionNo} canAccept={!iAccepted} role={view.role} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="flex flex-col gap-6">
          {/* Discussion summary: every comment and question in one place, newest first */}
          {(comments.length > 0 || open) && (
            <Card id="discussion" className="scroll-mt-20">
              <CardHeader>
                <CardTitle>Questions and comments</CardTitle>
                <CardDescription>
                  Everything both sides said about the terms, newest first. Click one to jump to that term.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
                {[...comments].reverse().slice(0, 8).map((x) => (
                  <a
                    key={x.id}
                    href={`#clause-${x.clauseKey}`}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm hover:border-foreground/30",
                      x.userId === other.id && x.versionNo === current.versionNo && "border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20",
                    )}
                  >
                    <span className="font-medium">{people.get(x.userId)?.name ?? "Someone"}</span>{" "}
                    <span className="text-muted-foreground">
                      {x.kind === "question" ? "asked about" : "commented on"} {labelFor(x.clauseKey)} · v{x.versionNo} ·{" "}
                      {fmtTime(x.createdAt)}
                    </span>
                    <p className="mt-0.5">{x.body}</p>
                  </a>
                ))}
                <div id="clause-general" className="scroll-mt-20 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground">General discussion about the whole deal</p>
                  <TermComments consignmentId={deal.id} clauseKey="general" comments={[]} open={open} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* What changed */}
          {changes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  What changed in v{current.versionNo}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    by {people.get(current.createdBy)?.name}
                  </span>
                </CardTitle>
                {current.changeNote && <CardDescription>&ldquo;{current.changeNote}&rdquo;</CardDescription>}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {changes.map((ch, i) => (
                  <div key={i} className="rounded-lg border p-3 text-sm">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-medium">{ch.label}</span>
                      <span className="text-xs text-muted-foreground">{ch.kind}</span>
                    </div>
                    {ch.before && (
                      <p className="rounded bg-rose-50 px-2 py-1 text-rose-900 line-through decoration-rose-400 dark:bg-rose-950/40 dark:text-rose-200">
                        {ch.before}
                      </p>
                    )}
                    {ch.after && (
                      <p className="mt-1 rounded bg-emerald-50 px-2 py-1 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                        {ch.after}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Overview + fee */}
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              <Info label="Product">{c.overview.product}</Info>
              <Info label="Objective">{c.overview.objective || "—"}</Info>
              <Info label="Key message" className="sm:col-span-2">{c.overview.keyMessage || "—"}</Info>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Compensation</CardTitle>
              <PriorityBadge priority={c.fee.priority} />
            </CardHeader>
            <CardContent id="clause-fee" className="scroll-mt-20 text-sm">
              <p className="text-2xl font-semibold tabular-nums">
                {c.fee.amount.toLocaleString("en", { style: "currency", currency: c.fee.currency, maximumFractionDigits: 0 })}
              </p>
              <p className="text-muted-foreground">
                {c.fee.schedule}
                {c.fee.giftedProduct && " · plus gifted product"}
              </p>
              <TermComments consignmentId={deal.id} clauseKey="fee" comments={commentsFor("fee")} open={open} />
            </CardContent>
          </Card>

          {/* Deliverables */}
          <Card>
            <CardHeader>
              <CardTitle>Deliverables</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {c.deliverables.map((d) => (
                <div key={d.key} id={`clause-${d.key}`} className="scroll-mt-20 rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {d.quantity} × {d.format} on {PLATFORM_LABEL[d.platform]}
                    </span>
                    <PriorityBadge priority={d.priority} />
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    Draft due {fmtDate(d.draftDue)} · Publish by {fmtDate(d.publishBy)}
                  </p>
                  {d.notes && <p className="mt-1">{d.notes}</p>}
                  <TermComments consignmentId={deal.id} clauseKey={d.key} comments={commentsFor(d.key)} open={open} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Terms by section */}
          {TERM_SECTIONS.map((section) => {
            const terms = c.terms.filter((t) => t.section === section);
            if (!terms.length) return null;
            return (
              <Card key={section}>
                <CardHeader>
                  <CardTitle>{SECTION_LABEL[section]}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {terms.map((t) => (
                    <div key={t.key} id={`clause-${t.key}`} className="scroll-mt-20 rounded-lg border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{t.label}</span>
                        <PriorityBadge priority={t.priority} />
                      </div>
                      <p className="mt-1 whitespace-pre-wrap">{t.text}</p>
                      <TermComments consignmentId={deal.id} clauseKey={t.key} comments={commentsFor(t.key)} open={open} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}

          {/* Tracker after locking */}
          {locked && view.deliverables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Deliverables tracker</CardTitle>
                <CardDescription>Created automatically when the deal locked. Status updates arrive in a later milestone.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {view.deliverables.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span>{d.title}</span>
                    <span className="text-muted-foreground">
                      {d.status.replace("_", " ")}
                      {d.dueAt && ` · due ${d.dueAt.toLocaleDateString("en", { month: "short", day: "numeric" })}`}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Version history */}
        <aside>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Version history</CardTitle>
              <CardDescription>Every version is kept and can never be edited.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-4">
                {[...versions].reverse().map((v) => {
                  const who = acceptances
                    .filter((a) => a.versionNo === v.versionNo && a.contentHash === v.contentHash)
                    .map((a) => people.get(a.userId)?.name ?? "Someone");
                  return (
                    <li key={v.id} className="text-sm">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-medium", v.versionNo === current.versionNo && "text-foreground")}>v{v.versionNo}</span>
                        {v.versionNo === current.versionNo && <span className="text-xs text-muted-foreground">current</span>}
                      </div>
                      <p className="text-muted-foreground">
                        by {people.get(v.createdBy)?.name} · {fmtTime(v.createdAt)}
                      </p>
                      {v.changeNote && <p className="text-muted-foreground">&ldquo;{v.changeNote}&rdquo;</p>}
                      {who.length > 0 && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="size-3.5" /> Accepted by {who.join(" and ")}
                        </p>
                      )}
                      <code className="text-[11px] text-muted-foreground">{v.contentHash.slice(0, 12)}</code>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Info({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}
