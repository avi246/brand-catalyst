import { CheckCircle2, Clock } from "lucide-react";

export type Signature = { party: string; role: "Brand" | "Creator"; name: string | null; at: Date | null };

const fmt = (d: Date) =>
  d.toLocaleString("en", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

/** The legal contract: full text, signature blocks, fingerprint. Used on the deal page and the print page. */
export function ContractView({
  text,
  signatures,
  fingerprint,
}: {
  text: string;
  signatures: Signature[];
  fingerprint: string;
}) {
  return (
    <article className="rounded-xl border bg-white p-6 text-neutral-900 shadow-sm md:p-10 print:border-0 print:p-0 print:shadow-none dark:bg-neutral-50">
      <pre className="font-serif text-[13.5px] leading-relaxed whitespace-pre-wrap">{text}</pre>

      <section className="mt-10 grid gap-6 border-t pt-6 sm:grid-cols-2">
        {signatures.map((s) => (
          <div key={s.role} className="flex flex-col gap-1">
            <p className="text-xs tracking-widest text-neutral-500 uppercase">{s.role}</p>
            <p className="font-medium">{s.party}</p>
            {s.name && s.at ? (
              <>
                <p className="mt-2 border-b border-neutral-400 pb-1 font-serif text-xl italic">{s.name}</p>
                <p className="flex items-center gap-1 text-xs text-emerald-700">
                  <CheckCircle2 className="size-3.5" /> Signed {fmt(s.at)}
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 border-b border-dashed border-neutral-400 pb-1 text-neutral-400">&nbsp;</p>
                <p className="flex items-center gap-1 text-xs text-neutral-500">
                  <Clock className="size-3.5" /> Awaiting signature
                </p>
              </>
            )}
          </div>
        ))}
      </section>

      <p className="mt-8 text-[11px] text-neutral-500">
        Document fingerprint (SHA-256): <code className="break-all">{fingerprint}</code>. Any change to the text above would
        produce a different fingerprint. Signed electronically in Brand Catalyst by typed name.
      </p>
    </article>
  );
}
