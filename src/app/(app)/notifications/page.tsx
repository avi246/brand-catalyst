import { Bell } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="Notifications" />
      <EmptyState
        icon={Bell}
        title="You're all caught up"
        body="Invitations, new messages, proposal changes and deadline reminders will show up here."
      />
    </>
  );
}
