"use client";

// components/landing/DepthComparison.tsx
//
// "The same dream, read three ways" — a depth comparison block for the
// landing page. Sits immediately after <ScrollytellingInterpretation/> and
// reuses that section's demo dream, so the visitor compares against a dream
// they have already read.
//
// WHY A SEGMENTED CONTROL, AND WHY NOT INSIDE THE SCROLLY SECTION
//
// Comparison requires holding everything constant and changing one variable:
// same dream, same card, same verses — only the reading changes. It also
// requires RANDOM ACCESS, because people compare by flipping back and forth.
// That rules out a fifth scroll step (scroll is linear — you can see each
// depth but never actually compare them) and it rules out a slider (sliders
// are for continuous ranges; three discrete, mutually exclusive options is
// the textbook case for a segmented control).
//
// It lives in its own section rather than on the pinned scrolly card because
// that card's state is already driven by scroll position. A click-control on
// a scroll-driven card fights itself: tap "Journey", scroll one pixel, and
// the scroll handler overwrites the choice.
//
// Depth tiers and plan names are imported, never re-typed, so this can't
// drift from what the product actually sells (same discipline as the scrolly
// section's AESTHETIC_PRESETS import).
//
// a11y / SEO: real tablist semantics with roaming tabindex and arrow-key
// navigation. Every reading stays in the DOM at all times and inactive
// panels are hidden with `hidden`, never conditionally unmounted — matching
// ScrollytellingInterpretation's stated principle.

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { AnalysisDepth, PLAN_DEPTH_CEILING, type SubscriptionPlan } from "@/schema/profile";
import { track } from "@/lib/analytics";

/** Plan display names — same mapping the scrolly section's TIER_LABEL uses. */
const PLAN_LABEL: Record<SubscriptionPlan, string> = {
  free: "Discovery",
  visionary: "Insight",
  prophet: "Journey",
};

/** Invert PLAN_DEPTH_CEILING so each depth knows the plan that unlocks it.
 *  Derived, not hand-written, so adding a plan can't silently desync this. */
const PLAN_FOR_DEPTH = Object.fromEntries(
  (Object.entries(PLAN_DEPTH_CEILING) as [SubscriptionPlan, string][]).map(
    ([plan, depth]) => [depth, plan],
  ),
) as Record<string, SubscriptionPlan>;

type Reading = {
  depth: string;
  /** Short label for the control itself — the depth, not the plan. */
  label: string;
  /** One line on what this depth does differently. */
  summary: string;
  /** The interpretation body, one string per paragraph. */
  body: readonly string[];
  /** Verses this depth surfaces, with the theme each was matched on
   *  (HANDOFF-v3.md §5 item 2 — themed citations, not bare references). */
  verses: readonly { ref: string; theme: string }[];
};

// ⚠ DRAFT COPY — written in the established voice, NOT real model output.
// Brandon is reviewing these against what the app actually produces for this
// dream before this merges. The shape is what matters here; the words are
// placeholders that read correctly rather than invented claims about depth.
const READINGS: readonly Reading[] = [
  {
    depth: AnalysisDepth.SHALLOW,
    label: "Shallow",
    summary: "One clear meaning, plainly said, with a verse to sit with.",
    body: [
      "Your dream of crossing a bridge over golden light speaks to a season of divine transition. The bridge is faith carrying you from one chapter to the next, and the light beneath it is God's presence going with you.",
    ],
    verses: [{ ref: "Isaiah 43:2", theme: "crossing waters" }],
  },
  {
    depth: AnalysisDepth.DEEP,
    label: "Deep",
    summary: "Symbolism unpacked, themes traced, more scripture to sit with.",
    body: [
      "Your dream of crossing a bridge over golden light speaks to a season of divine transition — and the details matter. A bridge is not a destination; it is the part of the journey where the ground beneath you belongs to neither shore. That you were walking, not stopped, suggests you are further into this passage than you feel.",
      "The river of light beneath you carries a double meaning worth holding together. Water in scripture is often what threatens to overwhelm, yet here it glows — the same element, transfigured. What you are crossing over may be the very thing you once feared.",
    ],
    verses: [
      { ref: "Isaiah 43:2", theme: "crossing waters" },
      { ref: "Psalm 23:4", theme: "passage through shadow" },
    ],
  },
  {
    depth: AnalysisDepth.PROFOUND,
    label: "Profound",
    summary: "Layered readings, original-language notes, fuller scriptural context.",
    body: [
      "Your dream of crossing a bridge over golden light speaks to a season of divine transition — and the details matter. A bridge is not a destination; it is the part of the journey where the ground beneath you belongs to neither shore. That you were walking, not stopped, suggests you are further into this passage than you feel.",
      "The river of light beneath you carries a double meaning worth holding together. Water in scripture is often what threatens to overwhelm, yet here it glows — the same element, transfigured. What you are crossing over may be the very thing you once feared.",
      "The Hebrew of Isaiah 43:2 uses ʿāḇar — to pass through, to cross over — the same verb used of Israel at the Jordan. It does not promise the waters will be absent. It promises they will not close over you. Set beside Revelation's river of life, your dream's golden water reads less as a hazard survived and more as a glimpse of where the crossing leads.",
    ],
    verses: [
      { ref: "Isaiah 43:2", theme: "crossing waters" },
      { ref: "Psalm 23:4", theme: "passage through shadow" },
      { ref: "Revelation 22:1", theme: "river of life" },
    ],
  },
] as const;

