// lib/analyticsDigest.ts
//
// Founders' analytics digest: reads site metrics from Supabase, renders the
// branded email, and decides WHEN to send based on the admin-configurable
// schedule in site_settings (key 'analytics_digest' — see
// lib/analyticsDigestConfig.ts for the shape).
//
// Scheduling model (fits Vercel Hobby's 2-daily-crons budget):
//   - runAnalyticsDigestTick() is evaluated once per day by piggybacking on
//     the existing morning-reminders cron (13:00 UTC ≈ 6am PT). No new cron
//     slot is consumed; /api/cron/analytics-digest exists for manual runs.
//   - If a digest is due today and the configured hour is still ahead, the
//     email is handed to Resend with scheduledAt so it arrives at the chosen
//     local time. If the hour already passed (e.g. 5am picks with a 6am
//     tick), it sends immediately.
//   - Dedupe: config.lastSentOn (local YYYY-MM-DD) written back after a
//     successful hand-off. One digest per due-day, even across manual runs.
//
// Server-only: service-role clients + Resend. Never import from client code —
// the admin form imports lib/analyticsDigestConfig.ts instead.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/utils/supabase/admin";
import { getResend, isResendConfigured, getEmailFrom, getSupportEmail } from "@/lib/resend";
import {
  coerceAnalyticsDigestConfig,
  DIGEST_CADENCE_LABELS,
  type AnalyticsDigestConfig,
  type DigestSectionKey,
} from "@/lib/analyticsDigestConfig";

const SETTINGS_KEY = "analytics_digest";

/** Monday 2026-01-05 UTC — parity anchor for the biweekly cadence. */
const BIWEEKLY_ANCHOR_UTC = Date.UTC(2026, 0, 5);

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service role env vars");
  // Untyped on purpose: site_settings isn't in lib/database.types.ts (same
  // pattern as lib/siteSettings.ts).
  return createSupabaseClient(url, key);
}

