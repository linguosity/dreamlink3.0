// app/landing/page.tsx
//
// Marketing landing page for DreamRiver.
// Converts visitors with: Hero, Social Proof, How It Works, Sample, Features, FAQ, Final CTA.

import Link from "next/link";
import {
  BookOpen,
  Brain,
  SlidersHorizontal,
  Star,
  ChevronRight,
  PenLine,
  Sparkles,
  BookOpenCheck,
  ChevronDown,
} from "lucide-react";
import HeroVisual from "@/components/HeroVisual";
import SiteHeader from "@/components/SiteHeader";
import Wordmark from "@/components/Wordmark";
import SocialLinks from "@/components/SocialLinks";
import NewsletterForm from "@/components/NewsletterForm";
import SocialProof from "@/components/SocialProof";
import { getTestimonials, getUserCount } from "@/lib/testimonials";

// v2 Moonwater: feature icon chips read as a unified pale-gold set
// (no purple/teal one-offs). Background + border mirror the "step" circles
// from the How-It-Works section above.
const FEATURE_ICON =
  "text-[color:var(--gold-deep)] bg-[oklch(0.95_0.05_75)] ring-1 ring-[oklch(0.85_0.08_75)]";

const STEPS = [
  {
    step: 1,
    title: "Write",
    desc: "Describe your dream in your own words.",
    Icon: PenLine,
  },
  {
    step: 2,
    title: "Analyze",
    desc: "AI finds biblical themes and scripture connections.",
    Icon: Sparkles,
  },
  {
    step: 3,
    title: "Reflect",
    desc: "Read your personalized interpretation with Bible verses.",
    Icon: BookOpenCheck,
  },
];

const FEATURES = [
  {
    icon: BookOpen,
    title: "Biblical References",
    desc: "Every interpretation grounded in scripture, not speculation.",
    color: FEATURE_ICON,
    href: "/sign-up",
  },
  {
    icon: Brain,
    title: "AI Dream Analysis",
    desc: "Powered by advanced AI trained to understand dream symbolism.",
    color: FEATURE_ICON,
    href: "/sign-up",
  },
  {
    icon: SlidersHorizontal,
    title: "Personalized Reading Levels",
    desc: "From simple to scholarly, matched to your preference.",
    color: FEATURE_ICON,
    href: "/sign-up",
  },
];

const FAQS = [
  {
    q: "Is DreamRiver affiliated with a specific church or denomination?",
    a: "No. DreamRiver provides scripture-grounded interpretations and welcomes believers from every tradition. All scripture references use widely accepted translations.",
  },
  {
    q: "How does the AI generate biblical interpretations?",
    a: "We combine a reasoning model with structured scripture retrieval. The AI identifies recurring biblical themes in your dream, surfaces supporting verses, and explains the connection in plain language.",
  },
  {
    q: "Is my dream journal private?",
    a: "Yes. Your entries are stored securely and only visible to you. We never use your private dreams to train models or share them with third parties.",
  },
  {
    q: "Do I need to pay to start?",
    a: "No credit card is required. You can create an account and receive interpretations for free. Paid tiers unlock longer analyses, more detail, and custom reading levels.",
  },
];

