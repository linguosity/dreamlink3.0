"use client";

import { useEffect, useState } from "react";

interface CountdownProps {
  /** ISO target date, e.g. "2026-06-01T00:00:00". */
  target: string;
}

/**
 * Live countdown ticker. From Claude Design splash handoff. Ticks every
 * second; clamps at zero (no negative values once target passes).
 */
export default function Countdown({ target }: CountdownProps) {
  const [now, setNow] = useState<number | null>(null);

  // Defer the initial Date.now() to client-mount so SSR and first client
  // render produce identical markup (zeros). Otherwise React hydration
  // warns about mismatched countdown values.
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const targetMs = new Date(target).getTime();
  const diff = now === null ? 0 : Math.max(0, targetMs - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  const units: { label: string; value: number }[] = [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Min", value: minutes },
    { label: "Sec", value: seconds },
  ];

  return (
    <div className="flex gap-4 justify-start">
      {units.map((u) => (
        <div key={u.label} className="text-left">
          <div className="text-3xl font-bold leading-none tabular-nums text-foreground">
            {String(u.value).padStart(2, "0")}
          </div>
          <div className="text-[11px] font-medium tracking-wider uppercase text-muted-foreground mt-1">
            {u.label}
          </div>
        </div>
      ))}
    </div>
  );
}
