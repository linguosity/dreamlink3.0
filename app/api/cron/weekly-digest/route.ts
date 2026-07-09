// app/api/cron/weekly-digest/route.ts
//
// Weekly Vercel cron ("0 16 * * 0" in vercel.json — Sunday 16:00 UTC,
// ≈ 9am PT / noon ET, i.e. Sunday morning across the US) → journal digest.
//
// Selection: users with ≥1 dream_entries row in the last 7 days AND opted
// in per profile.preferences (emailNotifications AND weeklyDigest — missing
// key = enabled, explicit false = out; see lib/emails/preferences.ts).
// Zero-dream weeks are skipped entirely — no "you wrote nothing" guilt.
//
// PRIVACY: the email carries the week's count plus up to 3 recent TITLES
// and dates. Dream content, summaries, and interpretations never leave the
// app. (Titles are plaintext in dream_entries; content is the encrypted
// part.) Free-plan users whose 3 lifetime credits are spent get one gentle
// /pricing line.
//
// Dedupe: notification_log claim-first insert with dedupe_key = ISO week
// ("2026-W28") → once per user per week even across retries/manual runs.
//
// Fail-safe: 503 without CRON_SECRET, silent no-op without RESEND_API_KEY,
// per-user try/catch. Response is {selected, sent, skipped, errors}.

import { NextResponse } from "next/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { isResendConfigured } from "@/lib/resend";
import { getUserEmailById, sendWeeklyDigestEmail } from "@/lib/emails/send";
import { digestOptedIn } from "@/lib/emails/preferences";
import { monthlyCreditCap } from "@/lib/tierConfig";
import {
  authorizeCronRequest,
  isoWeekKey,
  mapWithConcurrency,
  type CronRunSummary,
} from "@/lib/cron";
import { captureError } from "@/lib/sentry";
import type { DigestDream } from "@/lib/emails/templates";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Hobby plan limit

const WINDOW_DAYS = 7;
const MAX_RECENT_TITLES = 3;
/** Hard per-run send cap — a runaway selection can't drain the Resend quota. */
const MAX_SENDS_PER_RUN = 500;
/** Small pool: stays inside Resend's rate limits, still finishes a full cap. */
const SEND_CONCURRENCY = 5;
const DREAM_PAGE_SIZE = 1000;
const MAX_DREAM_PAGES = 10; // 10k dreams/week — revisit aggregation before then
const IN_FILTER_CHUNK = 200; // keep .in() URLs comfortably short

/**
 * dream_entries.created_at is `timestamp` (no zone) holding UTC; PostgREST
 * returns it without a suffix, so tag it as UTC before parsing (same rule as
 * app/admin/page.tsx: "treat tz-less strings as UTC").
 */
