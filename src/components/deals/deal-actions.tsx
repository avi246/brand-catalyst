"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, MessageCircleQuestion, PenLine, X } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { acceptVersion, addClauseComment, cancelConsignment } from "@/lib/actions/consignments";
import { cn } from "@/lib/utils";

/**
 * The main buttons on an open consignment.
 * Creator: Accept / Decline. Brand: Edit consignment / Cancel.
 */
export function DealActions({
  consignmentId,
  versionNo,
  role,
  canAccept,
}: {
  consignmentId: string;
  versionNo: number;
  role: "brand" | "influencer";
  canAccept: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState<null | "accept" | "close">(null);

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message ?? "Done");
      else toast.error(res.error ?? "Something went wrong");
      setConfirming(null);
      router.refresh();
    });

  const closeLabel = role === "brand" ? "Cancel consignment" : "Decline consignment";

  if (confirming === "close") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {role === "brand" ? "Cancel this consignment for both sides?" : "Decline and end this discussion?"}
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
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Accepting makes these terms final for both sides.</span>
        <Button disabled={pending} onClick={() => run(() => acceptVersion({ consignmentId, versionNo }))}>
          <Check /> Yes, accept
        </Button>
        <Button variant="ghost" onClick={() => setConfirming(null)}>
          Not yet
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canAccept && (
        <Button onClick={() => setConfirming("accept")}>
          <Check /> Accept consignment
        </Button>
      )}
      {role === "brand" && (
        <Link href={`/deals/${consignmentId}/revise`} className={cn(buttonVariants({ variant: canAccept ? "outline" : "default" }))}>
          <PenLine /> Edit consignment
        </Link>
      )}
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

  const post = (kind: "comment" | "question") =>
    start(async () => {
      const res = await addClauseComment({ consignmentId, clauseKey, kind, body });
      if (!res.ok) return void toast.error(res.error);
      setBody("");
      setShow(false);
      router.refresh();
    });

  if (!open && comments.length === 0) return null;

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

      {open &&
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
