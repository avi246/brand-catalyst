import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Set up your account" };

export default async function OnboardingPage() {
  const existing = await getCurrentUser();
  if (existing) redirect("/dashboard");

  const clerkUser = await currentUser();
  const suggestedName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ");

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <Logo />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Set up your account</h1>
          <p className="text-muted-foreground">
            Six fields, under a minute. You can add the rest of your profile later.
          </p>
        </div>
        <OnboardingForm suggestedName={suggestedName} />
      </div>
    </div>
  );
}
