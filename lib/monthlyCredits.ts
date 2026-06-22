// lib/monthlyCredits.ts
//
// Per-tier MONTHLY credit enforcement + a global daily spend circuit breaker.
//
// Why this exists:
//   lib/rateLimit.ts caps a single user at N dreams/24h, but that does NOT
//   implement tier credits (Free = 3/month) and does NOT stop a scripted
//   multi-account attack from each burning 3 free credits. This module adds:
//     1. checkMonthlyCredits(userId, plan) — calendar-month cap per the plan
//        (Free=3, Visionary=50, Prophet=unlimited w/ fair-use ceiling).
//     2. checkGlobalDailyDreamCap() — a hard ceiling on total dreams created
//        across ALL users in a day, so a signup-flood can't drain the budget.
//
// Fail mode (deliberately different from rateLimit.ts):
//   - FREE tier fails CLOSED: if we can't verify remaining credits, we do NOT
//     spend money on an unpaid account.
//   - PAID tiers fail OPEN: a transient DB error must never block someone who
//     is paying. Their downside is bounded by the fair-use ceiling anyway.
//   - The global breaker fails OPEN (availability) but logs loudly; it's a
//     backstop, not the primary control.

import { getAdminClient } from "@/utils/supabase/admin";
import { monthlyCreditCap } from "@/lib/tierConfig";
import type { SubscriptionPlan } from "@/schema/profile";

export interface CreditCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  /** Seconds until the limit resets (start of next month), for Retry-After. */
  retryAfterSeconds?: number;
}

/** First instant of the current calendar month, UTC, as an ISO string. */
function startOfMonthISO(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Seconds from now until the start of next month (approx reset hint). */
function secondsUntilNextMonth(now = new Date()): number {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return Math.max(60, Math.floor((next.getTime() - now.getTime()) / 1000));
}

/**
 * Check whether `userId` is under their plan's monthly credit cap. One dream
 * entry = one credit (it bundles the analysis + image). Counts rows in
 * `dream_entries` created since the start of this calendar month.
 */
export async function checkMonthlyCredits(
  userId: string,
  plan: SubscriptionPlan,
): Promise<CreditCheckResult> {
  const limit = monthlyCreditCap(plan);
  const isFree = plan === "free";
  const monthStart = startOfMonthISO();

  try {
    const admin = getAdminClient();
    const { count, error } = await admin
      .from("dream_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", monthStart);

    if (error) {
      console.error(
        `[monthlyCredits] count query failed (plan=${plan}), failing ${isFree ? "CLOSED" : "open"}:`,
        error.message,
      );
      // Free → don't spend on an unverifiable unpaid account. Paid → allow.
      return { allowed: !isFree, used: 0, limit };
    }

    const used = count ?? 0;
    const allowed = used < limit;
    return {
      allowed,
      used,
      limit,
      retryAfterSeconds: allowed ? undefined : secondsUntilNextMonth(),
    };
  } catch (err: any) {
    console.error(
      `[monthlyCredits] unexpected error (plan=${plan}), failing ${isFree ? "CLOSED" : "open"}:`,
      err?.message ?? err,
    );
    return { allowed: !isFree, used: 0, limit };
  }
}

/**
 * Global circuit breaker: hard cap on total dream entries created across ALL
 * users in the last 24h. Defends against a scripted-signup flood that slips
 * past per-user limits. Configure via GLOBAL_DAILY_DREAM_CAP (default 1500 →
 * ~$25/day worst case at ~$0.017/dream). Fails OPEN (logs) so a DB hiccup
 * doesn't take the whole product down.
 */
export async function checkGlobalDailyDreamCap(): Promise<{ allowed: boolean; used: number; cap: number }> {
  const raw = process.env.GLOBAL_DAILY_DREAM_CAP;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  const cap = Number.isFinite(parsed) && parsed > 0 ? parsed : 1500;
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const admin = getAdminClient();
    const { count, error } = await admin
      .from("dream_entries")
      .select("id", { count: "exact", head: true })
      .gte("created_at", windowStart);

    if (error) {
      console.error("[globalCap] count query failed, failing open:", error.message);
      return { allowed: true, used: 0, cap };
    }
    const used = count ?? 0;
    if (used >= cap) {
      console.error(`[globalCap] TRIPPED: ${used}/${cap} dreams in last 24h — blocking new generations.`);
    }
    return { allowed: used < cap, used, cap };
  } catch (err: any) {
    console.error("[globalCap] unexpected error, failing open:", err?.message ?? err);
    return { allowed: true, used: 0, cap };
  }
}
