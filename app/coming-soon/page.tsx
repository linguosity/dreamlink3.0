// app/coming-soon/page.tsx
//
// Pre-launch splash. Shown to all non-admin visitors when the
// `coming_soon_enabled` flag in site_settings is ON. Admins (allowlist or
// is_admin) bypass the gate via proxy.ts and see the real app.
//
// Lightweight by design: no Three.js water, no big mockups — just wordmark,
// headline, subhead, and a waitlist email field. The whole point of pre-
// launch mode is to be cheap to load and not distract from "we're shipping
// soon."

import type { Metadata } from "next";
import ComingSoonForm from "./ComingSoonForm";

export const metadata: Metadata = {
  title: "DreamRiver — Coming Soon",
  description:
    "DreamRiver is launching soon. Join the waitlist to be the first to receive scripture-grounded biblical dream interpretations.",
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Warm gradient background — water-and-light feel without animation */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-gradient-to-b from-cream via-background to-blue-soft/30"
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_30%_80%,oklch(0.85_0.10_75/0.4),transparent_55%),radial-gradient(ellipse_at_70%_30%,oklch(0.85_0.07_235/0.35),transparent_50%)]"
      />

      <main className="relative w-full max-w-xl mx-auto px-6 py-20 text-center">
        {/* Wordmark */}
        <p className="font-blanka tracking-[0.18em] text-base text-foreground/80 mb-12">
          DREAMRIVER
        </p>

        {/* Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold tracking-wider uppercase mb-6">
          <span aria-hidden="true">✦</span>
          Launching soon
        </div>

        {/* Headline */}
        <h1 className="font-serif text-4xl sm:text-5xl leading-[1.1] text-foreground text-balance mb-5">
          Where dreams meet scripture.
        </h1>

        {/* Subhead */}
        <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto mb-10">
          DreamRiver is preparing for launch. Join the waitlist and we&apos;ll
          let you know the moment it opens.
        </p>

        <ComingSoonForm />

        <p className="mt-12 text-xs text-muted-foreground">
          Already an admin?{" "}
          <a
            href="/sign-in"
            className="text-primary hover:underline focus-ring rounded"
          >
            Sign in
          </a>
        </p>
      </main>
    </div>
  );
}
