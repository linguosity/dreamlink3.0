"use client";

// components/landing/ScrollytellingInterpretation.tsx
//
// "A real interpretation" — scrollytelling demo section for the landing page.
// Ported from the approved design prototype (design-handoff: light theme,
// line-by-line reveal, card-stack carousel).
//
// Desktop: the dream-journal card pins on the right while four scroll steps
// advance its state (dream → interpretation + verses → artwork → CTA).
// Mobile (<lg) and prefers-reduced-motion: fully static — every panel
// visible, no pinning, no choreography. All copy is in the DOM at all
// times (SEO + a11y); panels collapse visually, never conditionally render.
//
// Artwork comes from public/landing/dream-demo/ (see the README there);
// preset names/tiers come straight from AESTHETIC_PRESETS so the demo can
// never drift from what the product actually sells.

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen } from "lucide-react";
import {
  AESTHETIC_PRESETS,
  type AestheticTier,
} from "@/schema/imageAesthetic";
import { track } from "@/lib/analytics";

const PRESETS = Object.values(AESTHETIC_PRESETS);

const VERSES = [
  {
    id: "isa-43-2",
    ref: "Isaiah 43:2",
    text: "When thou passest through the waters, I will be with thee; and through the rivers, they shall not overflow thee: when thou walkest through the fire, thou shalt not be burned; neither shall the flame kindle upon thee.",
  },
  {
    id: "psa-23-4",
    ref: "Psalm 23:4",
    text: "Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.",
  },
  {
    id: "rev-22-1",
    ref: "Revelation 22:1",
    text: "And he shewed me a pure river of water of life, clear as crystal, proceeding out of the throne of God and of the Lamb.",
  },
] as const;

const STEP_COPY = [
  {
    num: "01",
    title: "The dream, as written",
    body: "Captured in the dreamer's own words — no forms, no categories.",
  },
  {
    num: "02",
    title: "A scripture-grounded analysis",
    body: "Every interpretation is anchored in the Word. Hover or tap any verse to read it in full.",
  },
  {
    num: "03",
    title: "Rendered as beautiful art",
    body: "The same dream, painted in eight styles. Swipe through them.",
  },
  {
    num: "04",
    title: "Your turn",
    body: "Write your latest dream and receive a reading of your own.",
  },
] as const;

const TIER_LABEL: Record<AestheticTier, string> = {
  free: "Discovery",
  visionary: "Insight",
  prophet: "Journey",
};

const TIER_CHIP_CLASS: Record<AestheticTier, string> = {
  free: "bg-muted text-muted-foreground dark:bg-[rgba(238,235,252,0.10)] dark:text-[rgba(238,235,252,0.72)]",
  // text-primary auto-swaps to Violet Light in dark mode — no separate
  // dark:text needed.
  visionary: "bg-violet-050 text-primary dark:bg-[rgba(179,155,255,0.13)]",
  // A self-contained "on dark" badge (Navy 900 + Violet Light), same
  // treatment regardless of page theme — see admin RecentSignups / settings
  // Sidebar's identical prophet-tier chip.
  prophet: "bg-navy-900 text-violet-light",
};

/** Interpretation copy, split for the line-by-line reveal. */
const INTERP_LINES = [
  "Your dream of crossing a bridge over golden light speaks to a season of divine transition.",
  "The glowing river represents God's presence guiding you through change, while the bridge symbolizes faith carrying you from one chapter to the next.",
] as const;

const SWIPE_THRESHOLD_PX = 55;
const DRAG_ARM_PX = 6;

