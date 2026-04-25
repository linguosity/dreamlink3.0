"use client";

import { useEffect } from "react";
import WaterContact from "./WaterContact";
import WaterLayer from "./WaterLayer";
import { useFirstScrollIntro } from "@/hooks/useFirstScrollIntro";
import { useMouseParallax } from "@/hooks/useMouseParallax";
import { useTypewriter } from "@/hooks/useTypewriter";

const DREAM =
  "I was walking across a bridge over a river of golden light.";

export default function HeroVisual() {
  const { phase, reportTypingDone } = useFirstScrollIntro();
  const isHighlight = phase === "highlight";
  const hasStarted = phase !== "idle";
  const { tiltX, tiltY } = useMouseParallax({ maxDeg: 1.5, enabled: !isHighlight });

  const typing = useTypewriter(DREAM, {
    active: hasStarted,
    speedMs: 20,
    startDelayMs: 250,
  });

  useEffect(() => {
    if (typing.done && phase === "highlight") {
      reportTypingDone();
    }
  }, [typing.done, phase, reportTypingDone]);

  const showPills = typing.done;
  const showCaret = isHighlight && !typing.done;

  return (
    <div
      role="img"
      aria-label="DreamRiver app preview showing a dream entry and its biblical interpretation"
      className="flex justify-center lg:justify-end"
    >
      <div
        className="relative w-full max-w-[300px] sm:max-w-[360px] lg:max-w-[420px] mx-auto lg:mx-0"
        style={{ perspective: "1000px" }}
      >
        <WaterLayer />
        <WaterContact state={phase} />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-[-28px]
                     w-[70%] h-14
                     bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.28),transparent_70%)]
                     blur-md opacity-70"
        />

        <div
          className="will-change-transform transition-transform duration-150 ease-out"
          style={{
            transform: `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`,
          }}
        >
          <div
            data-state={phase}
            className={`relative transition-[transform,filter] duration-500 ease-out
                        ${isHighlight ? "-translate-y-1 scale-[1.02]" : ""}`}
          >
            <div className="animate-float">
            <div
              className={`bg-gray-900 rounded-[2.5rem] p-3 transition-shadow duration-500
                          ${isHighlight
                            ? "shadow-[0_24px_50px_rgba(37,99,235,0.35)]"
                            : "shadow-xl"}`}
            >
              <div className="bg-white dark:bg-slate-100 rounded-[2rem] overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 flex justify-between items-center text-[10px] text-gray-500">
                  <span className="font-medium">9:41</span>
                  <div className="flex gap-1 items-center">
                    <div className="w-4 h-2 border border-gray-400 rounded-sm">
                      <div className="w-3/4 h-full bg-gray-400 rounded-sm" />
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                    Dream journal
                  </p>
                  <h3 className="text-sm font-bold text-gray-900 mt-1">Dream entry</h3>

                  <div className="mt-3 bg-gray-50 rounded-xl p-3 min-h-[88px]">
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
                    <span className="text-[9px] bg-accent text-gold px-2 py-1 rounded-full font-medium">
                      Isaiah 43:2
                    </span>
                    <span className="text-[9px] bg-accent text-gold px-2 py-1 rounded-full font-medium">
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
                </div>

                <div className="border-t border-gray-100 px-6 py-3 flex justify-around">
                  {["Home", "Search", "Journal"].map((label) => (
                    <div key={label} className="flex flex-col items-center gap-1">
                      <div className="w-5 h-5 bg-gray-200 rounded-full" />
                      <span className="text-[8px] text-gray-400">{label}</span>
                    </div>
                  ))}
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
