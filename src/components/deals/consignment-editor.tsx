"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/form-field";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createConsignment, sendFinalAgreement, updateConsignment } from "@/lib/actions/consignments";
import {
  PRIORITIES,
  PRIORITY_LABEL,
  SECTION_LABEL,
  TERM_SECTIONS,
  type ConsignmentContent,
  type Deliverable,
  type Priority,
  type ResolutionItem,
  type Term,
} from "@/lib/consignments/schema";
import { NumberInput } from "@/components/number-input";
import { PLATFORM_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Mode =
  | { kind: "create"; connectionId: string }
  | { kind: "revise"; consignmentId: string; baseVersion: number }
  // The clean final agreement: no priorities, sent for the creator to accept.
  | { kind: "final"; consignmentId: string; baseVersion: number; resolution: ResolutionItem[] };

const newKey = (prefix: string) => `${prefix}${crypto.randomUUID().slice(0, 8)}`;

export function ConsignmentEditor({
  initial,
  mode,
  otherName,
  blockedReason,
  onReview,
}: {
  initial: ConsignmentContent;
  mode: Mode;
  otherName: string;
  /** When set, the send button is disabled and this explains why. */
  blockedReason?: string;
  /** Final mode: instead of sending, hand the terms to the contract review step. */
  onReview?: (content: ConsignmentContent) => void;
}) {
  const isFinal = mode.kind === "final";
  const router = useRouter();
  const [c, setC] = useState<ConsignmentContent>(initial);
  const [changeNote, setChangeNote] = useState("");
  const [pending, startTransition] = useTransition();

  const setOverview = (patch: Partial<ConsignmentContent["overview"]>) =>
    setC((x) => ({ ...x, overview: { ...x.overview, ...patch } }));
  const setFee = (patch: Partial<ConsignmentContent["fee"]>) => setC((x) => ({ ...x, fee: { ...x.fee, ...patch } }));
  const setDeliverable = (key: string, patch: Partial<Deliverable>) =>
    setC((x) => ({ ...x, deliverables: x.deliverables.map((d) => (d.key === key ? { ...d, ...patch } : d)) }));
  const setTerm = (key: string, patch: Partial<Term>) =>
    setC((x) => ({ ...x, terms: x.terms.map((t) => (t.key === key ? { ...t, ...patch } : t)) }));

  const submit = () =>
    startTransition(async () => {
      if (mode.kind === "create") {
        const res = await createConsignment({ connectionId: mode.connectionId, content: c });
        if (!res.ok) return void toast.error(res.error);
        toast.success(res.message ?? "Sent");
        router.push(`/deals/${res.id}`);
      } else if (mode.kind === "final" && onReview) {
        onReview(c);
        return;
      } else if (mode.kind === "final") {
        const res = await sendFinalAgreement({
          signedName: "",
          consignmentId: mode.consignmentId,
          baseVersion: mode.baseVersion,
          content: c,
          resolution: mode.resolution,
        });
        if (!res.ok) return void toast.error(res.error);
        toast.success(res.message ?? "Sent");
        router.push(`/deals/${mode.consignmentId}`);
      } else {
        const res = await updateConsignment({
          consignmentId: mode.consignmentId,
          baseVersion: mode.baseVersion,
          content: c,
          changeNote,
        });
        if (!res.ok) return void toast.error(res.error);
        toast.success(res.message ?? "Sent");
        router.push(`/deals/${mode.consignmentId}`);
      }
      router.refresh();
    });

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>What the campaign is about.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Campaign title" name="title">
            <Input id="title" value={c.overview.title} onChange={(e) => setOverview({ title: e.target.value })} placeholder="Summer SPF launch" required />
          </Field>
          <Field label="Product or service" name="product">
            <Input id="product" value={c.overview.product} onChange={(e) => setOverview({ product: e.target.value })} placeholder="Lumen Daily SPF 50" required />
          </Field>
          <Field label="Objective" name="objective" hint="Optional">
            <Input id="objective" value={c.overview.objective} onChange={(e) => setOverview({ objective: e.target.value })} placeholder="Awareness among US Gen Z" />
          </Field>
          <Field label="Key message" name="keyMessage" hint="Optional">
            <Input id="keyMessage" value={c.overview.keyMessage} onChange={(e) => setOverview({ keyMessage: e.target.value })} placeholder="Sunscreen that feels like nothing" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle>Compensation</CardTitle>
            <CardDescription>The total fee and how it&apos;s paid.</CardDescription>
          </div>
          {!isFinal && (
            <div className="w-44 shrink-0">
              <PrioritySelect value={c.fee.priority} onChange={(priority) => setFee({ priority })} />
            </div>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-[1fr_6rem_2fr]">
          <Field label="Fee" name="fee">
            <NumberInput id="fee" value={c.fee.amount} max={10_000_000} onValueChange={(amount) => setFee({ amount })} />
          </Field>
          <Field label="Currency" name="currency">
            <NativeSelect id="currency" value={c.fee.currency} onChange={(e) => setFee({ currency: e.target.value })}>
              {["USD", "CAD", "GBP", "EUR", "INR", "AUD"].map((x) => <option key={x}>{x}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Payment schedule" name="schedule">
            <Input id="schedule" value={c.fee.schedule} onChange={(e) => setFee({ schedule: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-3">
            <input type="checkbox" checked={c.fee.giftedProduct} onChange={(e) => setFee({ giftedProduct: e.target.checked })} />
            Product is gifted in addition to the fee
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle>Deliverables</CardTitle>
            <CardDescription>Exactly what will be posted, and when.</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setC((x) => ({
                ...x,
                deliverables: [
                  ...x.deliverables,
                  { key: newKey("d"), platform: "instagram", format: "Story", quantity: 1, draftDue: null, publishBy: null, notes: "", priority: "mandatory" },
                ],
              }))
            }
          >
            <Plus /> Add deliverable
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {c.deliverables.map((d) => (
            <div key={d.key} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <Field label="Platform" name={`${d.key}-platform`}>
                <NativeSelect
                  id={`${d.key}-platform`}
                  value={d.platform}
                  onChange={(e) => setDeliverable(d.key, { platform: e.target.value as Deliverable["platform"] })}
                >
                  {(["instagram", "youtube", "tiktok", "other"] as const).map((p) => (
                    <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Format" name={`${d.key}-format`}>
                <Input id={`${d.key}-format`} value={d.format} onChange={(e) => setDeliverable(d.key, { format: e.target.value })} placeholder="Reel" />
              </Field>
              <Field label="Count" name={`${d.key}-qty`}>
                <NumberInput
                  id={`${d.key}-qty`}
                  value={d.quantity}
                  min={1}
                  max={50}
                  onValueChange={(quantity) => setDeliverable(d.key, { quantity })}
                />
              </Field>
              <Field label="Draft due" name={`${d.key}-draft`}>
                <Input id={`${d.key}-draft`} type="date" value={d.draftDue ?? ""} onChange={(e) => setDeliverable(d.key, { draftDue: e.target.value || null })} />
              </Field>
              <Field label="Publish by" name={`${d.key}-pub`}>
                <Input id={`${d.key}-pub`} type="date" value={d.publishBy ?? ""} onChange={(e) => setDeliverable(d.key, { publishBy: e.target.value || null })} />
              </Field>
              {!isFinal && (
                <Field label="Priority" name={`${d.key}-prio`}>
                  <PrioritySelect value={d.priority} onChange={(priority) => setDeliverable(d.key, { priority })} />
                </Field>
              )}
              <Field label="Notes" name={`${d.key}-notes`} className="sm:col-span-1 lg:col-span-2 xl:col-span-5">
                <Input id={`${d.key}-notes`} value={d.notes} onChange={(e) => setDeliverable(d.key, { notes: e.target.value })} placeholder="30–45 seconds, show the product on skin" />
              </Field>
              <div className="flex items-end justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={c.deliverables.length === 1}
                  onClick={() => setC((x) => ({ ...x, deliverables: x.deliverables.filter((y) => y.key !== d.key) }))}
                  aria-label="Remove deliverable"
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle>Terms</CardTitle>
            <CardDescription>
              {isFinal ? (
                "Write each term as a definite commitment. These become Schedule A of the contract."
              ) : (
                <>
              Mark each term <strong>Mandatory</strong> (non-negotiable), <strong>Negotiable</strong> (open to discussion) or{" "}
              <strong>Preferred</strong> (nice to have).
                </>
              )}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setC((x) => ({
                ...x,
                terms: [...x.terms, { key: newKey("t"), section: "other", label: "", text: "", priority: isFinal ? "mandatory" : "negotiable" }],
              }))
            }
          >
            <Plus /> Add term
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {c.terms.length === 0 && <p className="text-sm text-muted-foreground">No extra terms.</p>}
          {c.terms.map((t) => (
            <div key={t.key} className="flex flex-col gap-3 rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <NativeSelect
                  value={t.section}
                  onChange={(e) => setTerm(t.key, { section: e.target.value as Term["section"] })}
                  aria-label="Section"
                  className="w-60"
                >
                  {TERM_SECTIONS.map((s) => <option key={s} value={s}>{SECTION_LABEL[s]}</option>)}
                </NativeSelect>
                {!isFinal && <PrioritySelect value={t.priority} onChange={(priority) => setTerm(t.key, { priority })} />}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setC((x) => ({ ...x, terms: x.terms.filter((y) => y.key !== t.key) }))}
                  aria-label="Remove term"
                >
                  <Trash2 /> Remove
                </Button>
              </div>
              <Input value={t.label} onChange={(e) => setTerm(t.key, { label: e.target.value })} placeholder="Term name, e.g. Usage rights" aria-label="Term name" />
              <Textarea value={t.text} onChange={(e) => setTerm(t.key, { text: e.target.value })} rows={2} placeholder="What exactly is agreed" aria-label="Term text" />
            </div>
          ))}
        </CardContent>
      </Card>

      {mode.kind === "revise" && (
        <Card>
          <CardContent>
            <Field label={`Note to ${otherName} about this update`} name="changeNote" hint="Optional">
              <Input id="changeNote" value={changeNote} onChange={(e) => setChangeNote(e.target.value)} maxLength={300} placeholder="Raised the fee to match two reels" />
            </Field>
          </CardContent>
        </Card>
      )}

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t bg-background/90 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <p className={cn("hidden text-xs sm:block", blockedReason ? "font-medium text-amber-800 dark:text-amber-300" : "text-muted-foreground")}>
          {blockedReason ??
            (mode.kind === "create"
              ? `${otherName} can comment on each term. When you're both happy, you'll send the contract to sign.`
              : mode.kind === "final"
                ? "Next: preview the full contract (your template + these terms), check for conflicts, and sign."
                : `${otherName} will see exactly what you changed.`)}
        </p>
        <Button type="submit" disabled={pending || !!blockedReason}>
          {pending
            ? "Sending…"
            : mode.kind === "create"
              ? `Send to ${otherName}`
              : mode.kind === "final"
                ? "Review contract →"
                : "Save and send update"}
        </Button>
      </div>
    </form>
  );
}

/** The priority dropdown, coloured like its badge so the level is visible at a glance. */
const PRIORITY_SELECT_STYLE: Record<Priority, string> = {
  mandatory: "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200",
  negotiable: "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  preferred: "border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
};

function PrioritySelect({ value, onChange }: { value: Priority; onChange: (p: Priority) => void }) {
  return (
    <NativeSelect
      value={value}
      onChange={(e) => onChange(e.target.value as Priority)}
      aria-label="Priority"
      className={cn("w-full min-w-36 font-medium", PRIORITY_SELECT_STYLE[value])}
    >
      {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
    </NativeSelect>
  );
}
