"use client";

// Landing-page social proof. Rotates through admin-managed testimonials, and
// once the user base reaches USER_COUNT_DISPLAY_THRESHOLD it ALSO shows the
// live "Joined by N believers" count. Below the threshold it's testimonials
// only (we don't advertise a small number).

import * as React from "react";
import { Star } from "lucide-react";
import {
  type Testimonial,
  USER_COUNT_DISPLAY_THRESHOLD,
} from "@/lib/testimonials";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "★";
}

export default function SocialProof({
  testimonials,
  userCount,
}: {
  testimonials: Testimonial[];
  userCount: number;
}) {
  const list = testimonials.length > 0 ? testimonials : [];
  const [i, setI] = React.useState(0);
  const showCount = userCount >= USER_COUNT_DISPLAY_THRESHOLD;

  React.useEffect(() => {
    if (list.length <= 1) return;
    const id = setInterval(() => setI((n) => (n + 1) % list.length), 5500);
    return () => clearInterval(id);
  }, [list.length]);

  if (list.length === 0) return null;
  const t = list[Math.min(i, list.length - 1)];

  return (
    <div className="mt-8">
      <div className="flex items-start gap-3 justify-center lg:justify-start">
        <div
          aria-hidden="true"
          className="w-9 h-9 shrink-0 rounded-full bg-[color:var(--night-soft)]
                     ring-2 ring-[color:var(--night)] text-[10px] font-semibold
                     text-[color:var(--cream)] flex items-center justify-center"
        >
          {initials(t.author)}
        </div>
        <div className="flex flex-col items-start min-w-0">
          <div className="flex gap-0.5 text-[color:var(--gold)]" aria-label="5 out of 5 stars">
            {[...Array(5)].map((_, s) => (
              <Star key={s} className="w-4 h-4 fill-current" aria-hidden="true" />
            ))}
          </div>
          {/* key on the text forces a fresh fade-in per rotation */}
          <blockquote
            key={i}
            className="mt-1.5 text-sm text-[oklch(0.86_0.02_75)] italic leading-relaxed
                       animate-fade-in max-w-[46ch] text-left"
          >
            “{t.quote}”
          </blockquote>
          <p className="mt-1 text-xs font-medium text-[color:var(--cream)]">
            — {t.author}
          </p>
          {showCount && (
            <p className="mt-2 text-sm text-[oklch(0.80_0.025_75)]">
              Joined by{" "}
              <span className="font-semibold text-[color:var(--cream)]">
                {userCount.toLocaleString()}+ believers
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
