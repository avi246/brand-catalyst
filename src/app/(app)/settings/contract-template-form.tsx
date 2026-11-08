"use client";

import { useMemo, useState, useTransition } from "react";
import { RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { saveContractTemplate } from "@/lib/actions/contract-template";
import { defaultContent } from "@/lib/consignments/schema";
import { DEFAULT_CONTRACT_TEMPLATE, PLACEHOLDERS, renderContract } from "@/lib/contracts/template";

/** Sample proposal used only for the live preview. */
function sampleContent() {
  const c = defaultContent();
  c.overview = { title: "Summer launch", product: "Your product", objective: "Awareness", keyMessage: "" };
  c.fee.amount = 700;
  c.deliverables[0].publishBy = "2026-12-01";
  return c;
}

export function ContractTemplateForm({ brandName, saved }: { brandName: string; saved: string | null }) {
  const [text, setText] = useState(saved ?? DEFAULT_CONTRACT_TEMPLATE);
  const [preview, setPreview] = useState(false);
  const [pending, start] = useTransition();
  const usingSample = text.trim() === DEFAULT_CONTRACT_TEMPLATE.trim();

  const rendered = useMemo(
    () =>
      preview
        ? renderContract(text, {
            brandName,
            creatorName: "Sample Creator",
            creatorHandle: "samplecreator",
            content: sampleContent(),
            effectiveDate: new Date(),
          })
        : "",
    [preview, text, brandName],
  );

  const save = () =>
    start(async () => {
      const res = await saveContractTemplate({ template: text });
      if (res.ok) toast.success(usingSample ? "Using the sample template." : "Contract template saved.");
      else toast.error(res.error);
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Contract template
          {usingSample && <Badge variant="secondary">Sample template</Badge>}
        </CardTitle>
        <CardDescription>
          Paste your company&apos;s standard influencer contract. Every deal&apos;s agreed terms are attached to it as
          &ldquo;Schedule A&rdquo;, and Gemini warns you when the template contradicts what you agreed. The sample is not legal
          advice: have your lawyer review whatever you use.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-1.5 text-xs">
          <span className="text-muted-foreground">Placeholders you can use:</span>
          {PLACEHOLDERS.map((p) => (
            <code key={p.key} title={p.help} className="rounded bg-muted px-1.5 py-0.5">
              {`{{${p.key}}}`}
            </code>
          ))}
        </div>

        {preview ? (
          <pre className="max-h-[32rem] overflow-y-auto rounded-lg border bg-background p-4 font-serif text-sm whitespace-pre-wrap">
            {rendered}
          </pre>
        ) : (
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={18}
            className="font-mono text-xs"
            aria-label="Contract template"
          />
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={pending}>
            <Save /> Save template
          </Button>
          <Button variant="outline" onClick={() => setPreview((p) => !p)}>
            {preview ? "Back to editing" : "Preview with sample deal"}
          </Button>
          <Button variant="ghost" onClick={() => setText(DEFAULT_CONTRACT_TEMPLATE)} disabled={usingSample}>
            <RotateCcw /> Reset to sample
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
