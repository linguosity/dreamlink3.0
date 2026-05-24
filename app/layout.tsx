// app/layout.tsx
//
// Technical explanation:
// Main layout component for the Next.js application. It sets up the HTML
// structure, includes global styles, fonts, and providers. It also handles
// basic user authentication logic and renders the Navbar and Footer.
//
// Analogy:
// It's like the blueprint of a house, defining the overall structure, where
// the rooms (pages) will go, and common elements like the foundation (HTML
// structure), a security system (auth), and shared utilities (providers,
// global styles).

import { Metadata } from "next";
import { Suspense } from "react";
import { EnvVarWarning } from "@/components/env-var-warning";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { Cormorant_Garamond, DM_Sans, DM_Serif_Display } from "next/font/google";
import { createClient } from "@/utils/supabase/server";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import "./globals.css";
import { Providers } from './providers';
import { VersionChecker } from '@/components/VersionChecker';
import CookieConsent from '@/components/CookieConsent';
import { HintsProvider } from '@/lib/hints/dismissed-context';
import { HINT_IDS, type HintId } from '@/lib/hints/types';

// Determine the base URL for metadata and redirects
const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

// ① Next.js Metadata API
// F13/F14 (v2 Moonwater): wire the new icon set + og:image. Icons live in
// /public/brand and were rendered from the same SVG paths the React mark
// uses, so the raster matches the in-app vector exactly. og:image points
// at /og — a dynamic route that stamps the Night/Moonwater social card.
export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "DreamRiver – Dream Journal",
  description: "Track and analyze your dreams with AI-powered insights",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-master.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
    other: [
      { rel: "mask-icon", url: "/brand/icon-master.svg", color: "#0E1A30" },
    ],
  },
  themeColor: "#0E1A30",
  openGraph: {
    title: "DreamRiver – Dream Journal",
    description: "Track and analyze your dreams with AI-powered insights",
    url: defaultUrl,
    siteName: "DreamRiver",
    locale: "en_US",
    type: "website",
    images: [{ url: "/og", width: 1200, height: 630, alt: "DreamRiver" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DreamRiver – Dream Journal",
    description: "Track and analyze your dreams with AI-powered insights",
    images: ["/og"],
  },
};

// DM Sans for body, DM Serif Display for headlines, Cormorant Garamond for the wordmark.
// All three expose CSS variables consumed by --font-sans / --font-serif / --font-cormorant in globals.css.
const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-serif",
  weight: ["400"],
});

// v2 Moonwater wordmark — italic serif "DreamRiver" per the brand audit.
// Loaded as a CSS variable so the .wordmark class in globals.css can pick
// it up. Italic 500 is the canonical weight; we load roman 500 too in case
// any tertiary surface needs the upright form.
const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-cormorant",
  weight: ["500"],
  style: ["italic", "normal"],
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user = null;
  let dismissedHints: HintId[] = [];

  try {
    const supabase = await createClient();
    const { data, error: userError } = await supabase.auth.getUser();

    if (userError) {
      if (userError.message.includes("User from sub claim")) {
        // kick into our sign-out handler, with a message
        const msg = encodeURIComponent("Session expired. Please sign in again.");
        redirect(`/api/auth/signout?redirect_to=/sign-in?error=${msg}`);
      }
      else if (userError.message !== "Auth session missing!") {
        console.error("Error fetching user:", userError.message);
      }
    } else if (data.user) {
      user = data.user;
      const { data: profileRow } = await supabase
        .from("profile")
        .select("dismissed_hints")
        .eq("user_id", user.id)
        .single();
      const raw = (profileRow?.dismissed_hints as string[] | null) ?? [];
      dismissedHints = raw.filter((id): id is HintId =>
        (HINT_IDS as readonly string[]).includes(id),
      );
    }
  } catch (err: unknown) {
    // re-throw Next.js redirects so they become real HTTP 3xxs
    if (isRedirectError(err)) throw err;
    console.error("Unexpected auth error in layout:", err);
  }

  // Determine if the current path is an auth‐related page or landing page
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  const isAuthPage =
    pathname.includes("/sign-in") ||
    pathname.includes("/sign-up") ||
    pathname.includes("/forgot-password");
  const isLandingPage = pathname.includes("/landing");
  const isOnboardingPage = pathname.includes("/onboarding");

  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${dmSerifDisplay.variable} ${cormorantGaramond.variable}`}
      suppressHydrationWarning
    >
      <body className="text-foreground">
        <Providers>
          <HintsProvider initialDismissed={dismissedHints}>
          <VersionChecker />
          {/* Skip-to-content link for keyboard/screen-reader users */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Skip to content
          </a>
          <main className="min-h-screen flex flex-col animate-fade-in">
            {/* Env‐var warning or Navbar */}
            {!hasEnvVars ? (
              <div className="w-full flex justify-center border-b h-16">
                <div className="w-full max-w-5xl flex justify-between items-center p-3 text-sm">
                  <EnvVarWarning />
                </div>
              </div>
            ) : !isAuthPage && !isLandingPage && !isOnboardingPage && user ? (
              <Navbar />
            ) : null}

            {/* Main content */}
            <div
              id="main-content"
              className={
                `flex-1 ` +
                (!user && !isAuthPage && !isLandingPage ? "flex items-center justify-center" : "")
              }
            >
              <Suspense fallback={null}>
                {children}
              </Suspense>
            </div>

            {/* Global toast container */}
            <Toaster />

            {/* Cookie consent banner */}
            <CookieConsent />

            {/* Footer only on auth pages (landing page has its own footer) */}
            {isAuthPage && (
              <footer className="w-full flex items-center justify-between border-t p-4 text-xs">
                <p className="text-white">
                  © {new Date().getFullYear()} DreamRiver. All rights reserved.
                </p>
                <div className="flex items-center gap-4">
                  <ThemeSwitcher />
                </div>
              </footer>
            )}
          </main>
          </HintsProvider>
        </Providers>
      </body>
    </html>
  );
}