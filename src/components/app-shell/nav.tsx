"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  Compass,
  Handshake,
  LayoutDashboard,
  MessageSquare,
  Settings,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/collaborations", label: "Collaborations", icon: Handshake },
  { href: "/messages", label: "Messages", icon: MessageSquare, badge: "messages" },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/notifications", label: "Notifications", icon: Bell, badge: "notifications" },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

type Badges = { notifications: number; messages: number };
const BADGE_POLL_MS = 15_000;

/** Unread counts, refreshed on every page change and every 15 seconds. */
function useBadges(): Badges {
  const pathname = usePathname();
  const [badges, setBadges] = useState<Badges>({ notifications: 0, messages: 0 });

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const res = await fetch("/api/badges", { cache: "no-store" });
        if (res.ok && !stopped) setBadges(await res.json());
      } catch {
        // Offline for a moment: keep the last counts.
      }
    };
    load();
    const timer = setInterval(load, BADGE_POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [pathname]);

  return badges;
}

function Count({ n, className }: { n: number; className?: string }) {
  if (n <= 0) return null;
  return (
    <span
      className={cn(
        "ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground tabular-nums",
        className,
      )}
      aria-label={`${n} unread`}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function SidebarNav() {
  const pathname = usePathname();
  const badges = useBadges();
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const { href, label, icon: Icon } = item;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const n = "badge" in item ? badges[item.badge] : 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && "bg-muted font-medium text-foreground",
              n > 0 && "font-medium text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
            <Count n={n} />
          </Link>
        );
      })}
    </nav>
  );
}

/** Horizontal scrolling nav for small screens. */
export function MobileNav() {
  const pathname = usePathname();
  const badges = useBadges();
  return (
    <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
      {NAV_ITEMS.map((item) => {
        const { href, label } = item;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const n = "badge" in item ? badges[item.badge] : 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground",
              active && "bg-muted font-medium text-foreground",
            )}
          >
            {label}
            <Count n={n} className="ml-0" />
          </Link>
        );
      })}
    </nav>
  );
}
