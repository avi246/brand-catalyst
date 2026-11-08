import { z } from "zod";

/*
 * The shape of a consignment (a campaign agreement). Shared by the editor, the server
 * actions, the diff view and, later, the Gemini chat-to-consignment builder.
 * Every term carries a priority so both sides know what's fixed and what's open.
 */

export const PRIORITIES = ["mandatory", "negotiable", "preferred"] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_LABEL: Record<Priority, string> = {
  mandatory: "Mandatory",
  negotiable: "Negotiable",
  preferred: "Preferred",
};

export const TERM_SECTIONS = [
  "creative",
  "approval",
  "rights",
  "compliance",
  "reporting",
  "other",
] as const;
export type TermSection = (typeof TERM_SECTIONS)[number];
export const SECTION_LABEL: Record<TermSection, string> = {
  creative: "Creative rules",
  approval: "Approval and revisions",
  rights: "Usage rights and exclusivity",
  compliance: "Disclosure and compliance",
  reporting: "Reporting",
  other: "Other",
};

const key = z.string().min(1).max(40);
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date")
  .nullable();

export const deliverableSchema = z.object({
  key,
  platform: z.enum(["instagram", "youtube", "tiktok", "other"]),
  format: z.string().trim().min(1, "Format is required").max(40),
  quantity: z.number().int().min(1).max(50),
  draftDue: isoDate,
  publishBy: isoDate,
  notes: z.string().trim().max(300),
  priority: z.enum(PRIORITIES),
});

export const termSchema = z.object({
  key,
  section: z.enum(TERM_SECTIONS),
  label: z.string().trim().min(1, "Give the term a name").max(80),
  text: z.string().trim().min(1, "Describe the term").max(1000),
  priority: z.enum(PRIORITIES),
});

export const consignmentContentSchema = z.object({
  overview: z.object({
    title: z.string().trim().min(3, "Give the campaign a title").max(100),
    product: z.string().trim().min(1, "What's being promoted?").max(200),
    objective: z.string().trim().max(300),
    keyMessage: z.string().trim().max(500),
  }),
  fee: z.object({
    amount: z.number().int().min(0).max(10_000_000),
    currency: z.string().length(3),
    schedule: z.string().trim().max(200),
    giftedProduct: z.boolean(),
    priority: z.enum(PRIORITIES),
  }),
  deliverables: z.array(deliverableSchema).min(1, "Add at least one deliverable").max(20),
  terms: z.array(termSchema).max(40),
});

export type Deliverable = z.infer<typeof deliverableSchema>;
export type Term = z.infer<typeof termSchema>;
export type ConsignmentContent = z.infer<typeof consignmentContentSchema>;

/** Sensible starting terms, written the way agencies phrase them. */
export function defaultContent(): ConsignmentContent {
  return {
    overview: { title: "", product: "", objective: "", keyMessage: "" },
    fee: { amount: 0, currency: "USD", schedule: "50% on signing, 50% on publish", giftedProduct: false, priority: "negotiable" },
    deliverables: [
      {
        key: "d1",
        platform: "instagram",
        format: "Reel",
        quantity: 1,
        draftDue: null,
        publishBy: null,
        notes: "",
        priority: "mandatory",
      },
    ],
    terms: [
      { key: "t1", section: "compliance", label: "Disclosure", text: "Use the platform's Paid Partnership label and #ad in the caption.", priority: "mandatory" },
      { key: "t2", section: "approval", label: "Draft review", text: "Brand reviews the draft within 48 hours. Up to 1 round of revisions included.", priority: "negotiable" },
      { key: "t3", section: "rights", label: "Usage rights", text: "Brand may repost the content on its own social channels for 3 months. No paid ads.", priority: "negotiable" },
      { key: "t4", section: "rights", label: "Exclusivity", text: "No sponsored posts for direct competitors for 14 days after publishing.", priority: "preferred" },
      { key: "t5", section: "reporting", label: "Performance report", text: "Share reach, views and saves screenshots 7 days after publishing.", priority: "preferred" },
    ],
  };
}

/* ------------------------------------------------------------------------------------------
 * Diff: what changed between two versions, in words people can read.
 * ---------------------------------------------------------------------------------------- */

export type Change = { kind: "added" | "removed" | "changed"; label: string; before?: string; after?: string };

const showDeliverable = (d: Deliverable) =>
  [
    `${d.quantity} × ${d.format} (${d.platform})`,
    d.draftDue && `draft by ${d.draftDue}`,
    d.publishBy && `publish by ${d.publishBy}`,
    d.notes,
    PRIORITY_LABEL[d.priority],
  ]
    .filter(Boolean)
    .join(" · ");

const showTerm = (t: Term) => `${t.text} · ${PRIORITY_LABEL[t.priority]}`;

const showFee = (f: ConsignmentContent["fee"]) =>
  `${f.amount.toLocaleString("en")} ${f.currency} · ${f.schedule}${f.giftedProduct ? " · plus gifted product" : ""} · ${PRIORITY_LABEL[f.priority]}`;

export function diffContent(a: ConsignmentContent, b: ConsignmentContent): Change[] {
  const changes: Change[] = [];
  const cmp = (label: string, before: string, after: string) => {
    if (before !== after) changes.push({ kind: "changed", label, before, after });
  };

  cmp("Title", a.overview.title, b.overview.title);
  cmp("Product", a.overview.product, b.overview.product);
  cmp("Objective", a.overview.objective, b.overview.objective);
  cmp("Key message", a.overview.keyMessage, b.overview.keyMessage);
  cmp("Fee", showFee(a.fee), showFee(b.fee));

  const listDiff = <T extends { key: string }>(
    before: T[],
    after: T[],
    name: (x: T) => string,
    show: (x: T) => string,
  ) => {
    const old = new Map(before.map((x) => [x.key, x]));
    const now = new Map(after.map((x) => [x.key, x]));
    for (const [k, x] of now) {
      const prev = old.get(k);
      if (!prev) changes.push({ kind: "added", label: name(x), after: show(x) });
      else cmp(name(x), show(prev), show(x));
    }
    for (const [k, x] of old) if (!now.has(k)) changes.push({ kind: "removed", label: name(x), before: show(x) });
  };

  listDiff(a.deliverables, b.deliverables, (d) => `Deliverable: ${d.format}`, showDeliverable);
  listDiff(a.terms, b.terms, (t) => t.label, showTerm);
  return changes;
}
