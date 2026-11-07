import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ProfileView } from "@/components/profile-view";
import { requireUser } from "@/lib/auth";
import { getProfileBundle } from "@/lib/profiles";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const bundle = await getProfileBundle(user);
  if (!bundle) redirect("/onboarding");

  return (
    <>
      <PageHeader
        title="Your profile"
        description={
          user.role === "brand"
            ? "This is what creators see before they accept your invitation."
            : "This is what brands see when they find you."
        }
      />
      <ProfileView bundle={bundle} />
    </>
  );
}
