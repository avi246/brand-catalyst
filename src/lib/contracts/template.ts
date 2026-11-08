import { PLATFORM_LABEL } from "@/lib/constants";
import { SECTION_LABEL, TERM_SECTIONS, type ConsignmentContent } from "@/lib/consignments/schema";

/*
 * Contracts = the brand's standard template + "Schedule A: Campaign Terms" (the agreed proposal).
 * Templates use {{placeholders}}; anything the template doesn't place, we append.
 * Plain functions (no server imports) so the settings page can preview them too.
 */

export const PLACEHOLDERS = [
  { key: "brand_name", help: "Brand name" },
  { key: "company_name", help: "Legal company name (falls back to brand name)" },
  { key: "creator_name", help: "Creator's name" },
  { key: "creator_handle", help: "Creator's handle, e.g. @maya" },
  { key: "campaign_title", help: "Campaign title" },
  { key: "product", help: "Product or service promoted" },
  { key: "fee", help: "Total fee, e.g. $700" },
  { key: "payment_schedule", help: "How the fee is paid" },
  { key: "effective_date", help: "Date the contract is sent" },
  { key: "schedule_a", help: "The agreed campaign terms (deliverables, dates, rights...)" },
] as const;

/**
 * Sample template for brands without their own. Deliberately plain and standard.
 * Not legal advice: brands should have their lawyer review or replace it.
 */
export const DEFAULT_CONTRACT_TEMPLATE = `INFLUENCER MARKETING AGREEMENT

This Influencer Marketing Agreement (the "Agreement") is entered into on {{effective_date}} between {{company_name}} (the "Brand") and {{creator_name}} ({{creator_handle}}) (the "Creator").

1. SERVICES
The Creator will create and publish the content described in Schedule A (the "Deliverables") to promote {{product}} as part of the campaign "{{campaign_title}}" (the "Campaign").

2. COMPENSATION
The Brand will pay the Creator {{fee}} for the Deliverables. Payment schedule: {{payment_schedule}}. The Creator is responsible for their own taxes.

3. CONTENT APPROVAL
The Creator will submit drafts for review as set out in Schedule A. The Brand will review drafts within the time stated there. Approval will not be unreasonably withheld.

4. DISCLOSURE
The Creator will clearly disclose the paid relationship in every Deliverable, as required by applicable advertising laws and platform rules (for example the FTC Endorsement Guides in the United States).

5. CONTENT OWNERSHIP AND USAGE
The Creator keeps ownership of the content. The Brand receives the usage rights stated in Schedule A and no others.

6. CONDUCT
Each party will act professionally and will not make false or misleading claims about the other or about the product.

7. CANCELLATION
Either party may end this Agreement with written notice if the other party materially breaches it and does not fix the breach within 7 days. Fees for Deliverables already published remain payable.

8. CONFIDENTIALITY
Each party will keep the other's non-public information confidential, including the fee, unless disclosure is required by law.

9. RELATIONSHIP
The Creator is an independent contractor, not an employee or agent of the Brand.

10. ENTIRE AGREEMENT AND PRECEDENCE
This Agreement, including Schedule A, is the entire agreement between the parties for the Campaign. If Schedule A conflicts with any other part of this Agreement, Schedule A prevails.

11. SIGNATURES
The parties agree that typing their full name and confirming acceptance in Brand Catalyst constitutes their signature on this Agreement.

{{schedule_a}}`;

const money = (n: number, cur: string) =>
  n.toLocaleString("en", { style: "currency", currency: cur, maximumFractionDigits: 0 });
const date = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" }) : "to be scheduled";

/** The agreed proposal as a numbered schedule, in neutral contract wording. */
export function renderScheduleA(c: ConsignmentContent) {
  const lines: string[] = ["SCHEDULE A: CAMPAIGN TERMS", ""];
  let n = 0;
  const h = (t: string) => lines.push(`A${++n}. ${t.toUpperCase()}`);

  h("Campaign");
  lines.push(`Title: ${c.overview.title}`, `Product: ${c.overview.product}`);
  if (c.overview.objective) lines.push(`Objective: ${c.overview.objective}`);
  if (c.overview.keyMessage) lines.push(`Key message: ${c.overview.keyMessage}`);
  lines.push("");

  h("Deliverables");
  c.deliverables.forEach((d, i) => {
    lines.push(
      `(${String.fromCharCode(97 + i)}) ${d.quantity} x ${d.format} on ${PLATFORM_LABEL[d.platform] ?? d.platform}. Draft due: ${date(d.draftDue)}. Publish by: ${date(d.publishBy)}.${d.notes ? ` ${d.notes}` : ""}`,
    );
  });
  lines.push("");

  h("Compensation");
  lines.push(`Fee: ${money(c.fee.amount, c.fee.currency)}. Payment schedule: ${c.fee.schedule}.${c.fee.giftedProduct ? " The product is provided free of charge in addition to the fee." : ""}`);
  lines.push("");

  for (const s of TERM_SECTIONS) {
    const terms = c.terms.filter((t) => t.section === s);
    if (!terms.length) continue;
    h(SECTION_LABEL[s]);
    terms.forEach((t, i) => lines.push(`(${String.fromCharCode(97 + i)}) ${t.label}: ${t.text}`));
    lines.push("");
  }

  lines.push("This Schedule A sets out the campaign terms agreed by both parties. If it conflicts with any other part of the Agreement, this Schedule A prevails.");
  return lines.join("\n");
}

/** Fills the template. Unknown placeholders are left visible so mistakes are obvious. */
export function renderContract(
  template: string | null | undefined,
  v: {
    brandName: string;
    companyName?: string | null;
    creatorName: string;
    creatorHandle?: string | null;
    content: ConsignmentContent;
    effectiveDate: Date;
  },
) {
  const tpl = template?.trim() ? template : DEFAULT_CONTRACT_TEMPLATE;
  const values: Record<string, string> = {
    brand_name: v.brandName,
    company_name: v.companyName?.trim() || v.brandName,
    creator_name: v.creatorName,
    creator_handle: v.creatorHandle ? `@${v.creatorHandle}` : v.creatorName,
    campaign_title: v.content.overview.title,
    product: v.content.overview.product,
    fee: money(v.content.fee.amount, v.content.fee.currency),
    payment_schedule: v.content.fee.schedule,
    effective_date: v.effectiveDate.toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" }),
    schedule_a: renderScheduleA(v.content),
  };
  let out = tpl.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (m, k: string) => values[k] ?? m);
  // Templates that don't place the schedule still get it, at the end.
  if (!/\{\{\s*schedule_a\s*\}\}/.test(tpl)) out = `${out.trimEnd()}\n\n${values.schedule_a}`;
  return out.replace(/\r\n/g, "\n").trim();
}
