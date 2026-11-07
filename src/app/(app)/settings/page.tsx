import { UserProfile } from "@clerk/nextjs";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="Settings" description="Your sign-in, email and security settings." />
      <UserProfile routing="hash" />
    </>
  );
}
