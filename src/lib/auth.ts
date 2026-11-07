import "server-only";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { users, type Role, type User } from "@/db/schema";

/** The Brand Catalyst user row for the signed-in Clerk user, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const { userId } = await auth();
  if (!userId) return null;
  const [row] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
  return row ?? null;
});

/**
 * Use in every protected page and server action. Redirects to sign-in when signed out,
 * to onboarding when the account has no role yet, and to the dashboard on a role mismatch.
 */
export async function requireUser(role?: Role): Promise<User> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const user = await getCurrentUser();
  if (!user) redirect("/onboarding");
  if (role && user.role !== role) redirect("/dashboard");
  return user;
}
