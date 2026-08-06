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
import RecentPosts from "@/components/RecentPosts";
import ScrollytellingInterpretation from "@/components/landing/ScrollytellingInterpretation";
import { CookiePreferencesLink } from "@/components/CookieConsent";
import { getTestimonials, getUserCount } from "@/lib/testimonials";

// v3 Deep Current: feature icon chips read as a unified pale-violet set
// (no purple/teal one-offs). Background + border mirror the "step" circles
// from the How-It-Works section above.
const FEATURE_ICON = "text-primary bg-violet-050 ring-1 ring-mist-2";

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
      {/* v3 Deep Current: flat Navy 900 ground + Mist type. No gradient
          outside the logo (HANDOFF-v3.md §0/§8) — the v2 night gradient and
          the v2 gold/blue moon-glow radials are gone. */}
      <section className="relative overflow-hidden bg-navy-900">
        <div
          className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8
                     pt-[calc(theme(spacing.16)+env(safe-area-inset-top))]
                     pb-28 sm:pt-24 sm:pb-16 lg:pt-28 lg:pb-20"
        >
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-12 xl:gap-16 items-center [&>*]:min-w-0">
            {/* Copy */}
            <div className="text-center lg:text-left">
              <h1
                className="leading-[1.05] tracking-tight text-mist text-balance
                           text-[clamp(2rem,5.5vw,4rem)]
                           max-w-[14ch] mx-auto lg:mx-0 lg:max-w-[18ch]"
              >
                Discover Biblical Insight through your Dreams
              </h1>

              <p className="mt-6 text-base sm:text-lg lg:text-xl text-mist-2 max-w-prose mx-auto lg:mx-0 leading-relaxed">
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
                             border border-navy-800
                             text-mist text-base font-medium
                             hover:bg-navy-800/45 transition-colors
                             focus-ring"
                >
                  See an example
                </a>
              </div>

              <p className="mt-4 text-sm text-mist-2">
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
                                bg-accent
                                text-primary
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

      {/* ── Sample Interpretation (scrollytelling demo) ───────────── */}
      <ScrollytellingInterpretation />

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
            Built for believers who want to discover meaningful insight in their dreams.
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
                           hover:shadow-lg hover:-translate-y-1 hover:ring-violet-light
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

      {/* ── Plans (all three tiers inline) ──────────────────────────
          Card data mirrors app/pricing/page.tsx + lib/tierConfig.ts:
          Discovery (free, 3 lifetime credits at signup), Insight
          ($12.99/mo or $99.99/yr, 30/mo), Journey (coming soon). */}
      <section
        id="plans"
        className="scroll-mt-20 py-20 sm:py-24 lg:py-32 bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 lg:mb-12">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-primary">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Discovery (free) */}
            <div className="flex flex-col rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Discovery
              </p>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="font-serif text-4xl text-gray-900 dark:text-white leading-none">
                  $0
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  free forever
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-primary">
                3 dream analyses to start
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 mb-5">
                Begin your spiritual journey with essential dream insights.
              </p>
              <ul className="grid gap-2.5 mb-7 text-sm text-gray-800 dark:text-gray-200">
                {[
                  "3 AI dream analyses when you sign up",
                  "Dream art + biblical interpretation",
                  "Standard reading levels",
                  "Dream journal storage & search",
                  "Dream sharing",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span aria-hidden className="text-primary mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className="mt-auto inline-flex items-center justify-center h-12 px-6 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground text-base font-semibold transition-colors focus-ring"
              >
                Start Free
              </Link>
            </div>

            {/* Insight (Night card, most popular) */}
            <div className="relative overflow-hidden flex flex-col rounded-2xl border border-navy-800 bg-navy-900 p-7 sm:p-8">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-light">
                  Insight
                </p>
                <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-navy-900 bg-violet-light px-2.5 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="font-serif text-4xl text-mist leading-none">
                  $12.99
                </span>
                <span className="text-sm text-mist/60">/month</span>
              </div>
              <p className="mt-1.5 text-xs text-mist/60">
                or $99.99/yr &mdash; &asymp;$8.33/mo, save 36%
              </p>
              <p className="mt-2 text-sm font-semibold text-violet-light">
                30 dream analyses / month
              </p>
              <p className="text-sm text-mist/60 mt-2 mb-5">
                Unlock deeper spiritual insights with enhanced AI analysis.
              </p>
              <ul className="grid gap-2.5 mb-7 text-sm text-mist/90">
                {[
                  "30 AI dream analyses per month",
                  "Deeper analysis + all reading levels",
                  "Five image styles",
                  "Dream sharing",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span aria-hidden className="text-violet-light mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className="mt-auto inline-flex items-center justify-center h-12 px-6 rounded-full bg-violet-light hover:bg-mist text-navy-900 text-base font-semibold transition-colors focus-ring"
              >
                Upgrade to Insight
              </Link>
            </div>

            {/* Journey (coming soon) */}
            <div className="flex flex-col rounded-2xl border border-gray-200 dark:border-slate-800 bg-gradient-to-br from-accent/40 to-secondary p-7 sm:p-8">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Journey
                </p>
                <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-gray-600 dark:text-gray-300 bg-gray-200/80 dark:bg-slate-700 px-2.5 py-1 rounded-full">
                  Coming Soon
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="font-serif text-4xl text-gray-900 dark:text-white leading-none">
                  $19.99
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">/month</span>
              </div>
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                or $179.99/yr &mdash; &asymp;$15.00/mo, save 25%
              </p>
              <p className="mt-2 text-sm font-semibold text-primary">
                Unlimited dream analyses
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 mb-5">
                Unlimited access to divine wisdom and premium features.
              </p>
              <ul className="grid gap-2.5 mb-7 text-sm text-gray-800 dark:text-gray-200">
                {[
                  "Unlimited AI dream analyses",
                  "Deepest theological interpretations",
                  "All eight image styles",
                  "Dream sharing",
                  "Early access to new features",
                  "API access",
                  "Priority support",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span aria-hidden className="text-primary mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <span
                aria-disabled="true"
                className="mt-auto inline-flex items-center justify-center h-12 px-6 rounded-full border border-gray-300 dark:border-slate-700 text-gray-500 dark:text-gray-400 text-base font-semibold cursor-not-allowed select-none"
              >
                Coming Soon
              </span>
            </div>
          </div>
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

      {/* ── From the Journal (blog discovery) ──────────────────────── */}
      {/* Server-fetched published posts; renders nothing until the first
          post is published, so this slot invisibly no-ops today. */}
      <RecentPosts variant="landing" limit={3} />

      {/* ── Final CTA ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy-900 py-20 sm:py-24 lg:py-28">
        {/* moon-glow halo above the heading */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full
                     bg-[radial-gradient(ellipse,oklch(0.5_0.12_75/0.25)_0%,transparent_60%)]"
        />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-balance text-mist text-[clamp(2rem,4vw,3rem)] leading-tight mb-8 max-w-3xl mx-auto">
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
                         focus-ring focus-visible:ring-offset-navy-900"
            >
              Start Your Dream Journal &mdash; Free
            </Link>
            <a
              href="#sample-interpretation"
              className="w-full sm:w-auto whitespace-nowrap
                         inline-flex items-center justify-center h-12 px-6 rounded-full
                         text-mist-2 hover:text-mist text-base font-medium
                         underline underline-offset-4
                         focus-ring focus-visible:ring-offset-navy-900"
            >
              See an example
            </a>
          </div>

          <p className="mt-8 text-sm text-mist-2/80 max-w-md mx-auto">
            This app is not affiliated with any particular church or
            denomination. All are welcome.
          </p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="bg-navy-900 border-t border-navy-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid gap-10 md:grid-cols-12">
          {/* Brand block: spans 5/12 on desktop, full width on mobile */}
          <div className="md:col-span-5">
            <Wordmark className="text-mist text-xl" />
            <p className="mt-3 text-sm text-[oklch(0.68_0.025_75)] max-w-xs leading-relaxed">
              AI-powered dream interpretation with Biblical wisdom.
            </p>

            <NewsletterForm />

            <SocialLinks />

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
              <h3 className="font-semibold text-mist mb-3 text-sm">Product</h3>
              <ul className="space-y-2 text-sm text-[oklch(0.7_0.025_75)]">
                <li>
                  <a href="#features" className="hover:text-mist transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <Link
                    href="/blog?utm_source=landing&utm_medium=footer"
                    className="hover:text-mist transition-colors"
                  >
                    Journal
                  </Link>
                </li>
                <li>
                  <Link href="/sign-up" className="hover:text-mist transition-colors">
                    Start Free
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-mist mb-3 text-sm">Support</h3>
              <ul className="space-y-2 text-sm text-[oklch(0.7_0.025_75)]">
                <li>
                  <Link href="/help" className="hover:text-mist transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-mist transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-mist mb-3 text-sm">Legal</h3>
              <ul className="space-y-2 text-sm text-[oklch(0.7_0.025_75)]">
                <li>
                  <Link href="/privacy" className="hover:text-mist transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-mist transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <CookiePreferencesLink className="hover:text-mist transition-colors" />
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
