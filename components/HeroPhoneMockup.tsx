"use client";

// components/HeroPhoneMockup.tsx
//
// Scroll-driven 3D "floating on water → lifts off → travels to final position"
// animation for the hero phone mockup on the landing page.
//
// Journey:
//   0%   — Small, lying flat on the water (high rotateX, small scale, low opacity,
//           shifted down and slightly tilted). Looks like debris on the surface.
//   ~40% — Lifts off the water, begins rising and growing toward the viewer.
//           Slight rotateZ wobble as if caught by wind.
//   ~80% — Nearly full size, almost face-forward, approaching final position.
//  100%  — Lands in place with a spring overshoot (tips slightly past vertical,
//           bounces back). Full opacity, deep shadow, no rotation.
//
// Respects prefers-reduced-motion.

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// ── Easing helpers ──────────────────────────────────────────────

/** Smooth ease-out curve for most properties */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Spring curve with overshoot for the final "thud" */
function springSettle(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.pow(2, -12 * t) * Math.cos(t * Math.PI * 3);
}

// ── Animation constants ─────────────────────────────────────────

// Total scroll distance to complete the full journey
const SCROLL_RANGE = 300;

// Phase 1: floating on water (0 → 0.3 of progress)
// Phase 2: lift-off & travel (0.3 → 0.85)
// Phase 3: arrive & settle (0.85 → 1.0)

// Start state — lying flat on the water, far away and small
const START = {
  rotateX: 85,     // nearly horizontal, face-down
  rotateZ: -6,     // slight tilt, like drifting on current
  rotateY: 8,      // subtle perspective twist
  translateY: 120,  // pushed down below final position
  scale: 0.45,     // small — far away on the water
  opacity: 0.35,
};

// End state
const END = {
  rotateX: 0,
  rotateZ: 0,
  rotateY: 0,
  translateY: 0,
  scale: 1,
  opacity: 1,
};

