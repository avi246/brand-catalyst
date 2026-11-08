"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, FileText, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ConsignmentEditor } from "@/components/deals/consignment-editor";
import { ResolutionList } from "@/components/deals/resolution-list";
import { ContractReview } from "./contract-review";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prepareFinalDraft } from "@/lib/actions/consignments";
import type { ConsignmentContent, ResolutionItem } from "@/lib/consignments/schema";

type Draft = { content: ConsignmentContent; resolution: ResolutionItem[]; source: "ai" | "manual"; id: number };

/** Strips priorities: the final agreement is all binding. */
function asFinal(c: ConsignmentContent): ConsignmentContent {
  return {
    ...c,
    fee: { ...c.fee, priority: "mandatory" },
    deliverables: c.deliverables.map((d) => ({ ...d, priority: "mandatory" })),
    terms: c.terms.map((t) => ({ ...t, priority: "mandatory" })),
  };
}

export function FinalizeWorkspace({
  consignmentId,
  baseVersion,
  current,
  creatorName,
  commentCount,
  commentText,
  aiAvailable,
  signerName,
}: {
  consignmentId: string;
  baseVersion: number;
  current: ConsignmentContent;
  creatorName: string;
  commentCount: number;
  commentText: Record<string, { author: string; body: string }>;
  aiAvailable: boolean;
  signerName: string;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  // Step 2: the reviewed terms, shown as the full contract to sign.
  const [reviewing, setReviewing] = useState<ConsignmentContent | null>(null);
  const [includeChat, setIncludeChat] = useState(true);
  const [settled, setSettled] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [pending, start] = useTransition();

  const runAi = () =>
    start(async () => {
      const res = await prepareFinalDraft({ consignmentId, includeChat, brandInstructions: instructions });
      if (!res.ok) return void toast.error(res.error);
      setSettled(false);
      setDraft({ content: res.content, resolution: res.resolution, source: "ai", id: Date.now() });
      toast.success("Draft ready. Review it below before sending.");
    });

  const manual = () => {
    setSettled(true);
    setDraft({ content: asFinal(current), resolution: [], source: "manual", id: Date.now() });
  };

  const unresolved = draft?.resolution.filter((r) => r.outcome === "unresolved") ?? [];

  if (draft && reviewing) {
    return (
      <ContractReview
        consignmentId={consignmentId}
        baseVersion={baseVersion}
        content={reviewing}
        resolution={draft.resolution}
        creatorName={creatorName}
        defaultSigner={signerName}
        onBack={() => {
          // Keep the edits: reopen the editor with the reviewed terms.
          setDraft({ ...draft, content: reviewing, id: Date.now() });
          setReviewing(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4" /> {draft ? "Start over" : "How do you want to start?"}
          </CardTitle>
          <CardDescription>
            Gemini reads the current terms, all {commentCount} comment{commentCount === 1 ? "" : "s"} and your decisions below,
            writes definite terms, and notes how each point was settled. It never sends anything: you review it first.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="instructions" className="text-sm font-medium">
              Your decisions <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder={`Tell Gemini what you've decided, in plain English. For example:\nAccept her fee of $700. Reposting rights 1 month. Exclusivity only covers sunscreen brands. Ask her to tag @yourbrand.`}
            />
            <p className="text-xs text-muted-foreground">
              Gemini applies these and labels them &ldquo;Brand&apos;s decision&rdquo;, so {creatorName} can see which points you
              decided and which you both agreed in comments. They can still accept, request changes or decline.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeChat} onChange={(e) => setIncludeChat(e.target.checked)} />
            Also read our chat messages with {creatorName}
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={runAi} disabled={pending || !aiAvailable}>
              {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {pending ? "Gemini is drafting…" : "Draft with Gemini"}
            </Button>
            <Button variant="outline" onClick={manual} disabled={pending}>
              <FileText /> Write it myself from the current terms
            </Button>
          </div>
          {!aiAvailable && <p className="text-xs text-muted-foreground">Gemini is not configured on this server.</p>}
        </CardContent>
      </Card>

      {draft && (
        <>
          {draft.source === "ai" && (
            <Card>
              <CardHeader>
                <CardTitle>How Gemini settled the discussion</CardTitle>
                <CardDescription>Check each point against the comments it came from. Edit anything below.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <ResolutionList items={draft.resolution} commentText={commentText} />
                {unresolved.length > 0 && (
                  <label className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />
                    <span className="flex-1">
                      {unresolved.length} point{unresolved.length === 1 ? " is" : "s are"} still open. Settle them in the terms
                      below (or with {creatorName} first), then confirm.
                    </span>
                    <input type="checkbox" checked={settled} onChange={(e) => setSettled(e.target.checked)} aria-label="I've settled the open points" />
                  </label>
                )}
              </CardContent>
            </Card>
          )}

          <ConsignmentEditor
            key={draft.id}
            initial={draft.content}
            mode={{ kind: "final", consignmentId, baseVersion, resolution: draft.resolution }}
            otherName={creatorName}
            blockedReason={unresolved.length > 0 && !settled ? "Confirm you've settled the open points above before continuing." : undefined}
            onReview={(c) => {
              setReviewing(c);
              window.scrollTo({ top: 0 });
            }}
          />
        </>
      )}
    </div>
  );
}
