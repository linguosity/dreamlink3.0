// lib/monthlyCredits.ts
//
// Per-tier credit enforcement + a global daily spend circuit breaker.
//
// Why this exists:
//   lib/rateLimit.ts caps a single user at N dreams/24h, but that does NOT
//   implement tier credits and does NOT stop a scripted multi-account attack
//   from each burning 3 free credits. This module adds:
//     1. checkMonthlyCredits(userId, plan) — per-plan cap. Free is LIFETIME
//        (3, granted once at signup, never refreshed); paid tiers reset each
//        calendar month. Caps come from PLAN_CAPABILITIES in lib/tierConfig.ts
//        — Visionary 30, Prophet unlimited w/ a 300 fair-use ceiling — so
//        don't restate the numbers anywhere else. The docstring on
//        checkMonthlyCredits below is the authority on the windowing.
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
import { captureError } from "@/lib/sentry";
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
 * Credits spent by actions that do NOT insert a dream_entries row — today
 * only "Read again" re-generations (HANDOFF-v3.md §5 item 4). See
 * supabase/migrations/20260806000001 for why this exists as a side ledger
 * rather than a rewrite of credit accounting.
 *
 * Fails SOFT, on purpose, for both tiers: applying a migration and deploying
 * code are separate human actions, and in the window between them this table
 * does not exist. Treating that as "no extra spend" degrades to exactly
 * today's behaviour. Treating it as an error would fail the free tier CLOSED
 * and lock every free user out of creating dreams — a far worse outcome than
 * an uncounted re-read.
 */
async function countLedgerSpends(
  userId: string,
  sinceISO: string | null,
): Promise<number> {
  try {
    const admin = getAdminClient();
    let query = admin
      .from("credit_spends")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (sinceISO) query = query.gte("created_at", sinceISO);
    const { count, error } = await query;
    if (error) {
      console.error(
        "[monthlyCredits] credit_spends count failed, counting 0 (is migration 20260806000001 applied?):",
        error.message,
      );
      return 0;
    }
    return count ?? 0;
  } catch (err: any) {
    console.error(
      "[monthlyCredits] credit_spends count threw, counting 0:",
      err?.message ?? err,
    );
    return 0;
  }
}

/**
 * Check whether `userId` is under their plan's credit cap. One dream entry =
 * one credit (it bundles the analysis + image). One re-generation of an
 * existing dream also = one credit, recorded in `credit_spends` because it
 * updates a row instead of inserting one.
 *
 * FREE tier: the cap is LIFETIME — 3 credits granted once at signup, never
 * refreshed (product decision 2026-07-02; marketing copy says "3 to start").
 * Implemented by counting ALL of the user's dream entries, ever.
 *
 * PAID tiers: cap is per calendar month — counts rows created since the
 * start of this month, resetting on the 1st.
 */
export async function checkMonthlyCredits(
  userId: string,
  plan: SubscriptionPlan,
): Promise<CreditCheckResult> {
  const limit = monthlyCreditCap(plan);
  const isFree = plan === "free";
  // Free = lifetime window (no date filter); paid = current calendar month.
  // The ledger uses the identical window so the two counts stay comparable.
  const sinceISO = isFree ? null : startOfMonthISO();

  try {
    const admin = getAdminClient();
    let query = admin
      .from("dream_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (sinceISO) {
      query = query.gte("created_at", sinceISO);
    }
    const [{ count, error }, ledgerSpends] = await Promise.all([
      query,
      countLedgerSpends(userId, sinceISO),
    ]);

    if (error) {
      console.error(
        `[monthlyCredits] count query failed (plan=${plan}), failing ${isFree ? "CLOSED" : "open"}:`,
        error.message,
      );
      // Free → don't spend on an unverifiable unpaid account. Paid → allow.
      return { allowed: !isFree, used: 0, limit };
    }

    const used = (count ?? 0) + ledgerSpends;
    const allowed = used < limit;
    return {
      allowed,
      used,
      limit,
      // Free credits never refresh, so there's no meaningful Retry-After.
      retryAfterSeconds:
        allowed || isFree ? undefined : secondsUntilNextMonth(),
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
      // Spend-anomaly alert: surface the trip in Sentry instead of relying on
      // console logs nobody watches. Constant message → Sentry groups repeat
      // events into one issue while the breaker stays tripped.
      captureError(new Error("Global daily dream cap tripped"), {
        level: "warning",
        tags: { area: "credits" },
        extra: { used, cap },
      });
    }
    return { allowed: used < cap, used, cap };
  } catch (err: any) {
    console.error("[globalCap] unexpected error, failing open:", err?.message ?? err);
    return { allowed: true, used: 0, cap };
  }
}
