import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { ArrowRight, BadgeCheck, Check, FileSignature, MessagesSquare, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Discover", body: "Describe who you need in plain English. Every match is scored, with reasons." },
  { title: "Connect", body: "Send an invitation. Messaging opens only when the other side accepts." },
  { title: "Negotiate", body: "Discuss a proposal term by term, right where each term is written." },
  { title: "Sign", body: "Gemini settles the discussion into a contract. Both sides sign the same text." },
];

const FEATURES = [
  {
    icon: Sparkles,
    tint: "bg-[#fde8df] text-[#c23a1f]",
    title: "Matches with reasons",
    body: "Search by meaning, not keywords. See a 0 to 100 score and exactly why: niche, budget, audience and engagement.",
  },
  {
    icon: MessagesSquare,
    tint: "bg-[#f7e0ee] text-[#a81a6c]",
    title: "Negotiate term by term",
    body: "Fee, deliverables and usage rights each get their own thread, so nothing gets lost in a chat.",
  },
  {
    icon: FileSignature,
    tint: "bg-[#e7e4fa] text-[#4a3cb0]",
    title: "From discussion to contract",
    body: "Gemini reads what was agreed and fills your own contract template. You review every word before it's sent.",
  },
  {
    icon: BadgeCheck,
    tint: "bg-[#dff3ea] text-[#17794f]",
    title: "Numbers you can trust",
    body: "Every stat is labelled Verified or Self-reported, and every signed contract carries a tamper-evident fingerprint.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ------------------------------ Hero ------------------------------ */}
      <div className="relative overflow-hidden bg-[#17142b] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(52rem 30rem at 85% -10%, rgba(232,67,43,0.45), transparent 65%), radial-gradient(40rem 28rem at 60% 110%, rgba(184,30,120,0.35), transparent 65%)",
          }}
        />

        <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 md:px-8">
          <Logo tone="dark" />
          <nav className="flex items-center gap-2">
            <Show when="signed-out">
              <Link href="/sign-in" className="rounded-lg px-3 py-1.5 text-sm text-white/80 transition-colors hover:text-white">
                Sign in
              </Link>
              <Link href="/sign-up" className={cn(buttonVariants())}>
                Get started
              </Link>
            </Show>
            <Show when="signed-in">
              <Link href="/dashboard" className={cn(buttonVariants())}>
                Open dashboard
              </Link>
            </Show>
          </nav>
        </header>

        <section className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-12 pb-20 md:px-8 lg:grid-cols-[1.1fr_1fr] lg:pt-16 lg:pb-28">
          <div className="flex flex-col gap-6">
            <span className="w-fit rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-white/80">
              The deal desk for creator partnerships
            </span>
            <h1 className="text-4xl leading-[1.05] font-bold tracking-tight text-balance md:text-6xl">
              From first message to{" "}
              <span className="bg-gradient-to-r from-[#ff9a5c] to-[#f0568f] bg-clip-text text-transparent">signed contract</span>
              , without the DM chaos.
            </h1>
            <p className="max-w-xl text-lg text-pretty text-white/70">
              Brands and creators find the right fit, negotiate every term in one place, and sign a contract both sides can trust.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-base")}>
                I&apos;m a brand <ArrowRight />
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/25 bg-white/5 px-5 text-base font-medium text-white transition-colors hover:bg-white/10"
              >
                I&apos;m a creator
              </Link>
            </div>
          </div>

          {/* Illustrative product preview (example data) */}
          <div aria-hidden className="relative mx-auto w-full max-w-md lg:ml-auto">
            <div className="rounded-2xl bg-white p-5 text-[#1b1830] shadow-2xl shadow-black/40">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-xl bg-[#dff3ea] font-heading text-lg font-bold text-[#17794f]">
                  92
                </span>
                <div>
                  <p className="font-semibold">Example creator</p>
                  <p className="text-sm text-[#6b6577]">Skincare · Instagram · from $175</p>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5 text-sm">
                {["Content closely matches your search", "68% of audience in your market", "Within your campaign budget"].map((r) => (
                  <li key={r} className="flex items-center gap-2">
                    <Check className="size-4 text-[#17794f]" /> {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative mt-4 ml-8 rounded-2xl bg-white p-5 text-[#1b1830] shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Campaign contract</p>
                <span className="rounded-full bg-[#dff3ea] px-2 py-0.5 text-xs font-medium text-[#17794f]">Signed</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="border-b border-[#c9c2b8] pb-1">
                  <p className="text-xs text-[#6b6577]">Brand</p>
                  <p className="font-heading italic">Signed</p>
                </div>
                <div className="border-b border-[#c9c2b8] pb-1">
                  <p className="text-xs text-[#6b6577]">Creator</p>
                  <p className="font-heading italic">Signed</p>
                </div>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-[#6b6577]">
                <BadgeCheck className="size-3.5" /> Fingerprint recorded for this exact text
              </p>
            </div>
          </div>
        </section>
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-20 px-4 py-20 md:px-8">
        {/* ------------------------------ How it works ------------------------------ */}
        <section className="flex flex-col gap-8">
          <h2 className="text-3xl font-bold tracking-tight">One place for the whole deal</h2>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex flex-col gap-2">
                <span className="grid size-9 place-items-center rounded-full bg-primary font-heading font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ------------------------------ Features ------------------------------ */}
        <section className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, tint, title, body }) => (
            <div key={title} className="flex flex-col gap-3 rounded-2xl border bg-card p-6">
              <span className={cn("grid size-10 place-items-center rounded-xl", tint)}>
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">Built at UB Hacking 2026</footer>
    </div>
  );
}
