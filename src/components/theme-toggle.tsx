"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/** The browser remembers the choice under this key. See the small script in src/app/layout.tsx. */
export const THEME_KEY = "bc-theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/** True while the dark theme is on. Light on the server, since only the browser knows the choice. */
export function useIsDark() {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
}

function setDark(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch {
    // Storage blocked (private window): the theme still applies until the page closes.
  }
}

const OPTIONS = [
  { dark: false, label: "Light", icon: Sun },
  { dark: true, label: "Dark", icon: Moon },
];

export function ThemeToggle() {
  const isDark = useIsDark();
  return (
    <div role="group" aria-label="Theme" className="inline-flex rounded-lg border bg-muted p-0.5">
      {OPTIONS.map(({ dark, label, icon: Icon }) => (
        <button
          key={label}
          type="button"
          aria-pressed={isDark === dark}
          onClick={() => setDark(dark)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
            isDark === dark ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden /> {label}
        </button>
      ))}
    </div>
  );
}
