import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { getProfileBundle } from "@/lib/profiles";
import { EditProfileForm } from "./edit-form";

export const metadata = { title: "Edit profile" };

export default async function EditProfilePage() {
  const user = await requireUser();
  const bundle = await getProfileBundle(user);
  if (!bundle) redirect("/onboarding");

  return (
    <>
      <PageHeader
        title="Edit profile"
        description="Everything here is optional. More detail means better matches."
      />
      {bundle.kind === "influencer" ? (
        <EditProfileForm
          kind="influencer"
          user={bundle.user}
          profile={bundle.profile}
          account={bundle.accounts.find((a) => a.platform === bundle.profile.primaryPlatform) ?? null}
        />
      ) : (
        <EditProfileForm kind="brand" user={bundle.user} profile={bundle.profile} />
      )}
    </>
  );
}
