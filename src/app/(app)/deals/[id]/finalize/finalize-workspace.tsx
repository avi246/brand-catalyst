"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, FileText, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ConsignmentEditor } from "@/components/deals/consignment-editor";
import { ResolutionList } from "@/components/deals/resolution-list";
import { Button } from "@/components/ui/button";
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
}: {
  consignmentId: string;
  baseVersion: number;
  current: ConsignmentContent;
  creatorName: string;
  commentCount: number;
  commentText: Record<string, { author: string; body: string }>;
  aiAvailable: boolean;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [includeChat, setIncludeChat] = useState(true);
  const [settled, setSettled] = useState(false);
  const [pending, start] = useTransition();

  const runAi = () =>
    start(async () => {
      const res = await prepareFinalDraft({ consignmentId, includeChat });
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

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4" /> {draft ? "Start over" : "How do you want to start?"}
          </CardTitle>
          <CardDescription>
            Gemini reads the current terms and all {commentCount} comment{commentCount === 1 ? "" : "s"}, writes definite
            terms, and notes how each point was settled. It never sends anything: you review it first.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
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
            blockedReason={unresolved.length > 0 && !settled ? "Confirm you've settled the open points above before sending." : undefined}
          />
        </>
      )}
    </div>
  );
}
