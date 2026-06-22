// lib/tierConfig.ts
//
// SINGLE SOURCE OF TRUTH for what each subscription plan can do.
//
// Why this exists:
//   Tier rules were previously scattered — depth ceilings in schema/profile.ts,
//   aesthetic tiers in schema/imageAesthetic.ts, a flat daily limit in
//   lib/rateLimit.ts, and prices hard-coded in the pricing/settings UI. That
//   made it easy for the UI to claim one thing while the server enforced
//   another. Everything tier-related now reads from PLAN_CAPABILITIES so the
//   pricing page, upgrade CTAs, and server-side enforcement can never diverge.
//
// Pricing (target, June 2026):
//   Free (Seeker)     — $0,      3 analyses / month
//   Visionary         — $12.99/mo or $99.99/yr
//   Prophet           — premium (added later)
//
// Cost context: one full dream (LLM analysis + one FLUX image) costs ~$0.017,
// so credits exist to shape behavior and cap abuse, not to recover cost.

import {
  AnalysisDepth,
  PLAN_DEPTH_CEILING,
  type SubscriptionPlan,
} from "@/schema/profile";
import type { AestheticTier } from "@/schema/imageAesthetic";

export interface PlanCapabilities {
  /** Human-readable tier name for UI. */
  label: string;
  /**
   * Analyses ("credits") granted per calendar month. `null` = effectively
   * unlimited (still bounded by `fairUseCeiling` to prevent runaway abuse).
   */
  monthlyCredits: number | null;
  /**
   * Hard ceiling applied even when monthlyCredits is null ("unlimited"). At
   * ~$0.017/dream this caps worst-case spend per account.
   */
  fairUseCeiling: number;
  /** Deepest analysis this plan may request (admins bypass). */
  analysisDepthCeiling: AnalysisDepth;
  /** Highest image-aesthetic tier this plan unlocks. */
  topAestheticTier: AestheticTier;
  canExport: boolean;
  canAccessApi: boolean;
}

export const PLAN_CAPABILITIES: Record<SubscriptionPlan, PlanCapabilities> = {
  free: {
    label: "Seeker",
    monthlyCredits: 3,
    fairUseCeiling: 3,
    analysisDepthCeiling: PLAN_DEPTH_CEILING.free,
    topAestheticTier: "free",
    canExport: false,
    canAccessApi: false,
  },
  visionary: {
    label: "Visionary",
    monthlyCredits: 50,
    fairUseCeiling: 100,
    analysisDepthCeiling: PLAN_DEPTH_CEILING.visionary,
    topAestheticTier: "visionary",
    canExport: true,
    canAccessApi: false,
  },
  prophet: {
    label: "Prophet",
    monthlyCredits: null, // "unlimited" (fair-use bounded)
    fairUseCeiling: 300,
    analysisDepthCeiling: PLAN_DEPTH_CEILING.prophet,
    topAestheticTier: "prophet",
    canExport: true,
    canAccessApi: true,
  },
};

/**
 * Effective hard monthly cap for a plan: the granted credits, or the
 * fair-use ceiling when the plan is "unlimited". Used by the credit gate.
 */
export function monthlyCreditCap(plan: SubscriptionPlan): number {
  const caps = PLAN_CAPABILITIES[plan];
  return caps.monthlyCredits ?? caps.fairUseCeiling;
}

/** Whether this plan's grant should be presented to users as "unlimited". */
export function isUnlimitedPlan(plan: SubscriptionPlan): boolean {
  return PLAN_CAPABILITIES[plan].monthlyCredits === null;
}
