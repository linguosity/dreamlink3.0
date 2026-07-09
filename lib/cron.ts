// lib/cron.ts
//
// Shared plumbing for the Vercel cron route handlers (app/api/cron/*).
//
// Auth follows Vercel's convention: when a CRON_SECRET env var exists,
// Vercel invokes each cron path with `Authorization: Bearer ${CRON_SECRET}`.
// Routes 503 when the secret is unset (crons deliberately dark, never
// unauthenticated) and 401 on a bad/missing bearer.

import { NextResponse } from "next/server";

/** Run summary every cron route returns. */
export interface CronRunSummary {
  /** Users who matched selection criteria this run (pre-cap). */
  selected: number;
  /** Emails actually handed to Resend. */
  sent: number;
  /** Dedupe hits, missing emails, over-cap remainder, disabled subsystem. */
  skipped: number;
  /** Per-user or claim failures (logged; safe to retry on a later run). */
  errors: number;
}

/**
 * Returns a 503/401 response when the request may not run, or null when
 * authorized. Usage: `const denied = authorizeCronRequest(req); if (denied) return denied;`
 */
export function authorizeCronRequest(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] CRON_SECRET is not set — cron routes are disabled.");
    return NextResponse.json({ error: "Cron is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * The hour (0–23) it currently is in `timeZone`, computed via Intl (Node
 * ships full ICU on Vercel). Returns null for invalid/unknown zone names so
 * callers can fall back to the UTC bucket instead of crashing the run.
 */
export function localHourInTimeZone(date: Date, timeZone: string): number | null {
  try {
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(date);
    const hour = Number.parseInt(formatted, 10);
    return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
  } catch {
    return null; // RangeError: invalid IANA name
  }
}

/** "YYYY-MM-DD" in UTC — the morning reminder's once-per-day dedupe key. */
export function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * ISO-8601 week key, e.g. "2026-W28" — the weekly digest's dedupe key. Uses
 * the ISO week-numbering year (the year of the week's Thursday), so keys
 * stay correct across New Year boundaries. The digest cron runs Sundays,
 * i.e. ISO day 7, so each run keys the week that is just ending.
 */
export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const isoDay = d.getUTCDay() || 7; // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - isoDay); // shift to this week's Thursday
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Run `fn` over `items` with at most `limit` in flight — a simple worker
 * pool, no dependencies. `fn` must not throw (cron callers wrap their
 * per-user work in try/catch); a throw would reject the whole pool.
 */
export async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    async () => {
      for (;;) {
        const index = next++;
        if (index >= items.length) return;
        await fn(items[index]);
      }
    },
  );
  await Promise.all(workers);
}
