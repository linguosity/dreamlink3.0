"use client";

import { useState } from "react";
import { toast } from "sonner";

/**
 * Splash-page email signup. Posts to /api/subscribe with source='coming_soon'
 * so waitlist signups are distinguishable from landing-footer signups in the
 * newsletter_signups table.
 *
 * Visual style matches the Claude Design splash handoff: pill-shaped, white
 * frost background with backdrop blur, deep-blue submit button.
 */
export default function ComingSoonForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting || done) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "coming_soon" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
      setEmail("");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full"
        style={{
          background: "oklch(0.94 0.04 145 / 0.5)",
          border: "1px solid oklch(0.80 0.08 145 / 0.4)",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="10" fill="oklch(0.55 0.15 150)" />
          <path
            d="M6 10.5l2.5 2.5 5.5-5.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span
          className="text-[15px] font-semibold"
          style={{ color: "oklch(0.35 0.06 150)" }}
        >
          You&apos;re on the list! We&apos;ll be in touch.
        </span>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      // F02 (v2 Moonwater): pill is reframed for the Night background.
      // Translucent dark fill + warm gold hairline reads as a frosted
      // night-water surface rather than the daytime sky frosted-glass.
      className="flex w-full max-w-[440px] rounded-full overflow-hidden backdrop-blur-md"
      style={{
        border: "1.5px solid oklch(0.65 0.13 75 / 0.4)",
        background: "oklch(0.2 0.05 252 / 0.45)",
        boxShadow: "0 2px 24px oklch(0.1 0.05 252 / 0.4)",
      }}
    >
      <label className="sr-only" htmlFor="coming-soon-email">
        Email
      </label>
      <input
        id="coming-soon-email"
        name="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="flex-1 min-w-0 px-5 py-3.5 bg-transparent text-[15px] outline-none"
        style={{
          color: "var(--cream)",
          // placeholder color via inline style requires the ::placeholder
          // selector — we set it via a CSS variable consumed in globals.css
          // (see .coming-soon-input::placeholder). Falls back acceptably
          // without the rule.
        }}
      />
      <button
        type="submit"
        disabled={submitting}
        // F03 (v2 Moonwater): CTA repainted from sacred-blue to gold with
        // night-deep text. Same brand pairing as the app icon.
        className="px-7 py-3.5 text-[14px] font-bold tracking-wide whitespace-nowrap transition-opacity disabled:opacity-70 disabled:cursor-not-allowed"
        style={{
          background: "var(--gold)",
          color: "var(--night-deep)",
        }}
      >
        {submitting ? "Joining…" : "Join Waitlist"}
      </button>
    </form>
  );
}
