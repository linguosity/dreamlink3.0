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
// animate-phone-float). Countdown + typewriter are the only client-state
// pieces.
//
// Text on this page uses the FIXED (theme-invariant) Deep Current brand
// tokens — var(--mist), var(--violet-lt), var(--navy-800) — rather than the
// semantic var(--foreground)/var(--muted-foreground) pair. This splash is
// always dark regardless of the visitor's OS/app theme, and critically the
// nested <PhoneMockup> (an always-LIGHT illustration of the in-app UI) uses
// those same semantic tokens for its own text — wrapping this page in a
// `.dark` class to get themed tokens here would leak dark-mode values into
// that nested light mockup via normal CSS inheritance.

import type { Metadata } from "next";
import Link from "next/link";
import ComingSoonForm from "./ComingSoonForm";
import Countdown from "./Countdown";
import IOSDevice from "./IOSDevice";
import PhoneMockup from "./PhoneMockup";
import { BrandIcon } from "@/components/brand/BrandIcon";

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
    // The splash renders on the flat Navy 900 surface (`water-bg-night`).
    // Same atmosphere as the app icon — they reinforce each other on social.
    // Ripple-lines stay visible because they're white-on-translucent.
    // Foreground type goes Mist (fixed near-white, see file header note).
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ color: "var(--mist)" }}
    >
      {/* Animated water background — Navy 900 + ripples */}
      <div className="water-bg water-bg-night" aria-hidden="true">
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
        {/* Header — contained mark + wordmark on Mist */}
        <header className="px-6 sm:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandIcon size={28} alt="" />
            <span
              className="wordmark text-[22px]"
              style={{ color: "var(--mist)" }}
            >
              DreamRiver
            </span>
          </div>
          <span
            className="text-[13px] font-medium"
            style={{ color: "var(--violet-lt)" }}
          >
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
                <IOSDevice width={260} height={640}>
                  <PhoneMockup />
                </IOSDevice>
              </div>
            </div>

            {/* Copy + form + countdown */}
            <div className="md:order-1 md:col-start-1 text-center md:text-left">
              {/* Eyebrow pill — Violet Light accent on translucent Navy glass */}
              <div
                className="inline-flex items-center px-4 py-1.5 rounded-full mb-5 text-[13px] font-semibold tracking-wide backdrop-blur-sm"
                style={{
                  background:
                    "color-mix(in oklab, var(--navy-800) 55%, transparent)",
                  border:
                    "1px solid color-mix(in oklab, var(--violet-lt) 50%, transparent)",
                  color: "var(--violet-lt)",
                }}
              >
                ✦ Launching June 1, 2026
              </div>

              {/* Headline — 48px (md+), scales down on mobile. Mist on Navy. */}
              <h1
                className="font-serif leading-[1.12] text-balance mb-4 text-[clamp(2rem,7vw,3rem)]"
                style={{ color: "var(--mist)" }}
              >
                Discover Biblical Insight through your Dreams
              </h1>

              {/* Subhead — muted Mist */}
              <p
                className="text-[17px] leading-relaxed max-w-[420px] mx-auto md:mx-0 mb-8"
                style={{ color: "var(--mist-2)" }}
              >
                Record your dreams and receive scripture-rooted reflections,
                recurring themes, and spiritual insight to help you pray,
                reflect, and understand. Be the first to experience it.
              </p>

              {/* Email form */}
              <div className="flex justify-center md:justify-start">
                <ComingSoonForm />
              </div>

              <p
                className="text-[12px] mt-3"
                style={{
                  color: "color-mix(in oklab, var(--mist-2) 75%, transparent)",
                }}
              >
                Free to start. No spam, ever. Unsubscribe anytime.
              </p>

              {/* Countdown */}
              <div className="mt-10">
                <div
                  className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-3 text-center md:text-left"
                  style={{ color: "var(--violet-lt)" }}
                >
                  Launching in
                </div>
                <div className="flex justify-center md:justify-start">
                  <Countdown target={LAUNCH_TARGET_ISO} />
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer — muted Mist so it stays subordinate on Navy */}
        <footer
          className="px-6 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px]"
          style={{ color: "color-mix(in oklab, var(--mist-2) 70%, transparent)" }}
        >
          <span>© {new Date().getFullYear()} DreamRiver. All rights reserved.</span>
          <div className="flex items-center gap-5">
            <Link
              href="/privacy"
              className="transition-colors hover:text-[var(--mist)]"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-[var(--mist)]"
            >
              Terms
            </Link>
            <Link
              href="/sign-in"
              className="transition-colors opacity-60 hover:opacity-100 hover:text-[var(--mist)]"
            >
              Sign in
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
