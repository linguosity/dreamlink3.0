"use client";

import { useMouseParallax } from "@/hooks/useMouseParallax";
import { useTypewriter } from "@/hooks/useTypewriter";

const DREAM =
  "I was walking across a bridge over a river of golden light.";

export default function HeroVisual() {
  // Animation runs once on mount, not tied to scroll. The user can scroll
  // freely while the typewriter is playing — keeps the page from feeling
  // stuck.
  const { tiltX, tiltY } = useMouseParallax({ maxDeg: 1.5 });

  const typing = useTypewriter(DREAM, {
    active: true,
    speedMs: 20,
    startDelayMs: 600,
  });

  const showPills = typing.done;
  const showCaret = !typing.done;

  return (
    <div
      role="img"
      aria-label="DreamRiver app preview showing a dream entry and its biblical interpretation"
      className="flex justify-center lg:justify-end"
    >
      <div
        className="relative w-full max-w-[240px] sm:max-w-[280px] lg:max-w-[320px] mx-auto lg:mx-0"
        style={{ perspective: "1000px" }}
      >
        <div
          className="will-change-transform transition-transform duration-150 ease-out"
          style={{
            transform: `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`,
          }}
        >
          <div className="animate-float">
            <div className="bg-gray-900 rounded-[2.25rem] p-1.5 shadow-xl aspect-[9/17]">
              <div className="bg-cream rounded-[1.875rem] overflow-hidden h-full flex flex-col">
                <div className="px-5 py-3 border-b border-black/5">
                  <span className="wordmark text-[13px] text-gray-900">
                    DreamRiver
                  </span>
                </div>

                <div className="px-5 py-4 flex-1 flex flex-col">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-[0.12em]">
                    Dream journal
                  </p>
                  <h3 className="text-sm text-gray-900 mt-1">New Entry</h3>

                  <div className="mt-3 bg-white/70 rounded-xl p-3 min-h-[88px]">
                    <p className="text-[11px] text-gray-700 leading-relaxed">
                      {typing.out}
                      <span
                        aria-hidden="true"
                        className={`inline-block w-[1px] h-[10px] align-[-1px] ml-[1px] bg-gray-700
                                    ${showCaret ? "animate-caret" : "opacity-0"}`}
                      />
                    </p>
                  </div>

                  <div
                    className={`mt-3 flex gap-2 transition-opacity duration-500
                                ${showPills ? "opacity-100" : "opacity-0"}`}
                  >
                    {/* F05: scripture pills — cream + gold-deep + hairline gold border */}
                    <span
                      className="text-[9px] px-2.5 py-1 rounded-full font-semibold"
                      style={{
                        background: "var(--cream)",
                        color: "var(--gold-deep)",
                        border: "1px solid oklch(0.85 0.08 75)",
                      }}
                    >
                      Isaiah 43:2
                    </span>
                    <span
                      className="text-[9px] px-2.5 py-1 rounded-full font-semibold"
                      style={{
                        background: "var(--cream)",
                        color: "var(--gold-deep)",
                        border: "1px solid oklch(0.85 0.08 75)",
                      }}
                    >
                      Psalm 23:4
                    </span>
                  </div>

                  <div className="mt-4">
                    <button
                      type="button"
                      disabled={!showPills}
                      className={`w-full h-9 rounded-full text-xs font-semibold text-primary-foreground
                                  bg-primary hover:bg-primary-hover
                                  transition-[background-color,opacity] duration-200
                                  disabled:cursor-not-allowed
                                  ${showPills ? "opacity-100" : "opacity-60"}`}
                    >
                      Get Interpretation
                    </button>
                  </div>

                  <div
                    className={`mt-4 rounded-xl bg-accent/60 p-3 transition-opacity duration-700
                                ${showPills ? "opacity-100" : "opacity-0"}`}
                  >
                    <p className="text-[10px] font-semibold text-amber-warm flex items-center gap-1">
                      <span aria-hidden="true">✦</span> Your Interpretation
                    </p>
                    <p className="mt-1 text-[10px] text-gray-700 leading-relaxed">
                      Your dream of crossing a bridge over golden light speaks to a season of divine transition…
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