export function HeroPhoneMockup() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const card = cardRef.current;
    if (!card) return;

    card.style.willChange = "transform, opacity, filter";

    function onScroll() {
      const raw = Math.min(window.scrollY / SCROLL_RANGE, 1);

      // ── Phase blending ──────────────────────────────────────
      // 0-0.3: gentle bob on water (barely changes, subtle motion)
      // 0.3-0.85: main travel arc
      // 0.85-1.0: spring settle into final position

      let rotateX: number;
      let rotateZ: number;
      let rotateY: number;
      let translateY: number;
      let scale: number;
      let opacity: number;

      if (raw <= 0.15) {
        // Phase 1: Floating on water — very subtle bob
        const phase = raw / 0.15; // 0→1 within this phase
        const bob = Math.sin(phase * Math.PI) * 3;

        rotateX = START.rotateX - phase * 5; // barely tips up
        rotateZ = START.rotateZ + bob * 0.5;  // gentle rock
        rotateY = START.rotateY;
        translateY = START.translateY - phase * 8;
        scale = START.scale + phase * 0.03;
        opacity = START.opacity + phase * 0.1;
      } else if (raw <= 0.85) {
        // Phase 2: Lift-off and travel through air
        const phase = (raw - 0.15) / 0.7; // 0→1
        const eased = easeOutCubic(phase);

        rotateX = (START.rotateX - 5) * (1 - eased);
        rotateZ = START.rotateZ * (1 - eased) + Math.sin(phase * Math.PI * 2) * 2 * (1 - phase);
        rotateY = START.rotateY * (1 - eased);
        translateY = (START.translateY - 8) * (1 - eased);
        scale = (START.scale + 0.03) + (END.scale - START.scale - 0.03) * eased;
        opacity = (START.opacity + 0.1) + (END.opacity - START.opacity - 0.1) * eased;
      } else {
        // Phase 3: Spring settle into final position
        const phase = (raw - 0.85) / 0.15; // 0→1
        const spring = springSettle(phase);

        // Overshoot: rotateX goes briefly to -5deg then back to 0
        rotateX = -5 * (1 - spring);
        rotateZ = 0;
        rotateY = 0;
        translateY = 0;
        scale = END.scale + (1 - spring) * 0.02; // tiny scale bounce
        opacity = 1;
      }

      // ── Shadow — grows as card approaches ───────────────────
      const shadowProgress = easeOutCubic(raw);
      const shadowY = 4 + shadowProgress * 24;
      const shadowBlur = 8 + shadowProgress * 40;
      const shadowSpread = shadowProgress * 8;
      const shadowAlpha = 0.03 + shadowProgress * 0.18;

      // ── Apply ───────────────────────────────────────────────
      if (card) {
        card.style.transform = [
          `perspective(800px)`,
          `rotateX(${rotateX.toFixed(2)}deg)`,
          `rotateY(${rotateY.toFixed(2)}deg)`,
          `rotateZ(${rotateZ.toFixed(2)}deg)`,
          `translateY(${translateY.toFixed(1)}px)`,
          `scale(${scale.toFixed(3)})`,
        ].join(" ");
        card.style.opacity = String(Math.min(opacity, 1).toFixed(3));
        card.style.boxShadow = `0 ${shadowY.toFixed(0)}px ${shadowBlur.toFixed(0)}px ${shadowSpread.toFixed(0)}px rgba(0, 0, 0, ${shadowAlpha.toFixed(3)})`;
      }
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reducedMotion]);

  return (
    <div className="flex justify-center lg:justify-end" style={{ perspective: "800px" }}>
      <div
        ref={cardRef}
        className="relative w-[280px] sm:w-[300px]"
        style={
          reducedMotion
            ? undefined
            : {
                transformOrigin: "center bottom",
                transform: [
                  `perspective(800px)`,
                  `rotateX(${START.rotateX}deg)`,
                  `rotateY(${START.rotateY}deg)`,
                  `rotateZ(${START.rotateZ}deg)`,
                  `translateY(${START.translateY}px)`,
                  `scale(${START.scale})`,
                ].join(" "),
                opacity: START.opacity,
              }
        }
      >
        {/* Phone frame */}
        <div className="bg-gray-900 rounded-[2.5rem] p-3">
          <div className="bg-white dark:bg-slate-100 rounded-[2rem] overflow-hidden">
            {/* Status bar */}
            <div className="bg-gray-50 px-6 py-3 flex justify-between items-center text-[10px] text-gray-500">
              <span className="font-medium">9:41</span>
              <div className="flex gap-1 items-center">
                <div className="w-4 h-2 border border-gray-400 rounded-sm">
                  <div className="w-3/4 h-full bg-gray-400 rounded-sm" />
                </div>
              </div>
            </div>
            {/* App content */}
            <div className="px-5 py-4">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                Dream journal
              </p>
              <h3 className="text-sm font-bold text-gray-900 mt-1">
                Dream entry
              </h3>
              <div className="mt-3 bg-gray-50 rounded-xl p-3">
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  I was walking across a bridge over a river of golden light... I
                  felt an immense peace. The water seemed to glow with divine
                  presence. On the other side, someone was waiting with open arms,
                  and I could feel love radiating from them.
                </p>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="text-[9px] bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
                  Isaiah 43:2
                </span>
                <span className="text-[9px] bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
                  Psalm 23:4
                </span>
              </div>
              <div className="mt-4">
                <Button
                  size="sm"
                  className="w-full bg-blue-600 text-white text-xs rounded-full py-2"
                >
                  Get Interpretation
                </Button>
              </div>
            </div>
            {/* Bottom nav */}
            <div className="border-t border-gray-100 px-6 py-3 flex justify-around">
              {["Home", "Search", "Journal"].map((label) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-5 h-5 bg-gray-200 rounded-full" />
                  <span className="text-[8px] text-gray-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
