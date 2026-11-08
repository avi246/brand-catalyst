import { notFound } from "next/navigation";
import { AboutPage } from "@/components/about-page";
import { requireUser } from "@/lib/auth";
import { getInfluencerByHandle } from "@/lib/profiles";

export async function generateMetadata({ params }: PageProps<"/creators/[handle]">) {
  const { handle } = await params;
  return { title: `@${handle}` };
}

export default async function CreatorAboutPage({ params }: PageProps<"/creators/[handle]">) {
  const me = await requireUser();
  const { handle } = await params;
  const bundle = await getInfluencerByHandle(decodeURIComponent(handle));
  if (!bundle) notFound();
  return <AboutPage me={me} bundle={bundle} />;
}
