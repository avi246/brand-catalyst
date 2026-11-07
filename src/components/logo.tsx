import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground"
      >
        B
      </span>
      {!compact && <span className="text-base">Brand Catalyst</span>}
    </span>
  );
}
