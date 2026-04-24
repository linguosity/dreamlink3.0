"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  maxDeg?: number;
  enabled?: boolean;
};

type Parallax = { tiltX: number; tiltY: number };

const ZERO: Parallax = { tiltX: 0, tiltY: 0 };

export function useMouseParallax({ maxDeg = 1.5, enabled = true }: Options = {}) {
  const [tilt, setTilt] = useState<Parallax>(ZERO);
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled) {
      setTilt(ZERO);
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduce || coarse) return;

    const onMove = (e: MouseEvent) => {
      pendingRef.current = { x: e.clientX, y: e.clientY };
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        const p = pendingRef.current;
        if (!p) return;
        const nx = (p.x / window.innerWidth) * 2 - 1;
        const ny = (p.y / window.innerHeight) * 2 - 1;
        setTilt({
          tiltX: -ny * maxDeg,
          tiltY: nx * maxDeg,
        });
      });
    };

    const onLeave = () => {
      pendingRef.current = null;
      setTilt(ZERO);
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    window.addEventListener("blur", onLeave);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("blur", onLeave);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      pendingRef.current = null;
    };
  }, [enabled, maxDeg]);

  return tilt;
}
