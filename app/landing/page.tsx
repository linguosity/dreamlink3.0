// app/landing/page.tsx
//
// Marketing landing page for DreamRiver.
// Converts visitors with: Hero, Social Proof, How It Works, Features, Testimonial, Final CTA.
// Fully responsive: mobile-first design with tablet and desktop breakpoints.

import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  BookOpen,
  Brain,
  SlidersHorizontal,
  Star,
  ChevronRight,
} from "lucide-react";
import { HeroPhoneMockup } from "@/components/HeroPhoneMockup";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* ── Navigation ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-gray-100/50 dark:border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/landing" className="font-blanka tracking-wider text-xl text-gray-900 dark:text-white">
            DreamRiver
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            <a
              href="#features"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
            >
              How It Works
            </a>
            <Link href="/sign-in" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/sign-up">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6">
                Sign Up
              </Button>
            </Link>
          </div>

          {/* Mobile CTA */}
          <div className="md:hidden">
            <Link href="/sign-up">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Semi-transparent overlay — water animation shows through */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-white/70 dark:from-slate-900/50 dark:to-slate-950/70" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 sm:pt-24 sm:pb-16 lg:pt-28 lg:pb-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Copy */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white">
                Discover What God
                <br className="hidden sm:block" />
                {" "}Is Saying Through
                <br className="hidden sm:block" />
                {" "}Your Dreams
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                AI-powered biblical dream interpretation. Journal your dreams,
                receive scripture-backed insights in seconds.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/sign-up">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-6 text-base font-semibold shadow-lg shadow-blue-600/25"
                  >
                    Start Your Dream Journal &mdash; Free
                  </Button>
                </Link>
              </div>

              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Free forever. No credit card required.
              </p>
            </div>

            {/* Phone mockup — scroll-driven flip animation */}
            <HeroPhoneMockup />
          </div>
        </div>
      </section>

      {/* ── Social Proof Bar ───────────────────────────────────────── */}
      <section className="bg-blue-600 dark:bg-blue-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            {/* Stars */}
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-5 h-5 text-yellow-300 fill-yellow-300"
                />
              ))}
            </div>

            <p className="text-white text-sm sm:text-base font-medium text-center">
              Join 2,000+ believers exploring God&apos;s messages in their
              dreams.
            </p>

            {/* Avatars */}
            <div className="flex -space-x-2">
              {["bg-blue-300", "bg-purple-300", "bg-pink-300", "bg-amber-300"].map(
                (bg, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 ${bg} rounded-full border-2 border-blue-600 dark:border-blue-700`}
                  />
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────── */}
      <section id="how-it-works" className="py-16 sm:py-20 lg:py-24 bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-white mb-12 sm:mb-16">
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
            {/* Connecting arrows (desktop only) */}
            <div className="hidden md:block absolute top-8 left-[calc(33.33%+0.5rem)] right-[calc(33.33%+0.5rem)]">
              <div className="flex items-center justify-between px-4">
                <ChevronRight className="w-5 h-5 text-blue-400" />
                <div className="flex-1 h-px bg-blue-200 dark:bg-blue-800 mx-1" />
                <ChevronRight className="w-5 h-5 text-blue-400" />
              </div>
            </div>

            {[
              {
                step: 1,
                title: "Write",
                desc: "Describe your dream in your own words.",
              },
              {
                step: 2,
                title: "Analyze",
                desc: "AI finds biblical themes and scripture connections.",
              },
              {
                step: 3,
                title: "Reflect",
                desc: "Read your personalized interpretation with Bible verses.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl sm:text-2xl font-bold mb-4">
                  {step}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed max-w-xs">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section id="features" className="py-16 sm:py-20 lg:py-24 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-white mb-12 sm:mb-16">
            Features
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: BookOpen,
                title: "Biblical References",
                desc: "Every interpretation grounded in scripture, not speculation.",
                color: "text-blue-600 bg-blue-100 dark:bg-blue-900/40",
              },
              {
                icon: Brain,
                title: "AI Dream Analysis",
                desc: "Powered by advanced AI trained to understand dream symbolism.",
                color: "text-purple-600 bg-purple-100 dark:bg-purple-900/40",
              },
              {
                icon: SlidersHorizontal,
                title: "Personalized Reading Levels",
                desc: "From simple to scholarly, matched to your preference.",
                color: "text-teal-600 bg-teal-100 dark:bg-teal-900/40",
              },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 sm:p-8 text-center hover:shadow-lg transition-shadow"
              >
                <div
                  className={`w-14 h-14 rounded-xl ${color} flex items-center justify-center mx-auto mb-5`}
                >
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonial ────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 lg:py-24 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-50 dark:bg-slate-900 rounded-2xl p-8 sm:p-10 lg:p-12">
            {/* Quote mark */}
            <div className="text-blue-600 dark:text-blue-400 text-6xl sm:text-7xl font-serif leading-none mb-4">
              &ldquo;
            </div>

            <blockquote className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white leading-snug mb-6">
              I was walking across a bridge over a river of golden light...
            </blockquote>

            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Analysis:
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Your dream of crossing a bridge over golden light speaks to a
                season of divine transition. The glowing river represents
                God&apos;s presence guiding you through change, while the
                bridge symbolizes faith carrying you from one chapter to
                the next.
              </p>
            </div>

            {/* Scripture tags */}
            <div className="flex flex-wrap gap-2">
              {["Isaiah 43:2", "Psalm 23:4", "Revelation 22:1"].map(
                (verse) => (
                  <span
                    key={verse}
                    className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-medium px-3 py-1.5 rounded-full"
                  >
                    {verse}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────── */}
      <section className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-6">
            Begin Your Spiritual Dream Journey Today.
          </h2>

          <Link href="/sign-up">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-6 text-base font-semibold shadow-lg shadow-blue-600/25"
            >
              Start Your Dream Journal &mdash; Free
            </Button>
          </Link>

          <p className="mt-6 text-sm text-gray-400 max-w-md mx-auto">
            This app is not affiliated with any particular church or
            denomination. All are welcome.
          </p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="bg-slate-950/95 dark:bg-black/95 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <h3 className="font-blanka tracking-wider text-lg text-white mb-3">DreamRiver</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                AI-powered dream interpretation with Biblical wisdom.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3 text-sm">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <Link href="/sign-up" className="hover:text-white transition-colors">
                    Free Trial
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3 text-sm">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/help" className="hover:text-white transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-8 pt-6 text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} DreamRiver. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
