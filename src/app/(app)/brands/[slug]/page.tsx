import { notFound } from "next/navigation";
import { AboutPage } from "@/components/about-page";
import { requireUser } from "@/lib/auth";
import { getBrandBySlug } from "@/lib/profiles";

export async function generateMetadata({ params }: PageProps<"/brands/[slug]">) {
  const { slug } = await params;
  const bundle = await getBrandBySlug(slug);
  return { title: bundle?.profile.brandName ?? "Brand" };
}

export default async function BrandAboutPage({ params }: PageProps<"/brands/[slug]">) {
  const me = await requireUser();
  const { slug } = await params;
  const bundle = await getBrandBySlug(decodeURIComponent(slug));
  if (!bundle) notFound();
  return <AboutPage me={me} bundle={bundle} />;
}
