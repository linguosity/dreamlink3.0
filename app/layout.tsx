// app/layout.tsx
//
// The document shell, and nothing else: <html>, <body>, the font variables,
// global metadata, and the providers every route needs.
//
// It deliberately owns no chrome. Which header a page gets is decided by the
// route group it lives in:
//
//   app/(app)/         signed-in app shell — Navbar, feedback bubble
//   app/(auth-pages)/  the sign-in lobby — centred card, footer, no navbar
//   app/(fullscreen)/  landing and onboarding — pages that own the viewport
//   app/(admin)/       the admin console — sidebar, no consumer navbar
//
// That split is the whole point. Deciding it here instead was tried twice and
// broke both times, because this layout is NOT re-rendered on client-side
// navigation: any pathname it reads goes stale the moment you navigate. PR #35
// hid the navbar on /admin from the server-rendered x-pathname and the entire
// app lost its header until a hard reload — including the settings page you
// land on after leaving admin, which left no visible way back. #38 reverted it.
// A layout that never asks "which page am I on?" has nothing to go stale.

import { Metadata, Viewport } from "next";
import { Jost, Newsreader, Quicksand } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { Providers } from './providers';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import { VersionChecker } from '@/components/VersionChecker';
import CookieConsent from '@/components/CookieConsent';

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${jost.variable} ${newsreader.variable} ${quicksand.variable}`}
      suppressHydrationWarning
    >
      <body className="text-foreground">
        <Providers>
          <ServiceWorkerRegistration />
          <VersionChecker />
          {/* Skip-to-content link for keyboard/screen-reader users. Every
              route group renders an #main-content target for it. */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Skip to content
          </a>

          {children}

          {/* Global toast container */}
          <Toaster />

          {/* Cookie consent banner */}
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}
