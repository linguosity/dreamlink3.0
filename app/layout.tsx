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

import { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { EnvVarWarning } from "@/components/env-var-warning";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { Jost, Newsreader, Quicksand } from "next/font/google";
import { createClient } from "@/utils/supabase/server";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import "./globals.css";
import { Providers } from './providers';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import { VersionChecker } from '@/components/VersionChecker';
import CookieConsent from '@/components/CookieConsent';
import FeedbackWidget from '@/components/FeedbackWidget';
import { HintsProvider } from '@/lib/hints/dismissed-context';
import { HINT_IDS, type HintId } from '@/lib/hints/types';

// Determine the base URL for metadata and redirects.
// VERCEL_URL is the raw deployment host (…vercel.app), NOT the custom domain,
// so production must hardcode the canonical origin or OG/canonical URLs
// point search engines away from dreamriver.io.
const defaultUrl =
  process.env.NODE_ENV === "production"
    ? "https://dreamriver.io"
    : "http://localhost:3000";

// ① Next.js Metadata API
// v3 "Deep Current": wire the new icon set + og:image. Icons live in
// /public/brand and were rendered from the same dr-logo mark the React
// component uses, so the raster matches the in-app vector exactly. og:image
// points at /og — a dynamic route that stamps the Navy 900 social card.
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
      { rel: "mask-icon", url: "/brand/icon-master.svg", color: "#0A0E33" },
    ],
  },
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

// themeColor must live in the viewport export since Next 14+
// (it was emitting an "Unsupported metadata themeColor" warning on every route).
// Dark is a first-class peer, not a filter (HANDOFF-v3.md rule 4) — so the
// browser/OS chrome follows the theme too. A single Navy 900 value painted a
// dark address bar above a Paper page for every light-mode user. Values are
// the --bg tokens: Paper in light, Night in dark.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBFAFF" },
    { media: "(prefers-color-scheme: dark)", color: "#070A24" },
  ],
};

// v3 "Deep Current" type system (HANDOFF-v3.md §3):
//   Jost       — display + UI: headings, buttons, labels, forms.
//   Newsreader — editorial: dream entries, interpretations, scripture, blog.
//   Quicksand  — wordmark only, never a UI face.
// All three expose CSS variables consumed by --font-sans / --font-serif /
// --font-logo in globals.css.
const jost = Jost({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jost",
  weight: ["300", "400", "500", "600"],
});

const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-newsreader",
  weight: ["300", "400", "500"],
  style: ["normal"],
});

// Wordmark-only face — "DreamRiver" is always set in Quicksand 500, never
// italic. Loaded as a CSS variable so the .wordmark class in globals.css
// (and <DrLogo/>) can pick it up.
const quicksand = Quicksand({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-quicksand",
  weight: ["500"],
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
  // NOTE: admin routes are NOT gated here. Hiding the Navbar for /admin from
  // this server-rendered pathname looked right and was wrong: the root layout
  // survives client-side navigation, so the value computed on an admin page
  // stuck around afterwards and the whole app lost its header until a hard
  // reload — including the settings page you land on after leaving admin, which
  // left no way back. FeedbackWidget already carries a comment saying exactly
  // this. Navbar now hides itself via usePathname, which re-evaluates on every
  // navigation.

  return (
    <html
      lang="en"
      className={`${jost.variable} ${newsreader.variable} ${quicksand.variable}`}
      suppressHydrationWarning
    >
      <body className="text-foreground">
        <Providers>
          <HintsProvider initialDismissed={dismissedHints}>
          <ServiceWorkerRegistration />
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

            {/* Floating feedback bubble — signed-in users only; the widget
                additionally hides itself on public/marketing routes via
                usePathname (the root layout survives client navigations, so
                the server-side pathname here would go stale). */}
            {user && <FeedbackWidget />}

            {/* Footer only on auth pages (landing page has its own footer) */}
            {isAuthPage && (
              <footer className="w-full flex items-center justify-between border-t p-4 text-xs">
                <p className="text-muted-foreground">
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