export default async function LandingPage() {
  // Social proof is admin-managed; fetched server-side (service role) so it
  // works for logged-out visitors despite site_settings' admin-only RLS.
  const [testimonials, userCount] = await Promise.all([
    getTestimonials(),
    getUserCount(),
  ]);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* ── Hero Section ───────────────────────────────────────────── */}
      {/* v2 Moonwater: Night gradient + cream type + two soft moon-glow
          radials (one gold upper-right, one blue lower-left) per hi-fi-splash. */}
      <section className="relative overflow-hidden bg-[linear-gradient(160deg,var(--night-deep)_0%,var(--night)_50%,var(--night-soft)_100%)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 right-32 w-[360px] h-[360px] rounded-full
                     bg-[radial-gradient(circle,oklch(0.5_0.12_75/0.30)_0%,transparent_60%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-16 w-[260px] h-[260px] rounded-full
                     bg-[radial-gradient(circle,oklch(0.4_0.08_245/0.35)_0%,transparent_60%)]"
        />

        <div
          className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8
                     pt-[calc(theme(spacing.16)+env(safe-area-inset-top))]
                     pb-28 sm:pt-24 sm:pb-16 lg:pt-28 lg:pb-20"
        >
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-12 xl:gap-16 items-center [&>*]:min-w-0">
            {/* Copy */}
            <div className="text-center lg:text-left">
              <h1
                className="leading-[1.05] tracking-tight text-[color:var(--cream)] text-balance
                           text-[clamp(2rem,5.5vw,4rem)]
                           max-w-[14ch] mx-auto lg:mx-0 lg:max-w-[18ch]"
              >
                Discover Biblical Insight through your Dreams
              </h1>

              <p className="mt-6 text-base sm:text-lg lg:text-xl text-[oklch(0.82_0.02_75)] max-w-prose mx-auto lg:mx-0 leading-relaxed">
                Record your dreams and receive scripture-rooted reflections,
                recurring themes, and spiritual insight to help you pray,
                reflect, and understand.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-center lg:justify-start">
                <Link
                  href="/sign-up"
                  className="w-full sm:w-auto whitespace-nowrap
                             inline-flex items-center justify-center h-12 px-7 rounded-full
                             bg-primary hover:bg-primary-hover active:translate-y-px
                             text-primary-foreground text-base font-semibold
                             transition-[background-color,box-shadow,transform] duration-150
                             hover:shadow-lg hover:shadow-primary/30
                             focus-ring"
                >
                  Start Your Dream Journal &mdash; Free
                </Link>
                <a
                  href="#sample-interpretation"
                  className="w-full sm:w-auto whitespace-nowrap
                             inline-flex items-center justify-center h-12 px-7 rounded-full
                             border border-[oklch(0.35_0.03_250)]
                             text-[color:var(--cream)] text-base font-medium
                             hover:bg-[oklch(0.30_0.07_252/0.45)] transition-colors
                             focus-ring"
                >
                  See an example
                </a>
              </div>

              <p className="mt-4 text-sm text-[oklch(0.70_0.03_75)]">
                Start free. No credit card required.
              </p>

              {/* Social proof — admin-managed rotating testimonials; shows the
                  live user count only once we pass the threshold. */}
              <SocialProof testimonials={testimonials} userCount={userCount} />
            </div>

            <div className="mt-4 lg:mt-0 flex justify-center lg:justify-end">
              <HeroVisual />
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="scroll-mt-20 py-20 sm:py-24 lg:py-32 bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-balance text-[clamp(2rem,4vw,3rem)] text-center text-gray-900 dark:text-white mb-3">
            How It Works
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-12 lg:mb-16">
            Three simple steps from dream to scripture-grounded insight.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
            <div className="hidden md:block absolute top-8 left-[calc(33.33%+0.5rem)] right-[calc(33.33%+0.5rem)]">
              <div className="flex items-center justify-between px-4">
                <ChevronRight className="w-5 h-5 text-primary/60" aria-hidden="true" />
                <div className="flex-1 h-px bg-border mx-1" />
                <ChevronRight className="w-5 h-5 text-primary/60" aria-hidden="true" />
              </div>
            </div>

            {STEPS.map(({ step, title, desc, Icon }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="relative w-16 h-16 rounded-full flex items-center justify-center
                                bg-gradient-to-br from-accent to-accent/60
                                text-gold
                                ring-1 ring-accent mb-4">
                  <Icon className="w-7 h-7" aria-hidden="true" />
                  <span
                    aria-hidden="true"
                    className="absolute -top-1.5 -right-1.5 w-[22px] h-[22px] rounded-full
                               bg-primary text-primary-foreground text-[11px] font-bold
                               flex items-center justify-center"
                  >
                    {step}
                  </span>
                  <span className="sr-only">Step {step}:</span>
                </div>
                <h3 className="text-lg text-gray-900 dark:text-white mb-2">
                  {title}
                </h3>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed max-w-xs">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sample Interpretation ─────────────────────────────────── */}
      <section
        id="sample-interpretation"
        className="scroll-mt-20 py-20 sm:py-24 lg:py-32 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="inline-block font-mono text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-deep)] mb-3">
              See it in action
            </span>
            <h2 className="text-balance text-[clamp(1.75rem,3.5vw,2.5rem)] text-gray-900 dark:text-white">
              A real interpretation
            </h2>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg ring-1 ring-gray-200/70 dark:ring-slate-800 p-8 sm:p-10 lg:p-12 max-w-3xl mx-auto">
            <div className="text-gold text-6xl sm:text-7xl font-serif leading-none mb-4" aria-hidden="true">
              &ldquo;
            </div>

            <blockquote className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white leading-snug mb-6">
              I was walking across a bridge over a river of golden light...
            </blockquote>

            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Analysis:
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                Your dream of crossing a bridge over golden light speaks to a
                season of divine transition. The glowing river represents
                God&apos;s presence guiding you through change, while the bridge
                symbolizes faith carrying you from one chapter to the next.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {["Isaiah 43:2", "Psalm 23:4", "Revelation 22:1"].map((verse) => (
                <Link
                  key={verse}
                  href={`/sign-up?verse=${encodeURIComponent(verse)}`}
                  className="tap inline-flex items-center px-3 rounded-full
                             bg-accent dark:bg-accent
                             text-accent-foreground text-sm font-medium
                             hover:bg-accent/70 transition-colors
                             focus-ring"
                >
                  {verse}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section
        id="features"
        className="scroll-mt-20 py-20 sm:py-24 lg:py-32 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-balance text-[clamp(2rem,4vw,3rem)] text-center text-gray-900 dark:text-white mb-3">
            Features
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-12 lg:mb-16">
            Built for believers who want to hear God in their dreams.
          </p>

          {/* 1 → 3 columns; the 2-column middle state was orphaning the third
              card into a lonely second row. */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 [&>*]:h-full">
            {FEATURES.map(({ icon: Icon, title, desc, color, href }) => (
              <Link
                key={title}
                href={href}
                className="group flex flex-col bg-white dark:bg-slate-900 rounded-2xl
                           ring-1 ring-gray-200/70 dark:ring-slate-800
                           p-6 sm:p-8 transition
                           hover:shadow-lg hover:-translate-y-1 hover:ring-gold-light
                           focus-ring"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${color} grid place-items-center mb-5`}
                >
                  <Icon className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="text-xl text-gray-900 dark:text-white mb-2">
                  {title}
                </h3>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  {desc}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Plans (consolidated, per Moonwater landing design) ──────
          Two cards only: Free and a "DreamRiver Plus" teaser with no
          dollar amounts — the full 3-tier breakdown stays on /pricing. */}
      <section
        id="plans"
        className="scroll-mt-20 py-20 sm:py-24 lg:py-32 bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 lg:mb-12">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--gold-deep)] dark:text-gold">
              Simple &amp; honest
            </p>
            <h2 className="text-balance text-[clamp(2rem,4vw,3rem)] text-gray-900 dark:text-white mt-3 mb-3">
              Start free. Upgrade when you&rsquo;re ready.
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
              Create a free journal and get 3 dream interpretation credits —
              no credit card required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Free */}
            <div className="flex flex-col rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--gold-deep)]">
                Free
              </p>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="font-serif text-4xl text-gray-900 dark:text-white leading-none">
                  $0
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  to start
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 mb-5">
                Everything you need to hear from your first dreams.
              </p>
              <ul className="grid gap-2.5 mb-7 text-sm text-gray-800 dark:text-gray-200">
                {[
                  "3 dream interpretation credits",
                  "Private dream journal",
                  "Biblical references & insights",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span aria-hidden className="text-[color:var(--gold-deep)] mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className="mt-auto inline-flex items-center justify-center h-12 px-6 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground text-base font-semibold transition-colors focus-ring"
              >
                Start free
              </Link>
            </div>

            {/* DreamRiver Plus (Night card) */}
            <div className="relative overflow-hidden flex flex-col rounded-2xl border border-night-soft bg-[linear-gradient(165deg,var(--night)_0%,var(--night-deep)_100%)] p-7 sm:p-8">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-light">
                  DreamRiver Plus
                </p>
                <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-night-deep bg-gold px-2.5 py-1 rounded-full">
                  Upgrade
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="font-serif text-4xl text-cream leading-none">
                  More
                </span>
                <span className="text-sm text-cream/60">when you need it</span>
              </div>
              <p className="text-sm text-cream/60 mt-2 mb-5">
                Go deeper when 3 credits isn&rsquo;t enough.
              </p>
              <ul className="grid gap-2.5 mb-7 text-sm text-cream/90">
                {[
                  "More interpretation credits",
                  "Deeper, scholarly interpretation",
                  "Pattern & theme tracking",
                  "Everything in Free",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span aria-hidden className="text-gold mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className="mt-auto inline-flex items-center justify-center h-12 px-6 rounded-full bg-gold hover:bg-gold-light text-night-deep text-base font-semibold transition-colors focus-ring"
              >
                Start free — upgrade anytime
              </Link>
            </div>
          </div>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
            <Link
              href="/pricing"
              className="text-[color:var(--gold-deep)] dark:text-gold font-semibold hover:underline underline-offset-4"
            >
              See full plan details →
            </Link>
          </p>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-20 py-20 sm:py-24 bg-white dark:bg-slate-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 lg:mb-12">
            <h2 className="text-balance text-[clamp(1.75rem,3.5vw,2.5rem)] text-gray-900 dark:text-white mb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Everything you need to know before you start.
            </p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-slate-800 border-y border-gray-200 dark:border-slate-800">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group py-4">
                <summary
                  className="flex items-center justify-between cursor-pointer list-none gap-4
                             text-base font-medium text-gray-900 dark:text-white
                             focus-ring rounded"
                >
                  <span>{q}</span>
                  <ChevronDown
                    className="w-5 h-5 shrink-0 transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-3 text-gray-700 dark:text-gray-300 leading-relaxed">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[linear-gradient(165deg,var(--night)_0%,var(--night-deep)_100%)] py-20 sm:py-24 lg:py-28">
        {/* moon-glow halo above the heading */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full
                     bg-[radial-gradient(ellipse,oklch(0.5_0.12_75/0.25)_0%,transparent_60%)]"
        />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-balance text-[color:var(--cream)] text-[clamp(2rem,4vw,3rem)] leading-tight mb-8 max-w-3xl mx-auto">
            Begin Your Spiritual Dream Journey Today
          </h2>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
            <Link
              href="/sign-up"
              className="w-full sm:w-auto whitespace-nowrap
                         inline-flex items-center justify-center h-12 px-8 rounded-full
                         bg-primary hover:bg-primary-hover
                         text-primary-foreground text-base font-semibold
                         transition-[background-color,box-shadow,transform] duration-150
                         hover:shadow-lg hover:shadow-primary/30
                         active:translate-y-px
                         focus-ring focus-visible:ring-offset-[color:var(--night)]"
            >
              Start Your Dream Journal &mdash; Free
            </Link>
            <a
              href="#sample-interpretation"
              className="w-full sm:w-auto whitespace-nowrap
                         inline-flex items-center justify-center h-12 px-6 rounded-full
                         text-[oklch(0.78_0.025_75)] hover:text-[color:var(--cream)] text-base font-medium
                         underline underline-offset-4
                         focus-ring focus-visible:ring-offset-[color:var(--night)]"
            >
              See an example
            </a>
          </div>

          <p className="mt-8 text-sm text-[oklch(0.65_0.03_75)] max-w-md mx-auto">
            This app is not affiliated with any particular church or
            denomination. All are welcome.
          </p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="bg-[color:var(--night-deep)] border-t border-[oklch(0.28_0.03_250)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid gap-10 md:grid-cols-12">
          {/* Brand block: spans 5/12 on desktop, full width on mobile */}
          <div className="md:col-span-5">
            <Wordmark className="text-[color:var(--cream)] text-xl" />
            <p className="mt-3 text-sm text-[oklch(0.68_0.025_75)] max-w-xs leading-relaxed">
              AI-powered dream interpretation with Biblical wisdom.
            </p>

            <NewsletterForm />

            <div className="mt-6 flex gap-3">
              <SocialLinks />
            </div>

            {/* slot: App Store / Google Play badges */}
            <div className="mt-6 flex gap-3" aria-label="Download the app">
              {/* Add App Store / Google Play badges here */}
            </div>
          </div>

          {/* Link columns: 7/12, semantic <nav> for screen readers */}
          <nav
            className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8"
            aria-label="Footer"
          >
            <div>
              <h3 className="font-semibold text-[color:var(--cream)] mb-3 text-sm">Product</h3>
              <ul className="space-y-2 text-sm text-[oklch(0.7_0.025_75)]">
                <li>
                  <a href="#features" className="hover:text-[color:var(--cream)] transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <Link href="/sign-up" className="hover:text-[color:var(--cream)] transition-colors">
                    Start Free
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-[color:var(--cream)] mb-3 text-sm">Support</h3>
              <ul className="space-y-2 text-sm text-[oklch(0.7_0.025_75)]">
                <li>
                  <Link href="/help" className="hover:text-[color:var(--cream)] transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-[color:var(--cream)] transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-[color:var(--cream)] mb-3 text-sm">Legal</h3>
              <ul className="space-y-2 text-sm text-[oklch(0.7_0.025_75)]">
                <li>
                  <Link href="/privacy" className="hover:text-[color:var(--cream)] transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-[color:var(--cream)] transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="border-t border-[oklch(0.28_0.03_250)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 text-center text-xs text-[oklch(0.55_0.02_250)]">
            &copy; {new Date().getFullYear()} DreamRiver. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