export default function ScrollytellingInterpretation() {
  const [step, setStep] = useState(0);
  const [slide, setSlide] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [pinned, setPinned] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  // True once the visitor has opened any verse — kills the hint pulse.
  const [verseHintDone, setVerseHintDone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [reduced, setReduced] = useState(false);

  const sectionRef = useRef<HTMLElement | null>(null);
  const startX = useRef(0);
  const dragArmed = useRef(false);
  const lastTrackedStep = useRef<number | null>(null);

  // Environment: mobile breakpoint matches the lg grid switch; reduced
  // motion collapses all choreography.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    // Below ~680px of height the pinned card can't fit even fully compacted,
    // so short windows get the static (mobile-style) layout instead.
    const mh = window.matchMedia("(max-height: 679px)");
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onEnv = () => {
      setIsMobile(mq.matches || mh.matches);
      setReduced(rm.matches);
    };
    onEnv();
    mq.addEventListener("change", onEnv);
    mh.addEventListener("change", onEnv);
    rm.addEventListener("change", onEnv);
    return () => {
      mq.removeEventListener("change", onEnv);
      mh.removeEventListener("change", onEnv);
      rm.removeEventListener("change", onEnv);
    };
  }, []);

  // Scroll choreography: a step is "active" when it crosses the middle
  // band of the viewport (same margins as the approved prototype).
  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;
    const steps = Array.from(root.querySelectorAll("[data-scrolly-step]"));
    if (!steps.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const s = parseInt(en.target.getAttribute("data-scrolly-step") ?? "0", 10);
          setStep(s);
          if (lastTrackedStep.current !== s) {
            lastTrackedStep.current = s;
            track("landing_demo_step_viewed", { step: s + 1 });
          }
        });
      },
      { rootMargin: "-42% 0px -42% 0px", threshold: 0 },
    );
    steps.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Esc dismisses any open verse popover.
  useEffect(() => {
    if (!pinned && !hover) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPinned(null);
        setHover(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pinned, hover]);

  const goTo = useCallback(
    (i: number, source: "arrow" | "dot" | "keyboard" | "swipe") => {
      const n = Math.max(0, Math.min(PRESETS.length - 1, i));
      setSlide((prev) => {
        if (n !== prev) track("demo_style_swiped", { style: PRESETS[n].id, source });
        return n;
      });
    },
    [],
  );

  // Static mode shows everything at once (mobile + reduced motion).
  const staticAll = isMobile || reduced;
  const effStep = staticAll ? 3 : step;
  const interpOn = effStep >= 1;
  const artOn = effStep >= 2;
  const ctaOn = effStep >= 3;
  const compactDream = artOn && !staticAll;

  const zoneClass =
    "mt-[22px] border-t border-[rgba(14,26,48,0.09)] pt-5 transition-[opacity,transform] duration-[400ms] ease-out motion-reduce:transition-none dark:border-[rgba(238,235,252,0.12)]";
  const zoneStyle = (on: boolean): CSSProperties =>
    on
      ? { opacity: 1, transform: "none" }
      : {
          opacity: 0,
          transform: "translateY(12px)",
          pointerEvents: "none",
          maxHeight: 0,
          overflow: "hidden",
          paddingTop: 0,
          marginTop: 0,
          borderTopWidth: 0,
        };

  // Card-stack geometry (approved variation): active card front, next two
  // fanned behind to the right, previous card exits left with a tilt.
  const stackStyle = (i: number): CSSProperties => {
    const off = i - slide;
    const transition =
      dragging || reduced
        ? "none"
        : "transform 350ms cubic-bezier(.22,.61,.36,1), opacity 300ms ease";
    if (off < 0)
      return { opacity: 0, transform: "translateX(-70%) rotate(-7deg)", zIndex: 1, transition, pointerEvents: "none" };
    if (off === 0)
      return { opacity: 1, transform: `translateX(${drag}px) rotate(${drag * 0.02}deg)`, zIndex: 10, transition };
    if (off === 1)
      return { opacity: 1, transform: "translateX(6%) rotate(2.5deg) scale(0.96)", zIndex: 9, transition, pointerEvents: "none" };
    if (off === 2)
      return { opacity: 1, transform: "translateX(12%) rotate(5deg) scale(0.92)", zIndex: 8, transition, pointerEvents: "none" };
    return { opacity: 0, transform: "translateX(16%) rotate(6deg) scale(0.9)", zIndex: 1, transition, pointerEvents: "none" };
  };

  const cur = PRESETS[slide];
  const curLocked = cur.tier !== "free";

  const openVerse = (id: string, ref: string, via: "tap" | "hover_or_focus") => {
    setVerseHintDone(true);
    if (via === "tap") {
      const opening = pinned !== id;
      setPinned(opening ? id : null);
      setHover(null);
      if (opening) track("verse_tooltip_opened", { ref, via });
    } else {
      if (hover !== id && pinned !== id) track("verse_tooltip_opened", { ref, via });
      setHover(id);
    }
  };

  return (
    <section
      ref={sectionRef}
      id="sample-interpretation"
      className="scroll-mt-20 bg-paper dark:bg-navy-900"
    >
      {/* Section header */}
      <div className="mx-auto max-w-4xl px-4 pt-20 text-center sm:px-6 sm:pt-24 lg:px-8">
        <span className="mb-3 inline-block font-mono text-[11px] uppercase tracking-[0.32em] text-primary">
          In action
        </span>
        <h2 className="text-balance text-[clamp(1.75rem,3.5vw,2.5rem)] text-foreground">
          A real interpretation
        </h2>
      </div>

      {/* Scrolly grid */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-x-16 gap-y-6 px-4 pb-20 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_460px] lg:px-8 lg:pb-28">
        {/* Left rail: scroll steps */}
        <div className="order-2 flex flex-col lg:order-1">
          {STEP_COPY.map((s, i) => (
            <div
              key={s.num}
              data-scrolly-step={i}
              className="flex items-center py-6 lg:min-h-[82vh] lg:py-8"
            >
              <div
                className="max-w-[380px] transition-opacity duration-[400ms] ease-out motion-reduce:transition-none"
                style={{ opacity: staticAll || effStep === i ? 1 : 0.38 }}
              >
                <div className="font-mono text-[11px] tracking-[0.28em] text-primary">
                  {s.num}
                </div>
                <h3 className="mb-3 mt-2.5 font-serif text-[27px] font-normal text-foreground">
                  {s.title}
                </h3>
                <p className="text-base leading-[1.65] text-muted-foreground">
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Right: dream-journal card (pinned on desktop) */}
        <div className="order-1 pt-3 lg:order-2 lg:sticky lg:top-[4vh]">
          <div className="rounded-2xl bg-card p-6 shadow-lg ring-1 ring-border dark:bg-card dark:ring-[rgba(238,235,252,0.13)] sm:px-8 sm:py-7">
            {/* Dream quote */}
            <div
              aria-hidden="true"
              className="select-none text-6xl leading-[0.6] text-primary [font-family:var(--font-serif)]"
            >
              &ldquo;
            </div>
            <blockquote
              className="mt-2 italic text-foreground transition-[font-size,opacity] duration-[400ms] motion-reduce:transition-none dark:text-mist [font-family:var(--font-serif)]"
              style={
                compactDream
                  ? {
                      fontSize: "17px",
                      lineHeight: 1.45,
                      display: "-webkit-box",
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      opacity: 0.75,
                    }
                  : { fontSize: "22px", lineHeight: 1.5 }
              }
            >
              I was walking across a bridge over a river of golden light...
            </blockquote>

            {/* Interpretation + verses */}
            <div aria-hidden={!interpOn} className={zoneClass} style={zoneStyle(interpOn)}>
              <div className="mb-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.32em] text-primary">
                Analysis:
              </div>
              <p
                className="m-0 text-[15.5px] leading-[1.7] text-muted-foreground transition-opacity duration-[400ms] motion-reduce:transition-none dark:text-[rgba(238,235,252,0.72)]"
                // Like the dream quote, the analysis recedes (2-line clamp)
                // once the artwork panel arrives, so the pinned card keeps
                // fitting the viewport. Chips stay fully visible.
                style={
                  compactDream
                    ? {
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        opacity: 0.8,
                      }
                    : undefined
                }
              >
                {INTERP_LINES.map((line, i) => (
                  <span
                    key={i}
                    className="block transition-[opacity,transform] duration-[400ms] ease-out motion-reduce:transition-none"
                    style={{
                      marginTop: i > 0 ? 8 : 0,
                      opacity: interpOn ? 1 : 0,
                      transform: interpOn ? "none" : "translateY(10px)",
                      transitionDelay: interpOn ? `${80 + i * 260}ms` : "0ms",
                    }}
                  >
                    {line}
                  </span>
                ))}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {VERSES.map((v) => {
                  const visible = pinned === v.id || hover === v.id;
                  return (
                    <span key={v.id} className="relative inline-block">
                      <button
                        type="button"
                        aria-describedby={`pop-${v.id}`}
                        onClick={() => openVerse(v.id, v.ref, "tap")}
                        onMouseEnter={() => openVerse(v.id, v.ref, "hover_or_focus")}
                        onMouseLeave={() => setHover((h) => (h === v.id ? null : h))}
                        onFocus={() => openVerse(v.id, v.ref, "hover_or_focus")}
                        onBlur={() => {
                          setHover((h) => (h === v.id ? null : h));
                          setPinned((p) => (p === v.id ? null : p));
                        }}
                        className={`tap inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-mist-2 bg-mist px-3.5 py-[5px] text-[13px] font-medium text-primary transition-colors hover:border-primary focus-ring dark:border-[rgba(179,155,255,0.4)] dark:bg-[rgba(179,155,255,0.13)] ${
                          interpOn && !verseHintDone ? "animate-verse-hint" : ""
                        }`}
                      >
                        <BookOpen aria-hidden="true" className="h-3 w-3 opacity-70" />
                        <span className="underline decoration-primary decoration-dotted underline-offset-[3px]">
                          {v.ref}
                        </span>
                      </button>
                      <span
                        role="tooltip"
                        id={`pop-${v.id}`}
                        className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-40 w-[290px] max-w-[72vw] -translate-x-1/2 rounded-xl bg-navy-900 px-[18px] py-4 text-mist shadow-[0_12px_32px_rgba(8,17,31,0.35)] transition-opacity duration-150"
                        style={{ opacity: visible ? 1 : 0, visibility: visible ? "visible" : "hidden" }}
                      >
                        <span className="block text-[16px] italic leading-[1.55] [font-family:var(--font-serif)]">
                          &ldquo;{v.text}&rdquo;
                        </span>
                        <span className="mt-2.5 block font-mono text-[10.5px] uppercase tracking-[0.14em] text-violet-light">
                          {v.ref} &middot; KJV
                        </span>
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Artwork carousel (card-stack) */}
            <div aria-hidden={!artOn} className={zoneClass} style={zoneStyle(artOn)}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <div className="font-mono text-[11px] font-medium uppercase tracking-[0.32em] text-primary">
                  As artwork
                </div>
                <div className="font-mono text-[11px] text-muted-foreground dark:text-[rgba(238,235,252,0.6)]">
                  {slide + 1} / {PRESETS.length}
                </div>
              </div>

              <div
                role="region"
                aria-label="Artwork styles carousel"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") {
                    e.preventDefault();
                    goTo(slide + 1, "keyboard");
                  }
                  if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    goTo(slide - 1, "keyboard");
                  }
                }}
                onPointerDown={(e) => {
                  if (e.pointerType === "mouse" && e.button !== 0) return;
                  startX.current = e.clientX;
                  dragArmed.current = true;
                }}
                onPointerMove={(e) => {
                  if (!dragArmed.current) return;
                  const dx = e.clientX - startX.current;
                  if (!dragging && Math.abs(dx) > DRAG_ARM_PX) {
                    setDragging(true);
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId);
                    } catch {
                      /* pointer capture is best-effort */
                    }
                  }
                  if (dragging || Math.abs(dx) > DRAG_ARM_PX) setDrag(dx);
                }}
                onPointerUp={() => {
                  if (!dragArmed.current) return;
                  dragArmed.current = false;
                  const d = drag;
                  setDrag(0);
                  setDragging(false);
                  if (d < -SWIPE_THRESHOLD_PX) goTo(slide + 1, "swipe");
                  else if (d > SWIPE_THRESHOLD_PX) goTo(slide - 1, "swipe");
                }}
                onPointerCancel={() => {
                  dragArmed.current = false;
                  setDrag(0);
                  setDragging(false);
                }}
                className="relative h-[clamp(180px,28vh,320px)] w-full cursor-grab touch-pan-y overflow-hidden rounded-xl bg-mist focus-ring dark:bg-navy-900"
              >
                <div className="absolute inset-x-[18px] inset-y-3.5">
                  {PRESETS.map((p, i) => (
                    <div
                      key={p.id}
                      className="absolute inset-0 overflow-hidden rounded-[10px] shadow-[0_8px_22px_rgba(14,26,48,0.22)]"
                      style={stackStyle(i)}
                    >
                      <Image
                        src={`/landing/dream-demo/${p.id}.jpg`}
                        alt={`${p.name} — ${p.description}`}
                        fill
                        sizes="(max-width: 1023px) 86vw, 424px"
                        className="object-cover"
                        draggable={false}
                      />
                    </div>
                  ))}
                </div>

                {curLocked && (
                  <Link
                    href="/pricing"
                    aria-label={`Unlock the ${TIER_LABEL[cur.tier]} tier — see pricing`}
                    className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-[rgba(8,17,31,0.82)] px-3 py-1.5 text-xs font-semibold text-violet-light backdrop-blur-sm transition-colors hover:bg-[rgba(8,17,31,0.95)] focus-ring"
                  >
                    <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
                      <rect x="1" y="5" width="8" height="6" rx="1.5" fill="currentColor" />
                      <path d="M3 5.2 V3.4 a2 2 0 0 1 4 0 V5.2" stroke="currentColor" fill="none" strokeWidth="1.4" />
                    </svg>
                    <span>{TIER_LABEL[cur.tier]} &middot; Unlock</span>
                  </Link>
                )}
              </div>

              {/* Label + controls */}
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="truncate text-[14.5px] font-semibold text-foreground dark:text-mist">
                    {cur.name}
                  </div>
                  <span
                    className={`whitespace-nowrap rounded-full px-2 py-[3px] font-mono text-[10px] uppercase tracking-[0.12em] ${TIER_CHIP_CLASS[cur.tier]}`}
                  >
                    {TIER_LABEL[cur.tier]}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Previous style"
                    onClick={() => goTo(slide - 1, "arrow")}
                    disabled={slide === 0}
                    className="tap h-8 w-8 rounded-full border border-mist-2 bg-white text-[17px] leading-none text-primary transition-colors hover:border-primary disabled:pointer-events-none disabled:opacity-35 focus-ring dark:border-[rgba(179,155,255,0.4)] dark:bg-transparent"
                  >
                    &lsaquo;
                  </button>
                  <button
                    type="button"
                    aria-label="Next style"
                    onClick={() => goTo(slide + 1, "arrow")}
                    disabled={slide === PRESETS.length - 1}
                    className="tap h-8 w-8 rounded-full border border-mist-2 bg-white text-[17px] leading-none text-primary transition-colors hover:border-primary disabled:pointer-events-none disabled:opacity-35 focus-ring dark:border-[rgba(179,155,255,0.4)] dark:bg-transparent"
                  >
                    &rsaquo;
                  </button>
                </div>
              </div>

              {/* Dots */}
              <div className="mt-3 flex justify-center gap-[7px]">
                {PRESETS.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-label={`View ${p.name}`}
                    onClick={() => goTo(i, "dot")}
                    className="h-2 w-2 rounded-full border-0 p-0 transition-[background,transform] duration-200 focus-ring"
                    style={{
                      background: i === slide ? "var(--primary)" : "var(--line)",
                      transform: i === slide ? "scale(1.25)" : "none",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* CTA */}
            <div aria-hidden={!ctaOn} className={zoneClass} style={zoneStyle(ctaOn)}>
              <Link
                href="/sign-up"
                className="tap flex min-h-12 items-center justify-center rounded-xl bg-primary text-[15.5px] font-semibold tracking-[0.01em] text-primary-foreground transition-colors hover:bg-primary-hover focus-ring"
              >
                Interpret your own dream
              </Link>
              <div className="mt-2.5 text-center text-[12.5px] text-muted-foreground dark:text-[rgba(238,235,252,0.6)]">
                Free to start &middot; no card required
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
