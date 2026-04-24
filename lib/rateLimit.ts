// lib/rateLimit.ts
//
// Per-user daily submission limiter for OpenAI-calling endpoints.
//
// Why this exists:
//   A signed-up user can otherwise submit dreams in a loop and burn through
//   our OpenAI (and BFL) budget before anyone notices. This is the simplest
//   possible guardrail — a per-user count of dream_entries created in the
//   last 24 hours, compared against a configurable cap.
//
// How it works:
//   - Uses the admin (service-role) Supabase client so the count query
//     doesn't get filtered by the caller's RLS context.
//   - Counts rows in `dream_entries` where `user_id = :uid` and
//     `created_at >= now() - 24 hours`.
//   - If count >= DAILY_DREAM_LIMIT, returns { allowed: false }.
//
// Failure mode:
//   If the count query itself errors, we fail OPEN (allow the request) rather
//   than blocking paying users because of transient DB issues. The error is
//   logged for observability. An alternative (fail closed) is safer against
//   abuse but worse against false positives during an outage — for MVP we
//   prefer availability.
//
// Tuning:
//   `DREAM_DAILY_LIMIT` env var overrides the default of 20.
//   Keep this low enough that a bad actor can't materially hurt us; keep it
//   high enough that a very engaged real user isn't capped mid-session.

import { getAdminClient } from "@/utils/supabase/admin";

const DEFAULT_DAILY_LIMIT = 20;

export interface RateLimitResult {
  allowed: boolean;
  /** Number of dreams submitted by this user in the last 24h. */
  used: number;
  /** Configured daily cap. */
  limit: number;
  /** Seconds until the oldest windowed submission ages out (approx). */
  retryAfterSeconds?: number;
}

function getDailyLimit(): number {
  const raw = process.env.DREAM_DAILY_LIMIT;
  if (!raw) return DEFAULT_DAILY_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DAILY_LIMIT;
}

/**
 * Checks whether `userId` is under the 24h dream-submission cap.
 * Always returns `{ allowed: true }` on DB failure (fail-open — see module notes).
 */
export async function checkDreamSubmissionRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const limit = getDailyLimit();
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const admin = getAdminClient();

    // `count: 'exact', head: true` returns just the count — no rows.
    const { count, error } = await admin
      .from("dream_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", windowStart);

    if (error) {
      console.error(
        "[rateLimit] count query failed, failing open:",
        error.message
      );
      return { allowed: true, used: 0, limit };
    }

    const used = count ?? 0;
    const allowed = used < limit;

    return {
      allowed,
      used,
      limit,
      // Rough hint: tell the client to retry in an hour. A more accurate
      // value would require fetching the oldest windowed row's created_at.
      retryAfterSeconds: allowed ? undefined : 60 * 60,
    };
  } catch (err: any) {
    console.error(
      "[rateLimit] unexpected error, failing open:",
      err?.message ?? err
    );
    return { allowed: true, used: 0, limit };
  }
}
