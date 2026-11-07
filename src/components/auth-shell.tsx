import Link from "next/link";
import { Logo } from "@/components/logo";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-muted/40 px-4 py-12">
      <Link href="/" aria-label="Brand Catalyst home">
        <Logo />
      </Link>
      {children}
    </div>
  );
}
