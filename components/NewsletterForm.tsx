"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Something went wrong. Please try again.");
        return;
      }
      toast.success("You're on the list — thanks for subscribing.");
      setEmail("");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex gap-2 max-w-sm">
      <label className="sr-only" htmlFor="footer-email">
        Email
      </label>
      <input
        id="footer-email"
        name="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="tap flex-1 rounded-full bg-slate-900 border border-slate-800
                   text-white placeholder:text-gray-500 px-4 text-sm
                   focus-ring focus-visible:ring-offset-slate-950"
      />
      <button
        type="submit"
        disabled={submitting}
        className="tap inline-flex items-center justify-center rounded-full
                   bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                   text-white text-sm font-medium px-5 transition-colors
                   disabled:opacity-60 disabled:cursor-not-allowed
                   focus-ring focus-visible:ring-offset-slate-950"
      >
        {submitting ? "…" : "Subscribe"}
      </button>
    </form>
  );
}
