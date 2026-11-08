import { UserProfile } from "@clerk/nextjs";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { brandProfiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ContractTemplateForm } from "./contract-template-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const me = await requireUser();
  const [brand] =
    me.role === "brand"
      ? await db
          .select({ brandName: brandProfiles.brandName, template: brandProfiles.contractTemplate })
          .from(brandProfiles)
          .where(eq(brandProfiles.userId, me.id))
      : [];

  return (
    <>
      <PageHeader title="Settings" description="Your contract template, sign-in, email and security settings." />
      <div className="flex flex-col gap-8">
        {brand && <ContractTemplateForm brandName={brand.brandName} saved={brand.template} />}
        <UserProfile routing="hash" />
      </div>
    </>
  );
}
