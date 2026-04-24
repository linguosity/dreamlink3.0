"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type IntroPhase = "idle" | "highlight" | "done";

const HIGHLIGHT_MS = 450;
const MIN_DWELL_MS = 900;
const MAX_DWELL_MS = 2400;
const TOP_THRESHOLD_PX = 20;
const TOUCH_DRAG_PX = 4;

const TRIGGER_KEYS = new Set([
  "ArrowDown",
  "PageDown",
  " ",
  "Spacebar",
  "End",
]);

const BLOCK_KEYS = new Set([
  "ArrowDown",
  "ArrowUp",
  "PageDown",
  "PageUp",
  " ",
  "Spacebar",
  "Home",
  "End",
]);

export function useFirstScrollIntro() {
  const [phase, setPhase] = useState<IntroPhase>("idle");
  const phaseRef = useRef<IntroPhase>("idle");
  const ceilingTimerRef = useRef<number | null>(null);
  const minDwellTimerRef = useRef<number | null>(null);
  const typingDoneRef = useRef(false);

  const clearTimers = () => {
    if (ceilingTimerRef.current !== null) {
      clearTimeout(ceilingTimerRef.current);
      ceilingTimerRef.current = null;
    }
    if (minDwellTimerRef.current !== null) {
      clearTimeout(minDwellTimerRef.current);
      minDwellTimerRef.current = null;
    }
  };

  const finish = useCallback(() => {
    if (phaseRef.current === "done") return;
    clearTimers();
    phaseRef.current = "done";
    setPhase("done");
  }, []);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  const reportTypingDone = useCallback(() => {
    if (typingDoneRef.current) return;
    typingDoneRef.current = true;
    if (phaseRef.current !== "highlight") return;
    minDwellTimerRef.current = window.setTimeout(finish, MIN_DWELL_MS);
  }, [finish]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      phaseRef.current = "done";
      setPhase("done");
      return;
    }

    const isAtTop = () => window.scrollY < TOP_THRESHOLD_PX;

    const startIntro = () => {
      if (phaseRef.current !== "idle") return;
      phaseRef.current = "highlight";
      setPhase("highlight");
      ceilingTimerRef.current = window.setTimeout(
        finish,
        HIGHLIGHT_MS + MAX_DWELL_MS,
      );
    };

    const onWheel = (e: WheelEvent) => {
      if (phaseRef.current === "highlight") {
        e.preventDefault();
        return;
      }
      if (phaseRef.current === "idle" && isAtTop() && e.deltaY > 0) {
        e.preventDefault();
        startIntro();
      }
    };

    let touchStartY: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (phaseRef.current === "highlight") {
        e.preventDefault();
        return;
      }
      if (phaseRef.current !== "idle" || !isAtTop()) return;
      const y = e.touches[0]?.clientY ?? 0;
      if (touchStartY !== null && touchStartY - y > TOUCH_DRAG_PX) {
        e.preventDefault();
        startIntro();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current === "highlight" && BLOCK_KEYS.has(e.key)) {
        e.preventDefault();
        return;
      }
      if (phaseRef.current === "idle" && isAtTop() && TRIGGER_KEYS.has(e.key)) {
        e.preventDefault();
        startIntro();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      clearTimers();
    };
  }, [finish]);

  return { phase, skip, reportTypingDone };
}
