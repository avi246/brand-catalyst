import { clerkMiddleware } from "@clerk/nextjs/server";

// Next.js 16 renamed middleware to proxy. clerkMiddleware only attaches the session here;
// access control happens next to the data, in every page and server action via
// `requireUser()` (src/lib/auth.ts), as Clerk now recommends.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
