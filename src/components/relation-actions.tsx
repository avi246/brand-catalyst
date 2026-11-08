"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Clock, MessageSquare, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { respondToInvitation, sendInvitation, type ActionResult } from "@/lib/actions/connections";
import { cn } from "@/lib/utils";

export type RelationStateProp =
  | { kind: "none" }
  | { kind: "sent"; connectionId: string }
  | { kind: "received"; connectionId: string }
  | { kind: "connected"; connectionId: string };

function report(res: ActionResult) {
  if (res.ok) toast.success(res.message ?? "Done");
  else toast.error(res.error);
}

/**
 * The single place that decides what you can do with another account:
 * invite, wait, accept/decline, or message. `withNote` shows an optional note box.
 */
export function RelationActions({
  otherUserId,
  otherName,
  state,
  withNote = false,
  size = "default",
}: {
  otherUserId: string;
  otherName: string;
  state: RelationStateProp;
  withNote?: boolean;
  size?: "sm" | "default";
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  const run = (fn: () => Promise<ActionResult>) => startTransition(async () => report(await fn()));

  if (state.kind === "connected") {
    return (
      <Link href="/messages" className={cn(buttonVariants({ variant: "outline", size }))}>
        <MessageSquare /> Message
      </Link>
    );
  }

  if (state.kind === "sent") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size={size} disabled>
          <Clock /> Invitation sent
        </Button>
        <Button
          variant="ghost"
          size={size}
          disabled={pending}
          onClick={() => run(() => respondToInvitation({ connectionId: state.connectionId, action: "withdraw" }))}
        >
          Withdraw
        </Button>
      </div>
    );
  }

  if (state.kind === "received") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size={size}
          disabled={pending}
          onClick={() => run(() => respondToInvitation({ connectionId: state.connectionId, action: "accept" }))}
        >
          <Check /> Accept
        </Button>
        <Button
          variant="outline"
          size={size}
          disabled={pending}
          onClick={() => run(() => respondToInvitation({ connectionId: state.connectionId, action: "decline" }))}
        >
          <X /> Decline
        </Button>
      </div>
    );
  }

  if (withNote && showNote) {
    return (
      <form
        className="flex w-full flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => sendInvitation({ toUserId: otherUserId, note }));
        }}
      >
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder={`Say why you'd like to work with ${otherName} (optional)`}
          aria-label="Invitation note"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size={size} onClick={() => setShowNote(false)}>
            Cancel
          </Button>
          <Button type="submit" size={size} disabled={pending}>
            <Send /> {pending ? "Sending…" : "Send invitation"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <Button
      size={size}
      disabled={pending}
      onClick={() =>
        withNote ? setShowNote(true) : run(() => sendInvitation({ toUserId: otherUserId }))
      }
    >
      <Send /> {pending ? "Sending…" : "Invite"}
    </Button>
  );
}
