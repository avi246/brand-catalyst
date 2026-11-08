import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, CheckCircle2, FilePlus2, Lock, MessageSquare, Sparkles } from "lucide-react";
import { DealActions, TermComments, type ThreadComment } from "@/components/deals/deal-actions";
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
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("en", { month: "short", day: "numeric" }) : "Not set";
const fmtTime = (d: Date) => d.toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * One consignment. Users always see the CURRENT terms only.
 * If the brand edited it, a "What changed" box shows the last update.
 * Negotiation happens in comment threads under each term.
 */
export default async function DealPage({ params }: PageProps<"/deals/[id]">) {
  const me = await requireUser();
  const { id } = await params;
  const view = await getDealForUser(id, me.id);
  if (!view) notFound();

  const { deal, current, versions, acceptances, comments, people, brand, creator, role } = view;
  const c = current.content;
  const open = deal.status === "sent" || deal.status === "negotiating";
  const accepted = deal.status === "final" || deal.status === "in_progress" || deal.status === "completed";
  const closed = deal.status === "cancelled";

  const myAcceptance = acceptances.some(
    (a) => a.userId === me.id && a.versionNo === current.versionNo && a.contentHash === current.contentHash,
  );
  const previous = versions.find((v) => v.versionNo === current.versionNo - 1);
  const changes = previous ? diffContent(previous.content, c) : [];

  /* ---------- comments ---------- */
  const toThread = (x: (typeof comments)[number]): ThreadComment => ({
    id: x.id,
    author: people.get(x.userId)?.name ?? "Someone",
    mine: x.userId === me.id,
    isBrand: x.userId === brand.id,
    kind: x.kind,
    body: x.body,
    at: fmtTime(x.createdAt),
    earlier: x.versionNo < current.versionNo,
  });
  const threadFor = (key: string) => comments.filter((x) => x.clauseKey === key).map(toThread);
  const labelFor = (key: string) => {
    if (key === "general") return "the whole consignment";
    if (key === "fee") return "Compensation";
    const d = c.deliverables.find((x) => x.key === key);
    if (d) return `${d.quantity} × ${d.format}`;
    return c.terms.find((x) => x.key === key)?.label ?? "a removed term";
  };
  const creatorComments = comments.filter((x) => x.userId === creator.id);
  const newFromCreator = creatorComments.filter((x) => x.versionNo === current.versionNo);
  const openQuestions = newFromCreator.filter((x) => x.kind === "question").length;

  /* ---------- the one sentence that says where things stand ---------- */
  const status = (() => {
    if (accepted) {
      return {
        tone: "done" as const,
        title: `Accepted by ${creator.name}${deal.finalizedAt ? ` on ${fmtTime(deal.finalizedAt)}` : ""}.`,
        body: "These terms are final for both sides and can't be changed.",
      };
    }
    if (closed) {
      return {
        tone: "closed" as const,
        title: "This consignment was closed.",
        body:
          role === "brand"
            ? "Nothing here is binding. You're still connected, so you can send a fresh consignment."
            : "Nothing here is binding. The brand can send you a fresh consignment.",
      };
    }
    if (role === "influencer") {
      return {
        tone: "you" as const,
        title: changes.length
          ? `${brand.name} updated the consignment. Review what changed, then accept or decline.`
          : `${brand.name} sent you this consignment.`,
        body: "Comment or ask under any term to negotiate. Accept when you're happy with every term.",
      };
    }
    return {
      tone: newFromCreator.length ? ("you" as const) : ("waiting" as const),
      title: newFromCreator.length
        ? `${creator.name} left ${newFromCreator.length} comment${newFromCreator.length === 1 ? "" : "s"}${openQuestions ? ` (${openQuestions} question${openQuestions === 1 ? "" : "s"})` : ""}. Reply, or edit the consignment.`
        : `Waiting for ${creator.name} to accept or comment.`,
      body: "When you edit, they'll see exactly what changed before accepting.",
    };
  })();

  const steps = [
    { label: "Sent", done: true },
    { label: "In discussion", done: deal.status !== "sent" || comments.length > 0 },
    { label: closed ? "Closed" : "Accepted", done: accepted || closed },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/collaborations" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Collaborations
      </Link>

      {/* ------------------------------ Header ------------------------------ */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{c.overview.title}</h1>
            <DealStatusBadge status={deal.status} />
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

      {/* ------------------------------ Progress + status + actions ------------------------------ */}
      <Card
        className={cn(
          status.tone === "done" && "border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20",
          status.tone === "you" && "border-primary/30 bg-primary/5",
        )}
      >
        <CardContent className="flex flex-col gap-4">
          <ol className="flex items-center gap-2 text-xs" aria-label="Progress">
            {steps.map((s, i) => (
              <li key={s.label} className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium",
                    s.done ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                  )}
                >
                  {s.done ? <CheckCircle2 className="size-3.5" /> : <span className="size-3.5 rounded-full border" />}
                  {s.label}
                </span>
                {i < steps.length - 1 && <span className="h-px w-6 bg-border" />}
              </li>
            ))}
          </ol>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              {status.tone === "done" ? (
                <Lock className="mt-0.5 size-5 shrink-0 text-emerald-700" />
              ) : status.tone === "closed" ? (
                <Ban className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              ) : null}
              <div className="text-sm">
                <p className="font-medium">{status.title}</p>
                <p className="text-muted-foreground">{status.body}</p>
                {accepted && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Agreement fingerprint <code className="rounded bg-muted px-1">{current.contentHash.slice(0, 12)}</code>, the
                    unique code of the exact terms both sides agreed to.
                  </p>
                )}
              </div>
            </div>
            {closed && role === "brand" && (
              <Link href={`/deals/new?connection=${deal.connectionId}`} className={cn(buttonVariants())}>
                <FilePlus2 /> Start a new consignment
              </Link>
            )}
            {open && (
              <DealActions
                consignmentId={deal.id}
                versionNo={current.versionNo}
                role={role}
                canAccept={!myAcceptance}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        {/* ------------------------------ Main column: the terms ------------------------------ */}
        <div className="flex flex-col gap-6">
          {changes.length > 0 && (
            <Card className="border-sky-200 dark:border-sky-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="size-4 text-sky-600" /> What changed in the last update
                </CardTitle>
                <CardDescription>
                  {people.get(current.createdBy)?.name} updated the consignment {fmtTime(current.createdAt)}
                  {current.changeNote && <> · &ldquo;{current.changeNote}&rdquo;</>}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {changes.map((ch, i) => (
                  <div key={i} className="grid gap-1 rounded-lg border p-3 text-sm sm:grid-cols-[10rem_1fr]">
                    <div>
                      <span className="font-medium">{ch.label}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">{ch.kind}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {ch.before && (
                        <p className="rounded bg-rose-50 px-2 py-1 text-rose-900 line-through decoration-rose-400 dark:bg-rose-950/40 dark:text-rose-200">
                          {ch.before}
                        </p>
                      )}
                      {ch.after && (
                        <p className="rounded bg-emerald-50 px-2 py-1 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                          {ch.after}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
              <Info label="Product">{c.overview.product}</Info>
              <Info label="Objective">{c.overview.objective || "—"}</Info>
              <Info label="Key message">{c.overview.keyMessage || "—"}</Info>
            </CardContent>
          </Card>

          <Card id="clause-fee" className="scroll-mt-20">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle>Compensation</CardTitle>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {c.fee.amount.toLocaleString("en", { style: "currency", currency: c.fee.currency, maximumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {c.fee.schedule}
                  {c.fee.giftedProduct && " · plus gifted product"}
                </p>
              </div>
              <PriorityBadge priority={c.fee.priority} />
            </CardHeader>
            <CardContent>
              <TermComments consignmentId={deal.id} clauseKey="fee" comments={threadFor("fee")} open={open} role={role} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deliverables</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {c.deliverables.map((d) => (
                <div key={d.key} id={`clause-${d.key}`} className="scroll-mt-20 rounded-lg border p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {d.quantity} × {d.format} on {PLATFORM_LABEL[d.platform]}
                      </p>
                      <p className="text-muted-foreground">
                        Draft due {fmtDate(d.draftDue)} · Publish by {fmtDate(d.publishBy)}
                      </p>
                      {d.notes && <p className="mt-1">{d.notes}</p>}
                    </div>
                    <PriorityBadge priority={d.priority} />
                  </div>
                  <TermComments consignmentId={deal.id} clauseKey={d.key} comments={threadFor(d.key)} open={open} role={role} />
                </div>
              ))}
            </CardContent>
          </Card>

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
                    <div key={t.key} id={`clause-${t.key}`} className="scroll-mt-20 rounded-lg border p-4 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-medium">{t.label}</p>
                        <PriorityBadge priority={t.priority} />
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{t.text}</p>
                      <TermComments consignmentId={deal.id} clauseKey={t.key} comments={threadFor(t.key)} open={open} role={role} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}

          {accepted && view.deliverables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Deliverables tracker</CardTitle>
                <CardDescription>Created when the consignment was accepted. Status updates arrive in a later milestone.</CardDescription>
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

        {/* ------------------------------ Side column: discussion ------------------------------ */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Discussion</CardTitle>
              <CardDescription>Latest comments on any term. Click one to jump to it.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {comments.filter((x) => x.clauseKey !== "general").length === 0 && (
                <p className="text-sm text-muted-foreground">No comments on terms yet.</p>
              )}
              {[...comments]
                .filter((x) => x.clauseKey !== "general")
                .reverse()
                .slice(0, 6)
                .map((x) => (
                  <a
                    key={x.id}
                    href={`#clause-${x.clauseKey}`}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm hover:border-foreground/30",
                      x.userId !== me.id && x.versionNo === current.versionNo && "border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20",
                    )}
                  >
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{x.userId === me.id ? "You" : people.get(x.userId)?.name}</span>{" "}
                      {x.kind === "question" ? "asked about" : "on"} {labelFor(x.clauseKey)}
                    </p>
                    <p className="line-clamp-2">{x.body}</p>
                  </a>
                ))}
            </CardContent>
          </Card>

          <Card id="clause-general" className="scroll-mt-20">
            <CardHeader>
              <CardTitle className="text-base">General</CardTitle>
              <CardDescription>Anything about the consignment as a whole.</CardDescription>
            </CardHeader>
            <CardContent>
              <TermComments
                consignmentId={deal.id}
                clauseKey="general"
                comments={threadFor("general")}
                open={open}
                role={role}
                prompt="Write a general comment"
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}
