// app/coming-soon/page.tsx
//
// Pre-launch splash, implemented from the Claude Design handoff bundle
// (DreamRiver Splash Page.html). Shown to all non-admin visitors when the
// `coming_soon_enabled` flag in site_settings is ON. Admins (allowlist or
// is_admin) bypass via proxy.ts and see the real app.
//
// Layout: header (wordmark + "Coming June 2026") → two-column main
// (copy/form/countdown left, animated phone mockup right) → footer.
// Mobile collapses to single column with the mockup above the copy.
//
// Animations are pure CSS in app/globals.css (water-bg, ripple-line,
// shimmer-overlay, animate-phone-float). Countdown + typewriter are the
// only client-state pieces.

import type { Metadata } from "next";
import Link from "next/link";
import ComingSoonForm from "./ComingSoonForm";
import Countdown from "./Countdown";
import IOSDevice from "./IOSDevice";
import PhoneMockup from "./PhoneMockup";

const LAUNCH_TARGET_ISO = "2026-06-01T00:00:00";
const LAUNCH_LABEL = "Coming June 2026";

export const metadata: Metadata = {
  title: "DreamRiver — Coming Soon",
  description:
    "DreamRiver is launching June 1, 2026. AI-powered biblical dream interpretation. Join the waitlist to be the first to experience it.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "DreamRiver — Coming Soon",
    description:
      "AI-powered biblical dream interpretation. Launching June 1, 2026.",
    type: "website",
  },
};

export default function ComingSoonPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated water background — five horizontal ripples + shimmer */}
      <div className="water-bg" aria-hidden="true">
        <div className="shimmer-overlay" aria-hidden="true" />
        {[35, 48, 62, 75, 88].map((top, i) => (
          <div
            key={top}
            className="ripple-line"
            style={{
              top: `${top}%`,
              animationDelay: `${i * 1.6}s`,
              animationDuration: `${7 + i * 1.2}s`,
            }}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Foreground content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-6 sm:px-8 py-5 flex items-center justify-between">
          <span className="font-blanka tracking-[0.15em] text-[18px] text-foreground">
            DREAMRIVER
          </span>
          <span className="text-[13px] font-medium text-muted-foreground">
            {LAUNCH_LABEL}
          </span>
        </header>

        {/* Main: two-column desktop, stacked mobile (mockup above copy) */}
        <main className="flex-1 flex items-center justify-center px-6 py-10 sm:px-8 sm:py-16">
          <div className="w-full max-w-[960px] grid grid-cols-1 md:grid-cols-[minmax(0,520px)_minmax(0,320px)] gap-10 md:gap-16 items-center">
            {/* Phone mockup — first in DOM order so it sits ABOVE copy on mobile.
                Desktop reorders to the right column via grid placement. */}
            <div className="flex justify-center md:order-2 md:col-start-2">
              <div className="animate-phone-float">
                <IOSDevice width={270} height={580}>
                  <PhoneMockup />
                </IOSDevice>
              </div>
            </div>

            {/* Copy + form + countdown */}
            <div className="md:order-1 md:col-start-1 text-center md:text-left">
              {/* Eyebrow pill */}
              <div
                className="inline-flex items-center px-4 py-1.5 rounded-full mb-5 text-[13px] font-semibold tracking-wide backdrop-blur-sm"
                style={{
                  background: "oklch(0.92 0.04 75 / 0.6)",
                  border: "1px solid oklch(0.82 0.06 75 / 0.4)",
                  color: "oklch(0.65 0.16 60)",
                }}
              >
                ✦ Launching June 1, 2026
              </div>

              {/* Headline — 48px (md+), scales down on mobile */}
              <h1 className="font-serif leading-[1.12] text-foreground text-balance mb-4 text-[clamp(2rem,7vw,3rem)]">
                Discover What God Is Saying Through Your Dreams
              </h1>

              {/* Subhead */}
              <p className="text-[17px] leading-relaxed text-muted-foreground max-w-[420px] mx-auto md:mx-0 mb-8">
                AI-powered biblical dream interpretation. Journal your dreams,
                receive scripture-backed insights in seconds. Be the first to
                experience it.
              </p>

              {/* Email form */}
              <div className="flex justify-center md:justify-start">
                <ComingSoonForm />
              </div>

              <p className="text-[12px] text-muted-foreground/70 mt-3">
                Free to start. No spam, ever. Unsubscribe anytime.
              </p>

              {/* Countdown */}
              <div className="mt-10">
                <div className="text-[11px] font-semibold tracking-[0.1em] uppercase text-muted-foreground mb-3 text-center md:text-left">
                  Launching in
                </div>
                <div className="flex justify-center md:justify-start">
                  <Countdown target={LAUNCH_TARGET_ISO} />
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-muted-foreground">
          <span>© {new Date().getFullYear()} DreamRiver. All rights reserved.</span>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link
              href="/sign-in"
              className="hover:text-foreground transition-colors opacity-50"
            >
              Sign in
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