function parseUtcTimestamp(value: string | null): Date {
  if (!value) return new Date(0);
  const hasZone = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  const parsed = new Date(hasZone ? value : `${value}Z`);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

interface UserWeek {
  count: number;
  recent: DigestDream[]; // newest first, ≤ MAX_RECENT_TITLES
}

export async function GET(request: Request) {
  const denied = authorizeCronRequest(request);
  if (denied) return denied;

  const summary: CronRunSummary = { selected: 0, sent: 0, skipped: 0, errors: 0 };

  if (!isResendConfigured()) {
    console.warn("[cron/weekly-digest] RESEND_API_KEY not set — nothing to send.");
    return NextResponse.json(summary);
  }

  const now = new Date();
  const dedupeKey = isoWeekKey(now);
  const since = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  try {
    const admin = getAdminClient();

    // 1) Every dream in the window, newest first → per-user count + titles.
    const weekByUser = new Map<string, UserWeek>();
    for (let page = 0; page < MAX_DREAM_PAGES; page++) {
      const from = page * DREAM_PAGE_SIZE;
      const { data, error } = await admin
        .from("dream_entries")
        .select("user_id, title, created_at")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .range(from, from + DREAM_PAGE_SIZE - 1);
      if (error) throw new Error(`dream_entries page ${page} failed: ${error.message}`);

      for (const row of data ?? []) {
        if (!row.user_id) continue;
        let week = weekByUser.get(row.user_id);
        if (!week) {
          week = { count: 0, recent: [] };
          weekByUser.set(row.user_id, week);
        }
        week.count++;
        if (week.recent.length < MAX_RECENT_TITLES) {
          week.recent.push({
            title: row.title,
            createdAt: parseUtcTimestamp(row.created_at),
          });
        }
      }

      if (!data || data.length < DREAM_PAGE_SIZE) break;
    }

    // 2) Keep only users opted in per stored preferences. Users without a
    //    profile row (shouldn't exist — signup trigger creates one) are
    //    excluded rather than guessed at.
    const dreamerIds = [...weekByUser.keys()];
    const optedIn: string[] = [];
    for (let i = 0; i < dreamerIds.length; i += IN_FILTER_CHUNK) {
      const chunk = dreamerIds.slice(i, i + IN_FILTER_CHUNK);
      const { data, error } = await admin
        .from("profile")
        .select("user_id, preferences")
        .in("user_id", chunk);
      if (error) throw new Error(`profile prefs lookup failed: ${error.message}`);
      for (const row of data ?? []) {
        if (row.user_id && digestOptedIn(row.preferences)) optedIn.push(row.user_id);
      }
    }

    summary.selected = optedIn.length;
    const batch = optedIn.slice(0, MAX_SENDS_PER_RUN);
    if (optedIn.length > batch.length) {
      console.warn(
        `[cron/weekly-digest] capped at ${MAX_SENDS_PER_RUN} of ${optedIn.length} users; remainder counted as skipped.`,
      );
    }

    // 3) Active paid plans (same read as app/settings/page.tsx). If this
    //    lookup fails we set plansUnknown and show NO credits line — never
    //    nag a paying user because a query hiccuped.
    const paidUsers = new Set<string>();
    let plansUnknown = false;
    try {
      for (let i = 0; i < batch.length; i += IN_FILTER_CHUNK) {
        const chunk = batch.slice(i, i + IN_FILTER_CHUNK);
        const { data, error } = await admin
          .from("subscriptions")
          .select("user_id, plan, status")
          .in("user_id", chunk)
          .eq("status", "active");
        if (error) throw new Error(error.message);
        for (const row of data ?? []) {
          if (row.user_id && (row.plan === "visionary" || row.plan === "prophet")) {
            paidUsers.add(row.user_id);
          }
        }
      }
    } catch (err) {
      plansUnknown = true;
      console.error("[cron/weekly-digest] plan lookup failed — omitting credits lines:", err);
    }

    const freeLifetimeCredits = monthlyCreditCap("free"); // 3, from tierConfig

    // 4) Send. Per-user try/catch: one failure never aborts the run.
    await mapWithConcurrency(batch, SEND_CONCURRENCY, async (userId) => {
      try {
        const email = await getUserEmailById(userId);
        if (!email) {
          summary.skipped++;
          return;
        }

        // Free plan + all lifetime credits spent → gentle /pricing line.
        // (Free credits are lifetime: count every dream ever, no date
        // filter — same rule as lib/monthlyCredits.ts.)
        let creditsExhausted = false;
        if (!plansUnknown && !paidUsers.has(userId)) {
          const { count, error } = await admin
            .from("dream_entries")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId);
          if (!error && (count ?? 0) >= freeLifetimeCredits) creditsExhausted = true;
        }

        const week = weekByUser.get(userId);
        if (!week || week.count < 1) {
          summary.skipped++; // defensive: selection already required ≥1
          return;
        }

        const outcome = await sendWeeklyDigestEmail(userId, email, {
          dedupeKey,
          dreamCount: week.count,
          recentDreams: week.recent,
          creditsExhausted,
        });
        if (outcome === "sent") summary.sent++;
        else if (outcome === "error") summary.errors++;
        else summary.skipped++; // dedupe hit or subsystem disabled
      } catch (err) {
        summary.errors++;
        console.error(`[cron/weekly-digest] failed for user ${userId}:`, err);
      }
    });
    summary.skipped += optedIn.length - batch.length;

    if (summary.errors > 0) {
      // Constant message → Sentry groups repeats into one issue.
      captureError(new Error("weekly-digest cron completed with errors"), {
        level: "warning",
        tags: { area: "cron", job: "weekly-digest" },
        extra: { ...summary, week: dedupeKey },
      });
    }

    return NextResponse.json(summary);
  } catch (err) {
    console.error("[cron/weekly-digest] run failed:", err);
    captureError(err, {
      level: "error",
      tags: { area: "cron", job: "weekly-digest" },
      extra: { ...summary, week: dedupeKey },
    });
    return NextResponse.json({ ...summary, error: "Run failed" }, { status: 500 });
  }
}
