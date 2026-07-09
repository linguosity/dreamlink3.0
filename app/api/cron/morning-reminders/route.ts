// app/api/cron/morning-reminders/route.ts
//
// Hourly Vercel cron ("0 * * * *" in vercel.json) → "What did you dream
// last night?" reminder email.
//
// Selection (see lib/emails/preferences.ts): only users whose
// profile.preferences opt them in — emailNotifications AND dreamReminders,
// where a missing key means enabled (the settings UI's defaults) and only
// an explicit false opts out.
//
// Timezone-correct delivery:
//   - profile.timezone set (IANA) → send during the run where the user's
//     LOCAL hour (computed via Intl in Node) equals their preferred hour:
//     profile.reminder_hour, else the hour of the legacy
//     preferences.reminderTime "HH:MM" string, else 7am.
//   - no timezone stored (all rows today — the settings UI doesn't collect
//     one yet; columns added in migration 20260708000003 so it can) → we
//     cannot know local morning, so those users get the 13:00 UTC run
//     (≈ 6am PT / 9am ET — morning across the continental US). Documented
//     limitation, not a bug.
//
// Dedupe: notification_log claim-first insert (lib/emails/send.ts) with
// dedupe_key = UTC date → at most one reminder per user per day, even
// across overlapping runs or DST repeats.
//
// Fail-safe: 503 without CRON_SECRET, silent no-op without RESEND_API_KEY,
// per-user try/catch so one bad row never aborts the run. Response is the
// run summary {selected, sent, skipped, errors}.

import { NextResponse } from "next/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { isResendConfigured } from "@/lib/resend";
import { getUserEmailById, sendMorningReminderEmail } from "@/lib/emails/send";
import { remindersOptedIn, resolveReminderHour } from "@/lib/emails/preferences";
import {
  authorizeCronRequest,
  localHourInTimeZone,
  mapWithConcurrency,
  utcDateKey,
  type CronRunSummary,
} from "@/lib/cron";
import { captureError } from "@/lib/sentry";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Hobby plan limit

/** Run that catches every user without a stored timezone (~6–9am US). */
const FALLBACK_UTC_HOUR = 13;
/** Hard per-run send cap — a runaway selection can't drain the Resend quota. */
const MAX_SENDS_PER_RUN = 500;
/** Small pool: stays inside Resend's rate limits, still finishes a full cap. */
const SEND_CONCURRENCY = 5;
const PROFILE_PAGE_SIZE = 1000;
const MAX_PROFILE_PAGES = 20; // 20k profiles — revisit selection before then

export async function GET(request: Request) {
  const denied = authorizeCronRequest(request);
  if (denied) return denied;

  const summary: CronRunSummary = { selected: 0, sent: 0, skipped: 0, errors: 0 };

  if (!isResendConfigured()) {
    console.warn("[cron/morning-reminders] RESEND_API_KEY not set — nothing to send.");
    return NextResponse.json(summary);
  }

  const now = new Date();
  const utcHour = now.getUTCHours();
  const dedupeKey = utcDateKey(now);

  try {
    const admin = getAdminClient();

    // 1) Page through profiles; keep opted-in users whose hour is now.
    const due: string[] = [];
    for (let page = 0; page < MAX_PROFILE_PAGES; page++) {
      const from = page * PROFILE_PAGE_SIZE;
      const { data, error } = await admin
        .from("profile")
        .select("user_id, timezone, reminder_hour, preferences")
        .order("id", { ascending: true })
        .range(from, from + PROFILE_PAGE_SIZE - 1);
      if (error) throw new Error(`profile page ${page} failed: ${error.message}`);

      for (const row of data ?? []) {
        if (!row.user_id) continue;
        if (!remindersOptedIn(row.preferences)) continue;

        const timeZone =
          typeof row.timezone === "string" && row.timezone.trim()
            ? row.timezone.trim()
            : null;
        let isDue: boolean;
        if (timeZone) {
          const localHour = localHourInTimeZone(now, timeZone);
          isDue =
            localHour === null
              ? utcHour === FALLBACK_UTC_HOUR // unparseable zone → UTC bucket
              : localHour === resolveReminderHour(row.reminder_hour, row.preferences);
        } else {
          isDue = utcHour === FALLBACK_UTC_HOUR;
        }
        if (isDue) due.push(row.user_id);
      }

      if (!data || data.length < PROFILE_PAGE_SIZE) break;
    }

    summary.selected = due.length;
    const batch = due.slice(0, MAX_SENDS_PER_RUN);
    if (due.length > batch.length) {
      console.warn(
        `[cron/morning-reminders] capped at ${MAX_SENDS_PER_RUN} of ${due.length} due users; remainder counted as skipped.`,
      );
    }

    // 2) Send. Per-user try/catch: one failure never aborts the run.
    await mapWithConcurrency(batch, SEND_CONCURRENCY, async (userId) => {
      try {
        const email = await getUserEmailById(userId);
        if (!email) {
          summary.skipped++;
          return;
        }
        const outcome = await sendMorningReminderEmail(userId, email, { dedupeKey });
        if (outcome === "sent") summary.sent++;
        else if (outcome === "error") summary.errors++;
        else summary.skipped++; // dedupe hit or subsystem disabled
      } catch (err) {
        summary.errors++;
        console.error(`[cron/morning-reminders] failed for user ${userId}:`, err);
      }
    });
    summary.skipped += due.length - batch.length;

    if (summary.errors > 0) {
      // Constant message → Sentry groups repeats into one issue.
      captureError(new Error("morning-reminders cron completed with errors"), {
        level: "warning",
        tags: { area: "cron", job: "morning-reminders" },
        extra: { ...summary, utcHour },
      });
    }

    return NextResponse.json(summary);
  } catch (err) {
    console.error("[cron/morning-reminders] run failed:", err);
    captureError(err, {
      level: "error",
      tags: { area: "cron", job: "morning-reminders" },
      extra: { ...summary, utcHour },
    });
    return NextResponse.json({ ...summary, error: "Run failed" }, { status: 500 });
  }
}
