"use client";

import { useEffect, useState } from "react";

type Options = {
  active: boolean;
  speedMs?: number;
  startDelayMs?: number;
};

export function useTypewriter(text: string, { active, speedMs = 28, startDelayMs = 0 }: Options) {
  const [out, setOut] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setOut(text);
      setDone(true);
      return;
    }

    let timer: number | null = null;
    let i = 0;

    const tick = () => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) {
        setDone(true);
        return;
      }
      const ch = text[i - 1];
      const pause =
        ch === "," ? speedMs * 4 : ch === "." || ch === "?" || ch === "!" ? speedMs * 6 : speedMs;
      timer = window.setTimeout(tick, pause);
    };

    timer = window.setTimeout(tick, startDelayMs);

    return () => {
      if (timer !== null) clearTimeout(timer);
    };
  }, [active, text, speedMs, startDelayMs]);

  return { out, done };
}