const PLAN_CHIP_CLASS: Record<SubscriptionPlan, string> = {
  free: "bg-muted text-muted-foreground dark:bg-[rgba(238,235,252,0.10)] dark:text-[rgba(238,235,252,0.72)]",
  visionary: "bg-violet-050 text-primary dark:bg-[rgba(179,155,255,0.13)]",
  prophet: "bg-navy-900 text-violet-light",
};

export default function DepthComparison() {
  const [active, setActive] = useState(1); // Deep — the middle reading reads best cold
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = useCallback((i: number) => {
    setActive(i);
    track("landing_depth_compare", { depth: READINGS[i].depth });
  }, []);

  // Roaming tabindex: arrows move AND select (automatic activation), which is
  // correct here because switching panels is instant and non-destructive.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const last = READINGS.length - 1;
      let next: number | null = null;
      if (e.key === "ArrowRight") next = active === last ? 0 : active + 1;
      else if (e.key === "ArrowLeft") next = active === 0 ? last : active - 1;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = last;
      if (next === null) return;
      e.preventDefault();
      select(next);
      tabRefs.current[next]?.focus();
    },
    [active, select],
  );

  return (
    <section
      id="depth-comparison"
      className="scroll-mt-20 bg-paper py-20 dark:bg-navy-900 sm:py-24"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <span className="mb-3 inline-block font-mono text-[11px] uppercase tracking-[0.32em] text-primary">
            How deep to go
          </span>
          <h2 className="text-balance text-[clamp(1.75rem,3.5vw,2.5rem)] text-foreground">
            The same dream, read three ways
          </h2>
          <p className="mx-auto mt-4 max-w-[52ch] text-base leading-[1.65] text-muted-foreground">
            One dream, one set of verses. Only the reading changes.
          </p>
        </div>

        {/* Segmented control */}
        <div
          role="tablist"
          aria-label="Analysis depth"
          onKeyDown={onKeyDown}
          className="mx-auto mt-9 flex max-w-md gap-1 rounded-full bg-muted p-1 dark:bg-[rgba(238,235,252,0.08)]"
        >
          {READINGS.map((r, i) => {
            const on = i === active;
            return (
              <button
                key={r.depth}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                role="tab"
                id={`depth-tab-${r.depth}`}
                aria-selected={on}
                aria-controls={`depth-panel-${r.depth}`}
                tabIndex={on ? 0 : -1}
                onClick={() => select(i)}
                className={`focus-ring flex-1 rounded-full px-3 py-2 text-sm transition-[background-color,color,box-shadow] duration-150 motion-reduce:transition-none ${
                  on
                    ? "bg-card font-medium text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {/* Panels — all rendered, inactive ones hidden (SEO + a11y). */}
        <div className="mt-8">
          {READINGS.map((r, i) => {
            const plan = PLAN_FOR_DEPTH[r.depth];
            return (
              <div
                key={r.depth}
                role="tabpanel"
                id={`depth-panel-${r.depth}`}
                aria-labelledby={`depth-tab-${r.depth}`}
                hidden={i !== active}
                className="rounded-2xl bg-card p-6 shadow-lg ring-1 ring-border dark:ring-[rgba(238,235,252,0.13)] sm:px-8 sm:py-7"
              >
                {/* Plan chip + what this depth does */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-medium ${PLAN_CHIP_CLASS[plan]}`}
                  >
                    {PLAN_LABEL[plan]}
                  </span>
                  <span className="text-sm text-muted-foreground">{r.summary}</span>
                </div>

                {/* The dream — constant across all three, so the comparison
                    has a fixed frame. */}
                <blockquote className="mt-6 border-l-2 border-border pl-4 text-[15px] italic leading-[1.6] text-muted-foreground [font-family:var(--font-serif)]">
                  I was walking across a bridge over a river of golden light&hellip;
                </blockquote>

                {/* The reading — the only thing that actually changes. */}
                <div className="mt-5 space-y-4">
                  {r.body.map((p, j) => (
                    <p
                      key={j}
                      className="max-w-[65ch] text-base leading-[1.65] text-foreground"
                    >
                      {p}
                    </p>
                  ))}
                </div>

                {/* Themed verse chips */}
                <div className="mt-6 flex flex-wrap gap-2">
                  {r.verses.map((v) => (
                    <span
                      key={v.ref}
                      className="inline-flex items-baseline gap-1.5 rounded-full bg-violet-050 px-3 py-1.5 text-[13px] text-primary dark:bg-[rgba(179,155,255,0.13)]"
                    >
                      <span className="font-medium">{v.ref}</span>
                      <span className="opacity-70">&middot; {v.theme}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-7 text-center text-sm text-muted-foreground">
          Every plan includes scripture-grounded readings.{" "}
          <Link href="/pricing" className="text-primary underline underline-offset-4">
            Compare plans
          </Link>
        </p>
      </div>
    </section>
  );
}
