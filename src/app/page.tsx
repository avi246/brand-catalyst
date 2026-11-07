import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { BadgeCheck, FileSignature, GitCompareArrows, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Matches with reasons",
    body: "See which creators fit your brief, and why: audience, budget fit and content themes.",
  },
  {
    icon: FileSignature,
    title: "Chat to agreement",
    body: "Turn a conversation into a structured brief with deliverables, dates, pay and usage rights.",
  },
  {
    icon: GitCompareArrows,
    title: "Negotiate clause by clause",
    body: "Every change is a new version with a clear diff. No silent edits to agreed terms.",
  },
  {
    icon: BadgeCheck,
    title: "Numbers you can trust",
    body: "Every stat is labelled Verified or Self-reported, so nobody pays for inflated reach.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 md:px-8">
        <Logo />
        <nav className="flex items-center gap-2">
          <Show when="signed-out">
            <Link href="/sign-in" className={cn(buttonVariants({ variant: "ghost" }))}>
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

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-20 px-4 py-16 md:px-8 md:py-24">
        <section className="flex max-w-3xl flex-col gap-6">
          <span className="w-fit rounded-full border px-3 py-1 text-xs text-muted-foreground">
            The deal desk for creator partnerships
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-6xl">
            From first message to signed brief, without the DM chaos.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground text-pretty">
            Brand Catalyst helps brands and creators find the right fit, negotiate terms clause by
            clause, and lock agreements both sides can trust.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }), "h-10 px-4")}>
              I&apos;m a brand
            </Link>
            <Link href="/sign-up" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-10 px-4")}>
              I&apos;m a creator
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col gap-2 rounded-xl border bg-card p-5">
              <Icon className="size-5 text-muted-foreground" aria-hidden />
              <h2 className="font-medium">{title}</h2>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Built at UB Hacking 2026
      </footer>
    </div>
  );
}
