import { cn } from "@/lib/utils";

/**
 * The Brand Catalyst mark: a solid B with a C carved out of it, the creator inside the brand.
 * Keep in sync with src/app/icon.svg (favicon) and public/logo.svg (Devpost, social).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={cn("size-8 shrink-0", className)}>
      <path
        fill="#d13b25"
        fillRule="evenodd"
        d="M7 4H27A10 10 0 0 1 27 24H29A10 10 0 0 1 29 44H7ZM28.4 17.6A9.5 9.5 0 1 0 28.4 30.4L24.9 27.2A4.75 4.75 0 1 1 24.9 20.8Z"
      />
    </svg>
  );
}

export function Logo({
  className,
  compact = false,
  tone = "light",
}: {
  className?: string;
  compact?: boolean;
  /** "dark" = sits on a dark background, so the wordmark turns white. */
  tone?: "light" | "dark";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      {!compact && (
        <span className={cn("font-heading text-lg leading-none font-bold tracking-tight", tone === "dark" ? "text-white" : "text-foreground")}>
          Brand<span className={tone === "dark" ? "text-[#FF8A5C]" : "text-primary"}>Catalyst</span>
        </span>
      )}
    </span>
  );
}
