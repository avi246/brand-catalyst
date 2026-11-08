"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCheck, FileSignature, MessageCircleQuestion, PenLine, ThumbsUp, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  acceptVersion,
  addClauseComment,
  cancelConsignment,
  markReadyToFinalize,
  requestChanges,
} from "@/lib/actions/consignments";
import { cn } from "@/lib/utils";

/**
 * The main buttons on a proposal, by phase.
 *  Discussion: creator -> Ready to finalize / Decline.  brand -> Prepare contract / Edit terms / Cancel.
 *  Contract:   creator -> Sign / Request changes / Decline.  brand -> Cancel (waiting).
 */
export function DealActions({
  consignmentId,
  versionNo,
  role,
  phase,
  creatorReady,
  signerName,
}: {
  consignmentId: string;
  versionNo: number;
  role: "brand" | "influencer";
  phase: "discussion" | "final";
  creatorReady: boolean;
  signerName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState<null | "accept" | "close" | "changes">(null);
  const [reason, setReason] = useState("");
  const [name, setName] = useState(signerName);
  const [agree, setAgree] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message ?? "Done");
      else toast.error(res.error ?? "Something went wrong");
      setConfirming(null);
      router.refresh();
    });

  const closeLabel = role === "brand" ? "Cancel" : "Decline";

  if (confirming === "close") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {role === "brand" ? "Cancel this proposal for both sides?" : "Decline and end this discussion?"}
        </span>
        <Button variant="destructive" disabled={pending} onClick={() => run(() => cancelConsignment({ consignmentId }))}>
          Yes, {role === "brand" ? "cancel" : "decline"}
        </Button>
        <Button variant="ghost" onClick={() => setConfirming(null)}>
          Keep it
        </Button>
      </div>
    );
  }

  if (confirming === "accept") {
    return (
      <div className="flex w-full flex-col gap-2 lg:w-[26rem]">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" aria-label="Your full name" autoFocus />
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
          I&apos;ve read the whole contract and I agree to sign it.
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(null)}>
            Not yet
          </Button>
          <Button
            disabled={pending || !agree || name.trim().length < 2}
            onClick={() => run(() => acceptVersion({ consignmentId, versionNo, signedName: name }))}
          >
            <PenLine /> Sign contract
          </Button>
        </div>
      </div>
    );
  }

  if (confirming === "changes") {
    return (
      <div className="flex w-full flex-col gap-2 lg:w-[28rem]">
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={1000}
          autoFocus
          placeholder="What needs to change before you can sign?"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(null)}>
            Back
          </Button>
          <Button disabled={pending || reason.trim().length < 3} onClick={() => run(() => requestChanges({ consignmentId, reason }))}>
            <Undo2 /> Send back to discussion
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "final") {
    return role === "influencer" ? (
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setConfirming("accept")}>
          <PenLine /> Sign contract
        </Button>
        <Button variant="outline" onClick={() => setConfirming("changes")}>
          <Undo2 /> Request changes
        </Button>
        <Button variant="ghost" onClick={() => setConfirming("close")}>
          <X /> {closeLabel}
        </Button>
      </div>
    ) : (
      <Button variant="ghost" onClick={() => setConfirming("close")}>
        <X /> {closeLabel}
      </Button>
    );
  }

  // Discussion phase
  return role === "influencer" ? (
    <div className="flex flex-wrap items-center gap-2">
      {creatorReady ? (
        <Button variant="secondary" disabled>
          <CheckCheck /> You&apos;re marked ready
        </Button>
      ) : (
        <Button disabled={pending} onClick={() => run(() => markReadyToFinalize({ consignmentId }))}>
          <CheckCheck /> Ready to finalize
        </Button>
      )}
      <Button variant="ghost" onClick={() => setConfirming("close")}>
        <X /> {closeLabel}
      </Button>
    </div>
  ) : (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={`/deals/${consignmentId}/finalize`} className={cn(buttonVariants({ variant: creatorReady ? "default" : "outline" }))}>
        <FileSignature /> Prepare contract
      </Link>
      <Link href={`/deals/${consignmentId}/revise`} className={cn(buttonVariants({ variant: creatorReady ? "outline" : "default" }))}>
        <PenLine /> Edit terms
      </Link>
      <Button variant="ghost" onClick={() => setConfirming("close")}>
        <X /> {closeLabel}
      </Button>
    </div>
  );
}

export type ThreadComment = {
  id: string;
  author: string;
  mine: boolean;
  isBrand: boolean;
  kind: string;
  body: string;
  at: string;
  earlier: boolean; // written before the brand's latest update
};

/** The comment thread under one term (or the general thread). */
export function TermComments({
  consignmentId,
  clauseKey,
  comments,
  open,
  role,
  prompt,
}: {
  consignmentId: string;
  clauseKey: string;
  comments: ThreadComment[];
  open: boolean;
  role: "brand" | "influencer";
  prompt?: string;
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  const post = (kind: "comment" | "question", text = body) =>
    start(async () => {
      const res = await addClauseComment({ consignmentId, clauseKey, kind, body: text });
      if (!res.ok) return void toast.error(res.error);
      setBody("");
      setShow(false);
      router.refresh();
    });

  if (!open && comments.length === 0) return null;

  // One-click answers for the brand when the creator spoke last in this thread.
  const last = comments.at(-1);
  const quickReply = open && role === "brand" && !show && last && !last.isBrand;

  return (
    <div className="mt-3 flex flex-col gap-2 border-t pt-3">
      {comments.map((c) => (
        <div
          key={c.id}
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            c.isBrand ? "bg-muted/60" : "bg-amber-50 dark:bg-amber-950/30",
            c.earlier && "opacity-70",
          )}
        >
          <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{c.mine ? "You" : c.author}</span>
            {c.kind === "question" && <span className="rounded bg-amber-200/70 px-1 text-amber-900 dark:bg-amber-900 dark:text-amber-100">question</span>}
            <span>· {c.at}</span>
            {c.earlier && <span>· before the last update</span>}
          </div>
          <p className="mt-0.5 whitespace-pre-wrap">{c.body}</p>
        </div>
      ))}

      {quickReply && (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="xs" variant="outline" disabled={pending} onClick={() => post("comment", "Agreed. 👍")}>
            <ThumbsUp /> Agree
          </Button>
          <Button size="xs" variant="outline" disabled={pending} onClick={() => post("comment", "Sorry, we can't do this one.")}>
            <X /> Can&apos;t do this
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setShow(true)}>
            <MessageCircleQuestion /> Reply…
          </Button>
        </div>
      )}

      {open &&
        !quickReply &&
        (show ? (
          <div className="flex flex-col gap-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              maxLength={1000}
              autoFocus
              placeholder={role === "brand" ? "Reply or explain this term" : "Ask about this term or suggest a change"}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShow(false)}>
                Cancel
              </Button>
              {role === "influencer" && (
                <Button size="sm" variant="outline" disabled={pending || !body.trim()} onClick={() => post("question")}>
                  Ask as question
                </Button>
              )}
              <Button size="sm" disabled={pending || !body.trim()} onClick={() => post("comment")}>
                {role === "brand" ? "Reply" : "Comment"}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShow(true)}
            className="flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <MessageCircleQuestion className="size-3.5" />
            {prompt ?? (role === "brand" ? (comments.length ? "Reply" : "Add a note") : "Comment, ask or negotiate")}
          </button>
        ))}
    </div>
  );
}
