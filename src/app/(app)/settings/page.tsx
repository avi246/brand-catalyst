import Link from "next/link";
import { UserProfile } from "@clerk/nextjs";
import { FileSignature } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const me = await requireUser();

  return (
    <>
      <PageHeader title="Settings" description="Your sign-in, email and security settings." />
      <div className="flex flex-col gap-6">
        {me.role === "brand" && (
          <Link href="/contracts" className="flex w-fit items-center gap-2 rounded-lg border bg-background px-4 py-3 text-sm hover:border-foreground/30">
            <FileSignature className="size-4" /> Looking for your contract template? It&apos;s in <strong>Contracts</strong>.
          </Link>
        )}
        <UserProfile routing="hash" />
      </div>
    </>
  );
}
