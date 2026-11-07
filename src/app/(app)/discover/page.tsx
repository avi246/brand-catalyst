import { Compass } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Discover" };

export default async function DiscoverPage() {
  const user = await requireUser();
  const isBrand = user.role === "brand";
  return (
    <>
      <PageHeader
        title={isBrand ? "Discover creators" : "Discover brands"}
        description="Search, filter and invite. Match scores with reasons come in a later milestone."
      />
      <EmptyState
        icon={Compass}
        title="Search is on its way"
        body={
          isBrand
            ? "Filter creators by niche, platform, audience location, followers and rates, then send an invitation."
            : "Filter brands by industry, location, budget and the creators they look for, then send an invitation."
        }
        milestone="Milestone 2"
      />
    </>
  );
}
