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

export function DealActions({
  consignmentId,
  versionNo,
  canAccept,
  role,
}: {
  consignmentId: string;
  versionNo: number;
  canAccept: boolean;
  role: "brand" | "influencer";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message ?? "Done");
      else toast.error(res.error ?? "Something went wrong");
      router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canAccept && (
        <Button disabled={pending} onClick={() => run(() => acceptVersion({ consignmentId, versionNo }))}>
          <Check /> Accept v{versionNo}
        </Button>
      )}
      <Link href={`/deals/${consignmentId}/revise`} className={cn(buttonVariants({ variant: "outline" }))}>
        <PenLine /> Propose changes
      </Link>
      {confirmCancel ? (
        <>
          <Button variant="destructive" disabled={pending} onClick={() => run(() => cancelConsignment({ consignmentId }))}>
            Yes, {role === "brand" ? "cancel deal" : "decline deal"}
          </Button>
          <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
            Keep it
          </Button>
        </>
      ) : (
        <Button variant="ghost" onClick={() => setConfirmCancel(true)}>
          <X /> {role === "brand" ? "Cancel" : "Decline"}
        </Button>
      )}
    </div>
  );
}

/** Comments and questions on one term; only shown while the deal is open. */
export function TermComments({
  consignmentId,
  clauseKey,
  comments,
  open,
}: {
  consignmentId: string;
  clauseKey: string;
  comments: { id: string; author: string; mine: boolean; kind: string; body: string; at: string }[];
  open: boolean;
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
    <div className="mt-2 flex flex-col gap-2">
      {comments.map((c) => (
        <div key={c.id} className={cn("rounded-md px-3 py-2 text-sm", c.mine ? "bg-primary/5" : "bg-muted/60")}>
          <span className="font-medium">{c.author}</span>
          {c.kind === "question" && <span className="ml-1 text-xs text-amber-700 dark:text-amber-300">asked</span>}
          <span className="text-muted-foreground"> · {c.at}</span>
          <p className="mt-0.5">{c.body}</p>
        </div>
      ))}
      {open &&
        (show ? (
          <div className="flex flex-col gap-2">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} maxLength={1000} placeholder="Ask for clarification or suggest a change" />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShow(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="outline" disabled={pending || !body.trim()} onClick={() => post("question")}>
                Ask a question
              </Button>
              <Button size="sm" disabled={pending || !body.trim()} onClick={() => post("comment")}>
                Comment
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShow(true)}
            className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <MessageCircleQuestion className="size-3.5" /> Comment or ask
          </button>
        ))}
    </div>
  );
}
