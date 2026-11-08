import { cn } from "@/lib/utils";

/**
 * The Brand Catalyst mark: two arcs (the brand and the creator) orbiting a spark (the catalyst).
 * Keep in sync with src/app/icon.svg (favicon) and public/logo.svg (Devpost, social).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("size-8 shrink-0", className)}>
      <defs>
        <linearGradient id="bc-mark" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF8A3D" />
          <stop offset="0.5" stopColor="#E8432B" />
          <stop offset="1" stopColor="#B81E78" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#bc-mark)" />
      <g fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round">
        <path d="M9.3 15.6A11.5 11.5 0 0 1 24.4 9.4" />
        <path d="M30.7 24.4A11.5 11.5 0 0 1 15.6 30.6" />
      </g>
      <circle cx="24.4" cy="9.4" r="2.5" fill="#fff" />
      <circle cx="15.6" cy="30.6" r="2.5" fill="#fff" />
      <path
        fill="#fff"
        d="M20 12.8c.8 4.6 2.6 6.4 7.2 7.2-4.6.8-6.4 2.6-7.2 7.2-.8-4.6-2.6-6.4-7.2-7.2 4.6-.8 6.4-2.6 7.2-7.2Z"
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
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className={cn("font-heading text-lg leading-none font-bold tracking-tight", tone === "dark" ? "text-white" : "text-foreground")}>
          Brand<span className={tone === "dark" ? "text-[#FF8A5C]" : "text-primary"}>Catalyst</span>
        </span>
      )}
    </span>
  );
}
