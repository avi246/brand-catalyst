"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, PenLine, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { checkTemplateConflicts, previewContract, sendFinalAgreement } from "@/lib/actions/consignments";
import type { ContractIssue } from "@/lib/ai/conflicts";
import type { ConsignmentContent, ResolutionItem } from "@/lib/consignments/schema";

/** Step 2 of preparing the contract: preview the full text, see Gemini's conflict check, sign and send. */
export function ContractReview({
  consignmentId,
  baseVersion,
  content,
  resolution,
  creatorName,
  defaultSigner,
  onBack,
}: {
  consignmentId: string;
  baseVersion: number;
  content: ConsignmentContent;
  resolution: ResolutionItem[];
  creatorName: string;
  defaultSigner: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const [text, setText] = useState<string | null>(null);
  const [issues, setIssues] = useState<ContractIssue[] | null>(null);
  const [usingSample, setUsingSample] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [name, setName] = useState(defaultSigner);
  const [agree, setAgree] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    let cancelled = false;
    previewContract({ consignmentId, content }).then((res) => {
      if (cancelled) return;
      if (res.ok) setText(res.text);
      else toast.error(res.error);
    });
    checkTemplateConflicts({ content }).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setIssues(res.issues);
        setUsingSample(res.usingSample);
      } else setCheckError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [consignmentId, content]);

  const sign = () =>
    start(async () => {
      const res = await sendFinalAgreement({ consignmentId, baseVersion, content, resolution, signedName: name });
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message ?? "Sent");
      router.push(`/deals/${consignmentId}`);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" className="w-fit" onClick={onBack}>
        <ArrowLeft /> Back to editing the terms
      </Button>

      {/* Gemini conflict check */}
      <Card className={issues?.length ? "border-amber-300 dark:border-amber-900" : undefined}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" /> Template check
          </CardTitle>
          <CardDescription>
            Gemini compares your {usingSample ? "sample" : ""} contract template with the agreed terms. Schedule A prevails over
            the template, but contradictions confuse both sides, so fix them where you can.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {issues === null && !checkError && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Gemini is reading your template…
            </p>
          )}
          {checkError && <p className="text-muted-foreground">{checkError} You can still sign.</p>}
          {issues?.length === 0 && (
            <p className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-4" /> No contradictions between your template and the agreed terms.
            </p>
          )}
          {issues?.map((i, n) => (
            <div key={n} className="rounded-lg border border-amber-300 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/20">
              <p className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className="size-4 text-amber-700 dark:text-amber-400" />
                {i.kind === "conflict" ? "Contradiction" : "Not covered by the agreed terms"}
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">Template:</span> {i.templateSays}
              </p>
              <p>
                <span className="text-muted-foreground">Agreed terms:</span> {i.agreedTerm}
              </p>
              <p className="mt-1 text-muted-foreground">{i.explanation}</p>
            </div>
          ))}
          {!!issues?.length && (
            <p className="text-xs text-muted-foreground">
              To fix: edit the terms (Back), or update your template in Settings → Contract template.
            </p>
          )}
        </CardContent>
      </Card>

      {/* The full contract */}
      <Card>
        <CardHeader>
          <CardTitle>Contract preview</CardTitle>
          <CardDescription>
            Exactly what {creatorName} will read and sign: your template with the agreed terms attached as Schedule A.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {text ? (
            <pre className="max-h-[36rem] overflow-y-auto rounded-lg border bg-background p-6 font-serif text-sm leading-relaxed whitespace-pre-wrap">
              {text}
            </pre>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Building the contract…
            </p>
          )}
        </CardContent>
      </Card>

      {/* Signature */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenLine className="size-4" /> Sign and send
          </CardTitle>
          <CardDescription>
            Your typed name, the time and a fingerprint of this exact text are recorded. {creatorName} then reads and signs.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" aria-label="Your full name" className="max-w-sm" />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
            I&apos;ve read this contract and I sign it on behalf of my brand.
          </label>
          <Button className="w-fit" disabled={pending || !text || !agree || name.trim().length < 2} onClick={sign}>
            {pending ? <Loader2 className="animate-spin" /> : <PenLine />} Sign and send to {creatorName}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
