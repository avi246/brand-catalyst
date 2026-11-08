import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Brand Catalyst",
    template: "%s · Brand Catalyst",
  },
  description:
    "The deal desk for creator partnerships: find the right creators, negotiate term by term, and sign contracts both sides trust.",
};

// Runs before the page paints, so someone who chose dark never sees a flash of light.
const applySavedTheme = `try{if(localStorage.getItem("bc-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider
      appearance={{
        // CSS variables, so Clerk's screens follow whichever theme is on.
        variables: {
          colorPrimary: "var(--primary)",
          colorPrimaryForeground: "var(--primary-foreground)",
          colorBackground: "var(--card)",
          colorForeground: "var(--foreground)",
          colorMutedForeground: "var(--muted-foreground)",
          colorInput: "var(--background)",
          colorInputForeground: "var(--foreground)",
          colorNeutral: "var(--foreground)",
          borderRadius: "0.75rem",
        },
      }}
    >
      <html
        lang="en"
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
      >
        <head>
          <script dangerouslySetInnerHTML={{ __html: applySavedTheme }} />
        </head>
        <body className="min-h-full flex flex-col bg-background text-foreground">
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors position="top-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
