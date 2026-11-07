"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { brandProfiles, influencerProfiles, socialAccounts, users } from "@/db/schema";
import { INDUSTRIES, NICHES } from "@/lib/constants";

export type OnboardingState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const handle = z
  .string()
  .trim()
  .transform((v) => v.replace(/^@/, "").toLowerCase())
  .pipe(
    z
      .string()
      .min(2, "Handle is too short")
      .max(30, "Handle is too long")
      .regex(/^[a-z0-9._]+$/, "Use letters, numbers, dots and underscores only"),
  );

const influencerSchema = z.object({
  role: z.literal("influencer"),
  displayName: z.string().trim().min(2, "Enter your name or creator name").max(60),
  handle,
  primaryNiche: z.enum(NICHES, { error: "Pick your main niche" }),
  primaryPlatform: z.enum(["instagram", "youtube", "tiktok"], { error: "Pick a platform" }),
  platformUrl: z.url({ error: "Enter the full link to your profile or channel" }),
  followers: z.coerce
    .number({ error: "Enter a number" })
    .int()
    .min(0)
    .max(1_000_000_000),
  city: z.string().trim().max(60).optional(),
  country: z.string().trim().min(2, "Enter your country").max(60),
});

const brandSchema = z.object({
  role: z.literal("brand"),
  displayName: z.string().trim().min(2, "Enter your name").max(60),
  brandName: z.string().trim().min(2, "Enter your brand name").max(80),
  website: z.url({ error: "Enter the full website address, e.g. https://example.com" }),
  industry: z.enum(INDUSTRIES, { error: "Pick an industry" }),
  country: z.string().trim().min(2, "Enter your country").max(60),
});

const onboardingSchema = z.discriminatedUnion("role", [influencerSchema, brandSchema]);

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  if (existing) redirect("/dashboard");

  const raw = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string" && v !== ""),
  );
  const parsed = onboardingSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const data = parsed.data;

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? null;
  const avatarUrl = clerkUser?.imageUrl ?? null;

  try {
    await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          clerkId,
          role: data.role,
          email,
          avatarUrl,
          displayName: data.displayName,
        })
        .returning({ id: users.id });

      if (data.role === "influencer") {
        await tx.insert(influencerProfiles).values({
          userId: user.id,
          handle: data.handle,
          primaryNiche: data.primaryNiche,
          primaryPlatform: data.primaryPlatform,
          city: data.city,
          country: data.country,
        });
        await tx.insert(socialAccounts).values({
          userId: user.id,
          platform: data.primaryPlatform,
          handle: data.handle,
          url: data.platformUrl,
          followers: data.followers,
          source: "self",
        });
      } else {
        const base = slugify(data.brandName) || "brand";
        const [taken] = await tx
          .select({ slug: brandProfiles.slug })
          .from(brandProfiles)
          .where(eq(brandProfiles.slug, base))
          .limit(1);
        const slug = taken ? `${base}-${crypto.randomUUID().slice(0, 6)}` : base;
        await tx.insert(brandProfiles).values({
          userId: user.id,
          slug,
          brandName: data.brandName,
          website: data.website,
          industry: data.industry,
          country: data.country,
        });
      }
    });
  } catch (err) {
    // 23505 = unique_violation (the only user-facing case is a taken handle)
    const code = (err as { cause?: { code?: string }; code?: string }).cause?.code ??
      (err as { code?: string }).code;
    if (code === "23505") {
      return { fieldErrors: { handle: ["That handle is already on Brand Catalyst"] } };
    }
    console.error("[onboarding] failed", err);
    return { error: "Something went wrong saving your profile. Please try again." };
  }

  redirect("/dashboard");
}
