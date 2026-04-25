"use client";

import { useState } from "react";
import { toast } from "sonner";

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
        className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-accent text-accent-foreground"
        role="status"
        aria-live="polite"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="10" className="fill-gold" />
          <path
            d="M6 10.5l2.5 2.5 5.5-5.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-sm font-semibold">
          You&apos;re on the list — we&apos;ll be in touch.
        </span>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-md mx-auto rounded-full overflow-hidden border border-border bg-card/70 backdrop-blur shadow-sm"
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
        className="tap flex-1 px-5 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none focus-ring rounded-full"
      />
      <button
        type="submit"
        disabled={submitting}
        className="tap px-6 bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-ring"
      >
        {submitting ? "Joining…" : "Join Waitlist"}
      </button>
    </form>
  );
}
