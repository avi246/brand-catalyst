import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { MobileNav, SidebarNav } from "@/components/app-shell/nav";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const roleLabel = user.role === "brand" ? "Brand" : "Creator";

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r bg-background px-3 py-5 md:flex">
        <Link href="/dashboard" className="px-2.5">
          <Logo />
        </Link>
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-8">
            <Link href="/dashboard" className="md:hidden">
              <Logo compact />
            </Link>
            <div className="hidden md:block" />
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{roleLabel}</Badge>
              <span className="hidden text-sm text-muted-foreground sm:inline">{user.displayName}</span>
              <UserButton />
            </div>
          </div>
          <MobileNav />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
