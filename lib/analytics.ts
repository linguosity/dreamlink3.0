// lib/analytics.ts
//
// Technical explanation:
// Consent-gated client-side PostHog wrapper. PostHog only initializes when
// BOTH conditions hold: NEXT_PUBLIC_POSTHOG_KEY is set in the environment
// (dark launch — ship the code before the PostHog project exists) AND the
// visitor has explicitly accepted the cookie banner. Every exported helper
// silently no-ops otherwise, so call sites never need their own guards.
//
// Analogy:
// A light switch behind two breakers. Unless the building has power (the env
// key) and the visitor has flipped their own breaker (cookie consent), the
// switch does nothing — flip it all you want, no current flows.

import posthog from "posthog-js";

export type ConsentValue = "accepted" | "declined";

/** localStorage key shared with the cookie banner (pre-dates analytics). */
export const CONSENT_STORAGE_KEY = "dreamriver-cookie-consent";

/** Window event fired whenever the stored consent value changes. */
export const CONSENT_CHANGED_EVENT = "dreamriver:consent-changed";

/** Once-per-browser guard so `signed_up` can't double-fire. */
const SIGNED_UP_FLAG_KEY = "dreamriver-ph-signed-up";

/** How recently an account must have been created to count as "just signed up". */
const SIGNED_UP_WINDOW_MS = 24 * 60 * 60 * 1000;

let initialized = false;

export function getStoredConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return raw === "accepted" || raw === "declined" ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Persist the banner choice and apply it immediately: accept boots PostHog
 * (and opts back in after a previous decline), decline stops all capture.
 * Notifies listeners (e.g. the identify bootstrap in app/providers.tsx).
 */
export function setStoredConsent(value: ConsentValue): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    // Storage unavailable (private mode) — treat as session-only choice.
  }
  if (value === "accepted") {
    initAnalytics();
    if (initialized && posthog.has_opted_out_capturing()) {
      posthog.opt_in_capturing();
    }
  } else if (initialized) {
    // Decline after a previous accept: stop capturing. The opt-out flag is
    // persisted by posthog-js itself (localStorage persistence).
    posthog.opt_out_capturing();
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: value }));
}

/**
 * Initialize PostHog. Idempotent; no-ops without the env key or consent.
 * Pageviews are captured manually on App Router route changes (see
 * app/providers.tsx), so automatic pageview capture is off.
 */
export function initAnalytics(): void {
  if (typeof window === "undefined" || initialized) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  if (getStoredConsent() !== "accepted") return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    persistence: "localStorage",
    respect_dnt: true,
    capture_pageview: false, // manual $pageview on route change
    capture_pageleave: true,
    autocapture: false, // explicit product events only — see track()
  });
  initialized = true;

  // A previous decline persists an opt-out flag inside posthog-js storage;
  // re-accepting must clear it or capture stays dead after a reload.
  if (posthog.has_opted_out_capturing()) {
    posthog.opt_in_capturing();
  }
}

/** True when PostHog is booted and the visitor hasn't opted out. */
export function isAnalyticsActive(): boolean {
  return initialized && !posthog.has_opted_out_capturing();
}

// ── Typed product events ────────────────────────────────────────────

export type ClientAnalyticsEvent =
  | "signed_up"
  | "analysis_viewed"
  | "paywall_viewed"
  | "interpretation_feedback"
  | "landing_demo_step_viewed"
  | "verse_tooltip_opened"
  | "demo_style_swiped"
  | "landing_depth_compare";

export type AnalyticsProps = Record<string, string | number | boolean | null>;

/** Capture a client-side product event. No-op without key + consent. */
export function track(event: ClientAnalyticsEvent, properties?: AnalyticsProps): void {
  if (!isAnalyticsActive()) return;
  posthog.capture(event, properties);
}

/** Capture a manual $pageview (App Router has no full page loads). */
export function capturePageview(url: string): void {
  if (!isAnalyticsActive()) return;
  posthog.capture("$pageview", { $current_url: url });
}

/**
 * Tie the anonymous visitor to their Supabase user id. posthog.identify()
 * also merges (aliases) the pre-signup anonymous distinct_id into the
 * person, so events captured before signup line up with the account.
 */
export function identifyUser(userId: string): void {
  if (!isAnalyticsActive()) return;
  if (posthog.get_distinct_id() === userId) return;
  posthog.identify(userId);
}

/**
 * Fire `signed_up` once per browser for a freshly created account.
 * Guards: a localStorage flag (never fires twice on this device) and a 24h
 * account-age window (an existing user on a new device won't re-fire it).
 */
export function trackSignedUpOnce(userId: string, createdAt: string | undefined): void {
  if (typeof window === "undefined" || !isAnalyticsActive()) return;
  try {
    if (window.localStorage.getItem(SIGNED_UP_FLAG_KEY)) return;
    const created = createdAt ? Date.parse(createdAt) : NaN;
    if (!Number.isFinite(created) || Date.now() - created > SIGNED_UP_WINDOW_MS) return;
    identifyUser(userId);
    posthog.capture("signed_up");
    window.localStorage.setItem(SIGNED_UP_FLAG_KEY, userId);
  } catch {
    // Analytics must never break the app.
  }
}
