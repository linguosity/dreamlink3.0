// app/welcome/onboarding-lib.ts
//
// Shared types, persisted state, and the reading-level mapping for the
// first-run onboarding flow (design handoff: "DreamRiver Onboarding Flow").
//
// Account creation is intentionally STUBBED for now (the OTP step accepts any
// 6 digits) because email/OTP isn't wired yet. `finalizeOnboarding()` below is
// the single seam where real account creation + persistence will hook in once
// Supabase email OTP is configured — see the TODO there.

import { ReadingLevel } from "@/schema/profile";

export const ONBOARDING_STORE = "dreamriver_onboarding_v1";

export const STEPS = [
  "welcome",
  "reading",
  "email",
  "verify",
  "profile",
  "plan",
  "done",
] as const;
export type StepId = (typeof STEPS)[number];

/** The four design reading-depth options (UI copy lives here). */
export type ReadingDepthId = "still" | "river" | "celestial" | "scholarly";

export interface OnboardingData {
  step?: number;
  readingLevel?: ReadingDepthId;
  email?: string;
  agreeTerms?: boolean;
  agreeResearch?: boolean;
  code?: string[];
  firstName?: string;
  draws?: string[];
  cycle?: "monthly" | "yearly";
  plan?: "free" | "visionary";
  notifyUpgrade?: boolean;
}

/**
 * Map the design's reading-depth ids to the existing `reading_level` enum
 * the journal/settings already use. Ordered by depth so the four design
 * tiers line up with the four stored levels:
 *   still → Simple, river → Standard, celestial → Advanced, scholarly → Scholarly.
 */
export const READING_DEPTH_TO_LEVEL: Record<ReadingDepthId, ReadingLevel> = {
  still: ReadingLevel.RADIANT_CLARITY,
  river: ReadingLevel.CELESTIAL_INSIGHT,
  celestial: ReadingLevel.PROPHETIC_WISDOM,
  scholarly: ReadingLevel.DIVINE_REVELATION,
};

export function load(): OnboardingData {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(ONBOARDING_STORE) || "{}") || {};
  } catch {
    return {};
  }
}

export function save(data: OnboardingData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_STORE, JSON.stringify(data));
  } catch {
    /* ignore quota/private-mode errors */
  }
}

/**
 * SEAM — finalize onboarding into a real account.
 *
 * Today (OTP stubbed): we just persist locally and let the caller route into
 * the app. When Supabase email OTP is configured, replace the body with:
 *   1. supabase.auth.verifyOtp({ email, token: code.join(""), type: "email" })
 *   2. on success, upsert `profile` for the new user with:
 *        reading_level: READING_DEPTH_TO_LEVEL[data.readingLevel ?? "river"]
 *        (+ first_name, draws, research-consent → privacy toggle)
 *   3. record upgrade intent + notify flag if data.plan === "visionary"
 *      (free tier already grants 3 credits/month via the Admin site setting).
 * Do NOT persist the raw OTP.
 */
export function finalizeOnboarding(data: OnboardingData) {
  save(data);
  // TODO(auth): wire real OTP verification + profile persistence here.
}