export async function getAnalyticsDigestConfig(): Promise<AnalyticsDigestConfig> {
  try {
    const { data } = await getServiceClient()
      .from("site_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();
    return coerceAnalyticsDigestConfig(data?.value);
  } catch (err) {
    console.error("[analytics-digest] config read failed; using defaults:", err);
    return coerceAnalyticsDigestConfig(null);
  }
}

export async function setAnalyticsDigestConfig(
  config: AnalyticsDigestConfig,
  updatedBy: string | null = null,
): Promise<void> {
  const clean = coerceAnalyticsDigestConfig(config);
  const { error } = await getServiceClient()
    .from("site_settings")
    .upsert(
      {
        key: SETTINGS_KEY,
        value: clean,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
  if (error) throw new Error(`Failed to save analytics digest settings: ${error.message}`);
}

// ── Local-time helpers ──────────────────────────────────────────────────────

interface LocalParts {
  ymd: string; // YYYY-MM-DD in the config timezone
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  weekday: number; // 0 = Sunday … 6 = Saturday
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

export function localParts(now: Date, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  // Intl can emit "24" for midnight with hour12: false — normalize to 0.
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  const weekday = WEEKDAY_INDEX[get("weekday")] ?? 0;
  const ymd = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { ymd, year, month, day, hour, minute, weekday };
}

/** Is a digest due on the given LOCAL day per the configured cadence? */
export function isDigestDueOn(config: AnalyticsDigestConfig, parts: LocalParts): boolean {
  switch (config.cadence) {
    case "daily":
      return true;
    case "weekly":
      return parts.weekday === config.weekday;
    case "biweekly": {
      if (parts.weekday !== config.weekday) return false;
      const dayUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
      const weeks = Math.floor((dayUtc - BIWEEKLY_ANCHOR_UTC) / (7 * 24 * 60 * 60 * 1000));
      return ((weeks % 2) + 2) % 2 === 0;
    }
    case "monthly":
      return parts.day === Math.min(config.dayOfMonth, 28);
  }
}

/** Rolling window length per cadence, in days. */
function windowDays(cadence: AnalyticsDigestConfig["cadence"]): number {
  switch (cadence) {
    case "daily": return 1;
    case "weekly": return 7;
    case "biweekly": return 14;
    case "monthly": return 30;
  }
}

// ── Metrics ─────────────────────────────────────────────────────────────────

export interface DigestMetricRow {
  label: string;
  value: string;
  /** e.g. "▲ 4 vs prior period" — omitted when no comparison makes sense. */
  delta?: string;
}

interface Window { start: Date; end: Date }

function fmtDelta(current: number, previous: number, unit = ""): string {
  const diff = current - previous;
  const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "—";
  const amount = diff === 0 ? "no change" : `${Math.abs(diff)}${unit}`;
  return `${arrow} ${amount} vs prior period`;
}

function usd(n: number): string {
  return `$${n.toFixed(2)}`;
}

async function countRows(
  table: "profile" | "dream_entries" | "subscriptions",
  win: Window,
): Promise<number> {
  const admin = getAdminClient();
  const { count, error } = await admin
    .from(table)
    .select("*", { count: "exact", head: true })
    .gte("created_at", win.start.toISOString())
    .lt("created_at", win.end.toISOString());
  if (error) throw new Error(`${table} count failed: ${error.message}`);
  return count ?? 0;
}

async function distinctDreamers(win: Window): Promise<number> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("dream_entries")
    .select("user_id")
    .gte("created_at", win.start.toISOString())
    .lt("created_at", win.end.toISOString())
    .range(0, 4999);
  if (error) throw new Error(`dreamers lookup failed: ${error.message}`);
  const set = new Set<string>();
  for (const row of data ?? []) if (row.user_id) set.add(row.user_id);
  return set.size;
}

interface AiUsage { tokensIn: number; tokensOut: number; images: number; imageSpend: number }

async function aiUsage(win: Window): Promise<AiUsage> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("chatgpt_interactions")
    .select("input_tokens, output_tokens, image_generated, image_cost_usd")
    .gte("created_at", win.start.toISOString())
    .lt("created_at", win.end.toISOString())
    .range(0, 4999);
  if (error) throw new Error(`ai usage lookup failed: ${error.message}`);
  const out: AiUsage = { tokensIn: 0, tokensOut: 0, images: 0, imageSpend: 0 };
  for (const row of data ?? []) {
    out.tokensIn += row.input_tokens ?? 0;
    out.tokensOut += row.output_tokens ?? 0;
    if (row.image_generated) out.images++;
    out.imageSpend += row.image_cost_usd ?? 0;
  }
  return out;
}

async function blogPublished(win: Window): Promise<number> {
  const admin = getAdminClient();
  const [published, scheduled] = await Promise.all([
    admin
      .from("blog_posts")
      .select("id", { count: "exact", head: true })
      .gte("published_at", win.start.toISOString())
      .lt("published_at", win.end.toISOString()),
    admin
      .from("blog_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "scheduled")
      .gte("scheduled_for", win.start.toISOString())
      .lt("scheduled_for", win.end.toISOString()),
  ]);
  if (published.error) throw new Error(`blog count failed: ${published.error.message}`);
  if (scheduled.error) throw new Error(`blog scheduled count failed: ${scheduled.error.message}`);
  return (published.count ?? 0) + (scheduled.count ?? 0);
}

async function activePaidNow(): Promise<number> {
  const admin = getAdminClient();
  const { count, error } = await admin
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .in("plan", ["visionary", "prophet"]);
  if (error) throw new Error(`subscriptions count failed: ${error.message}`);
  return count ?? 0;
}

/**
 * Compute the rows for every ENABLED section. Each section is independently
 * try/caught — one failed query becomes an "unavailable" row, never a lost
 * digest.
 */
export async function computeDigestMetrics(
  config: AnalyticsDigestConfig,
  now: Date,
): Promise<{ rows: DigestMetricRow[]; periodLabel: string }> {
  const days = windowDays(config.cadence);
  const msPerDay = 24 * 60 * 60 * 1000;
  const current: Window = { start: new Date(now.getTime() - days * msPerDay), end: now };
  const previous: Window = {
    start: new Date(now.getTime() - 2 * days * msPerDay),
    end: current.start,
  };

  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timezone,
    month: "short",
    day: "numeric",
  });
  const periodLabel = `${fmt.format(current.start)} – ${fmt.format(current.end)}`;

  const rows: DigestMetricRow[] = [];
  const enabled = (key: DigestSectionKey) => config.sections[key];

  const push = async (key: DigestSectionKey, fn: () => Promise<DigestMetricRow[]>) => {
    if (!enabled(key)) return;
    try {
      rows.push(...(await fn()));
    } catch (err) {
      console.error(`[analytics-digest] section ${key} failed:`, err);
      rows.push({ label: sectionFallbackLabel(key), value: "unavailable" });
    }
  };

  await push("signups", async () => {
    const [cur, prev] = await Promise.all([
      countRows("profile", current),
      countRows("profile", previous),
    ]);
    return [{ label: "New signups", value: String(cur), delta: fmtDelta(cur, prev) }];
  });

  await push("dreams", async () => {
    const [cur, prev] = await Promise.all([
      countRows("dream_entries", current),
      countRows("dream_entries", previous),
    ]);
    return [{ label: "Dreams interpreted", value: String(cur), delta: fmtDelta(cur, prev) }];
  });

  await push("activeDreamers", async () => {
    const [cur, prev] = await Promise.all([
      distinctDreamers(current),
      distinctDreamers(previous),
    ]);
    return [{ label: "Active dreamers", value: String(cur), delta: fmtDelta(cur, prev) }];
  });

  await push("subscriptions", async () => {
    const [active, newCur, newPrev] = await Promise.all([
      activePaidNow(),
      countRows("subscriptions", current),
      countRows("subscriptions", previous),
    ]);
    return [
      { label: "Active paid subscriptions", value: String(active) },
      { label: "New subscriptions", value: String(newCur), delta: fmtDelta(newCur, newPrev) },
    ];
  });

  await push("aiUsage", async () => {
    const [cur, prev] = await Promise.all([aiUsage(current), aiUsage(previous)]);
    return [
      {
        label: "AI tokens (in / out)",
        value: `${cur.tokensIn.toLocaleString()} / ${cur.tokensOut.toLocaleString()}`,
      },
      { label: "Dream artworks generated", value: String(cur.images), delta: fmtDelta(cur.images, prev.images) },
      {
        label: "Artwork spend",
        value: usd(cur.imageSpend),
        delta: fmtDelta(Number(cur.imageSpend.toFixed(2)), Number(prev.imageSpend.toFixed(2)), ""),
      },
    ];
  });

  await push("blog", async () => {
    const [cur, prev] = await Promise.all([blogPublished(current), blogPublished(previous)]);
    return [{ label: "Journal posts published", value: String(cur), delta: fmtDelta(cur, prev) }];
  });

  return { rows, periodLabel };
}

function sectionFallbackLabel(key: DigestSectionKey): string {
  switch (key) {
    case "signups": return "New signups";
    case "dreams": return "Dreams interpreted";
    case "activeDreamers": return "Active dreamers";
    case "subscriptions": return "Subscriptions";
    case "aiUsage": return "AI usage";
    case "blog": return "Journal posts published";
  }
}

// ── Email rendering (branded shell — matches the verified-domain test) ──────

function digestEmail(
  config: AnalyticsDigestConfig,
  rows: DigestMetricRow[],
  periodLabel: string,
): { subject: string; html: string; text: string } {
  const cadenceLabel = DIGEST_CADENCE_LABELS[config.cadence].toLowerCase();
  const subject = `DreamRiver ${cadenceLabel} pulse · ${periodLabel}`;

  const textLines = rows
    .map((r) => `- ${r.label}: ${r.value}${r.delta ? ` (${r.delta})` : ""}`)
    .join("\n");
  const text = `DreamRiver analytics — ${periodLabel}\n\n${textLines}\n\nAdjust what's included, the cadence, or the send time in Admin → System → Analytics digest.\nhttps://www.dreamriver.io/admin/system`;

  const rowsHtml = rows
    .map(
      (r) => `
        <tr>
          <td style="padding:11px 0; border-bottom:1px solid #EFE8D6; font-family:Georgia,'Times New Roman',serif; font-size:15px; color:#3A4152;">
            ${r.label}
            ${r.delta ? `<div style=\"font-family:Helvetica,Arial,sans-serif; font-size:11px; color:#9A947F; padding-top:3px;\">${r.delta}</div>` : ""}
          </td>
          <td align="right" style="padding:11px 0 11px 16px; border-bottom:1px solid #EFE8D6; font-family:Georgia,'Times New Roman',serif; font-size:17px; color:#101828; white-space:nowrap; vertical-align:top;">
            <strong>${r.value}</strong>
          </td>
        </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>DreamRiver analytics</title></head><body style="margin:0; padding:0; background-color:#F7F1E3;"><div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">Your ${cadenceLabel} DreamRiver numbers, ${periodLabel}.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F7F1E3;"><tr><td align="center" style="padding:36px 16px;"><table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px; max-width:100%; background-color:#FFFFFF; border:1px solid #E8E0CC; border-radius:14px; overflow:hidden;"><tr><td align="center" bgcolor="#0E1A30" style="background:linear-gradient(170deg,#08111F 0%,#0E1A30 55%,#1A2748 100%); background-color:#0E1A30; padding:30px 40px 26px;"><div style="font-family:Georgia,'Times New Roman',serif; font-style:italic; font-size:26px; letter-spacing:0.02em; color:#F5ECD6; line-height:1.2;">DreamRiver</div><div style="padding-top:10px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td width="44" height="2" bgcolor="#D4A247" style="font-size:0; line-height:0;">&nbsp;</td></tr></table></div><div style="font-family:Helvetica,Arial,sans-serif; font-size:10px; letter-spacing:0.28em; color:#9BA3B8; text-transform:uppercase; padding-top:12px;">Founders&rsquo; analytics</div></td></tr><tr><td style="padding:36px 44px 6px;"><div style="font-family:Helvetica,Arial,sans-serif; font-size:11px; letter-spacing:0.24em; text-transform:uppercase; color:#8A8577;">${periodLabel}</div><div style="font-family:Georgia,'Times New Roman',serif; font-size:28px; line-height:1.25; color:#101828; padding-top:10px;">The ${cadenceLabel} pulse.</div></td></tr><tr><td style="padding:16px 44px 30px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rowsHtml}</table></td></tr><tr><td bgcolor="#FBF8EF" style="padding:20px 44px 24px; border-top:1px solid #EFE8D6;"><div style="font-family:Helvetica,Arial,sans-serif; font-size:11.5px; line-height:1.7; color:#9A947F;">Change what&rsquo;s included, the cadence, or the send time in <a href="https://www.dreamriver.io/admin/system" style="color:#8A6D2F; text-decoration:underline;">Admin &rarr; System &rarr; Analytics digest</a>.</div></td></tr></table><table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px; max-width:100%;"><tr><td align="center" style="padding:14px 20px 0;"><div style="font-family:Helvetica,Arial,sans-serif; font-size:10.5px; letter-spacing:0.18em; text-transform:uppercase; color:#B9B29C;">sent from send.dreamriver.io</div></td></tr></table></td></tr></table></body></html>`;

  return { subject, html, text };
}

// ── The daily tick ──────────────────────────────────────────────────────────

export interface DigestTickResult {
  status:
    | "sent"
    | "scheduled"
    | "skipped:disabled"
    | "skipped:not-due"
    | "skipped:already-sent"
    | "skipped:no-recipients"
    | "skipped:resend-off"
    | "error";
  detail?: string;
}

/**
 * Evaluate the schedule once and send/schedule the digest if due. Called
 * daily by the morning-reminders cron (piggybacked — Hobby's 2-cron budget
 * is spent) and manually via /api/cron/analytics-digest. `force` bypasses
 * the due-day and dedupe checks for testing; it still respects `enabled`,
 * recipients, and Resend availability.
 */
export async function runAnalyticsDigestTick(
  opts: { force?: boolean } = {},
): Promise<DigestTickResult> {
  try {
    const config = await getAnalyticsDigestConfig();
    if (!config.enabled) return { status: "skipped:disabled" };
    if (config.recipients.length === 0) return { status: "skipped:no-recipients" };
    if (!isResendConfigured()) return { status: "skipped:resend-off" };

    const now = new Date();
    const parts = localParts(now, config.timezone);

    if (!opts.force) {
      if (!isDigestDueOn(config, parts)) return { status: "skipped:not-due" };
      if (config.lastSentOn === parts.ymd) return { status: "skipped:already-sent" };
    }

    const { rows, periodLabel } = await computeDigestMetrics(config, now);
    const content = digestEmail(config, rows, periodLabel);

    // Honor the configured local hour: if it's still ahead today, hand the
    // email to Resend with scheduledAt; if it already passed, send now.
    const minutesUntilTarget =
      config.hourLocal * 60 - (parts.hour * 60 + parts.minute);
    const scheduledAt =
      minutesUntilTarget > 5
        ? new Date(now.getTime() + minutesUntilTarget * 60_000).toISOString()
        : undefined;

    const { error } = await getResend().emails.send({
      from: getEmailFrom(),
      to: config.recipients,
      replyTo: getSupportEmail(),
      subject: content.subject,
      html: content.html,
      text: content.text,
      ...(scheduledAt ? { scheduledAt } : {}),
    });
    if (error) throw new Error(error.message || "Resend send failed");

    // Record the send AFTER Resend accepts it. A crash between send and
    // record risks one duplicate on the next run — preferable to silently
    // recording a digest that never went out.
    await setAnalyticsDigestConfig({ ...config, lastSentOn: parts.ymd });

    return scheduledAt
      ? { status: "scheduled", detail: scheduledAt }
      : { status: "sent" };
  } catch (err) {
    console.error("[analytics-digest] tick failed:", err);
    return { status: "error", detail: err instanceof Error ? err.message : String(err) };
  }
}
