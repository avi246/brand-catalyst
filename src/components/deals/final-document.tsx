import { SECTION_LABEL, TERM_SECTIONS, type ConsignmentContent } from "@/lib/consignments/schema";
import { PLATFORM_LABEL } from "@/lib/constants";

const fmtDate = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" }) : "To be scheduled";

/**
 * The final agreement as a plain document: numbered clauses, no priorities, no comments.
 * This exact text is what the fingerprint covers.
 */
export function FinalDocument({
  content: c,
  brandName,
  creatorName,
}: {
  content: ConsignmentContent;
  brandName: string;
  creatorName: string;
}) {
  let n = 0;
  const num = () => ++n;
  const sections = TERM_SECTIONS.map((s) => ({ s, terms: c.terms.filter((t) => t.section === s) })).filter((x) => x.terms.length);

  return (
    <article className="rounded-xl border bg-background p-6 text-sm leading-relaxed shadow-sm md:p-10">
      <header className="mb-8 border-b pb-6 text-center">
        <p className="text-xs tracking-widest text-muted-foreground uppercase">Campaign agreement</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{c.overview.title}</h2>
        <p className="mt-2 text-muted-foreground">
          Between <strong className="text-foreground">{brandName}</strong> (the Brand) and{" "}
          <strong className="text-foreground">{creatorName}</strong> (the Creator)
        </p>
      </header>

      <Section title={`${num()}. Campaign`}>
        <p>
          The Creator will promote <strong>{c.overview.product}</strong>
          {c.overview.objective ? `, with the objective: ${c.overview.objective}` : ""}.
        </p>
        {c.overview.keyMessage && <p>Key message: &ldquo;{c.overview.keyMessage}&rdquo;</p>}
      </Section>

      <Section title={`${num()}. Deliverables`}>
        <ol className="list-[lower-alpha] space-y-2 pl-5">
          {c.deliverables.map((d) => (
            <li key={d.key}>
              <strong>
                {d.quantity} × {d.format}
              </strong>{" "}
              on {PLATFORM_LABEL[d.platform]}. Draft due {fmtDate(d.draftDue)}; published by {fmtDate(d.publishBy)}.
              {d.notes && <> {d.notes}</>}
            </li>
          ))}
        </ol>
      </Section>

      <Section title={`${num()}. Compensation`}>
        <p>
          The Brand will pay the Creator{" "}
          <strong>{c.fee.amount.toLocaleString("en", { style: "currency", currency: c.fee.currency, maximumFractionDigits: 0 })}</strong>
          . Payment schedule: {c.fee.schedule}.
          {c.fee.giftedProduct && " The product is provided free of charge in addition to the fee."}
        </p>
      </Section>

      {sections.map(({ s, terms }) => (
        <Section key={s} title={`${num()}. ${SECTION_LABEL[s]}`}>
          <ol className="list-[lower-alpha] space-y-2 pl-5">
            {terms.map((t) => (
              <li key={t.key}>
                <strong>{t.label}.</strong> {t.text}
              </li>
            ))}
          </ol>
        </Section>
      ))}

      <p className="mt-8 border-t pt-6 text-xs text-muted-foreground">
        All terms above are binding once the Creator accepts. Acceptance is recorded with the date, time and a fingerprint of
        this exact text.
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
