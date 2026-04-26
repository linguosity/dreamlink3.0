"use client";

import { useEffect, useState } from "react";

const FULL_DREAM_TEXT =
  "I was walking across a bridge over a river of golden light…";

/**
 * Inner phone-screen content for the splash mockup: typewriter dream entry,
 * scripture pills that fade in once typing finishes, CTA, and a peek at the
 * generated interpretation. From the Claude Design splash handoff.
 *
 * This is the body that goes inside <IOSDevice>. It's intentionally
 * decorative — no real fetch, no real form submit.
 */
export default function PhoneMockup() {
  const [typed, setTyped] = useState("");
  const [showPills, setShowPills] = useState(false);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(FULL_DREAM_TEXT.slice(0, i));
      if (i >= FULL_DREAM_TEXT.length) {
        clearInterval(id);
        const t = setTimeout(() => setShowPills(true), 400);
        return () => clearTimeout(t);
      }
    }, 35);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{
        background: "oklch(0.955 0.015 75)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* App nav */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-[oklch(0.88_0.01_70)]">
        <span className="font-blanka tracking-[0.12em] text-[11px] text-foreground">
          DREAMRIVER
        </span>
        <div
          className="w-[22px] h-[22px] rounded-full"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.70 0.08 235), oklch(0.72 0.14 75))",
          }}
          aria-hidden="true"
        />
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-3 overflow-hidden">
        <div className="text-[9px] font-semibold tracking-[0.08em] uppercase text-muted-foreground mb-1">
          Dream Journal
        </div>
        <div className="text-[13px] font-bold text-foreground mb-3">
          New Entry
        </div>

        {/* Dream input box with typewriter */}
        <div
          className="rounded-xl p-3 min-h-[64px] mb-3 border"
          style={{
            background: "oklch(1 0 0 / 0.6)",
            borderColor: "oklch(0.88 0.02 235 / 0.3)",
          }}
        >
          <div className="text-[10px] text-foreground leading-relaxed">
            {typed}
            <span
              className="inline-block w-[1px] h-[10px] align-[-1px] ml-px bg-foreground animate-splash-caret"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Scripture pills */}
        <div
          className="flex gap-1.5 mb-3 transition-opacity duration-500"
          style={{ opacity: showPills ? 1 : 0 }}
        >
          {["Isaiah 43:2", "Psalm 23:4"].map((v) => (
            <span
              key={v}
              className="text-[8px] px-2 py-0.5 rounded-full font-semibold"
              style={{
                background: "oklch(0.93 0.04 75)",
                color: "oklch(0.65 0.16 60)",
              }}
            >
              {v}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div
          className="rounded-full text-center py-2 text-[11px] font-semibold transition-opacity duration-300"
          style={{
            background: "oklch(0.45 0.12 245)",
            color: "white",
            opacity: showPills ? 1 : 0.5,
          }}
        >
          Get Interpretation
        </div>

        {/* Interpretation preview */}
        <div
          className="mt-3 p-3 rounded-xl transition-opacity duration-500"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.95 0.03 75), oklch(0.94 0.02 235))",
            opacity: showPills ? 1 : 0,
            transitionDelay: showPills ? "0.3s" : "0s",
          }}
        >
          <div
            className="text-[9px] font-bold mb-1"
            style={{ color: "oklch(0.65 0.16 60)" }}
          >
            ✦ Your Interpretation
          </div>
          <div className="text-[9px] text-foreground/80 leading-relaxed">
            Your dream of crossing a bridge over golden light speaks to a season
            of divine transition&hellip;
          </div>
        </div>
      </div>

      {/* App bottom nav */}
      <div className="flex justify-around py-2.5 border-t border-[oklch(0.88_0.01_70)]">
        {(["Journal", "Search", "Settings"] as const).map((label, i) => {
          const active = i === 0;
          return (
            <div key={label} className="text-center">
              <div
                className="w-[18px] h-[18px] rounded-md mx-auto mb-0.5"
                style={{
                  background: active
                    ? "oklch(0.45 0.12 245)"
                    : "oklch(0.88 0.01 70)",
                }}
                aria-hidden="true"
              />
              <div
                className="text-[7px]"
                style={{
                  color: active ? "oklch(0.45 0.12 245)" : "oklch(0.55 0.02 250)",
                }}
              >
                {label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
