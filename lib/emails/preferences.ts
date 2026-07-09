// lib/emails/preferences.ts
//
// Single source of truth for how profile.preferences (JSONB) gates lifecycle
// email. The settings UI (app/settings/_components/sections/
// preferences-section.tsx) writes these keys; the cron routes
// (app/api/cron/*) and the one-click unsubscribe route consume them.
//
// Opt-in semantics: profile rows are created with preferences = '{}' and the
// settings UI presents every toggle as ON by default, so a MISSING key means
// "enabled" — only an explicit false is an opt-out. Keys:
//
//   emailNotifications  master switch for optional lifecycle email
//   dreamReminders      morning dream reminder (hourly cron)
//   weeklyDigest        weekly journal digest (introduced here; written by
//                       the unsubscribe route today, adoptable by the UI
//                       later — the load path in app/settings/page.tsx
//                       spreads DB prefs over its defaults, so unknown keys
//                       already round-trip through a settings save)
//   reminderTime        legacy "HH:MM" wall-clock string from the UI's
//                       <input type="time"> — no timezone attached; the
//                       cron uses only its hour, and only when
//                       profile.reminder_hour is NULL

export type PreferencesJson = Record<string, unknown> | null | undefined;

function asRecord(prefs: unknown): Record<string, unknown> | null {
  return prefs && typeof prefs === "object" && !Array.isArray(prefs)
    ? (prefs as Record<string, unknown>)
    : null;
}

/** Missing key = enabled; only an explicit false (or "false") opts out. */
function prefEnabled(prefs: unknown, key: string): boolean {
  const record = asRecord(prefs);
  if (!record) return true;
  const value = record[key];
  return value !== false && value !== "false";
}

/** Morning reminders require the master switch AND the reminder toggle. */
export function remindersOptedIn(prefs: unknown): boolean {
  return prefEnabled(prefs, "emailNotifications") && prefEnabled(prefs, "dreamReminders");
}

/** Weekly digest requires the master switch AND the digest toggle. */
export function digestOptedIn(prefs: unknown): boolean {
  return prefEnabled(prefs, "emailNotifications") && prefEnabled(prefs, "weeklyDigest");
}

/** Local hour used when neither reminder_hour nor reminderTime is usable. */
export const DEFAULT_REMINDER_HOUR = 7;

/**
 * Preferred local send hour for the morning reminder. Precedence:
 * profile.reminder_hour (canonical column, added 20260708000003) →
 * hour of the legacy preferences.reminderTime "HH:MM" string →
 * DEFAULT_REMINDER_HOUR. Only meaningful when the user has a timezone;
 * without one the cron sends during its 13:00 UTC run regardless.
 */
export function resolveReminderHour(reminderHourColumn: unknown, prefs: unknown): number {
  if (
    typeof reminderHourColumn === "number" &&
    Number.isInteger(reminderHourColumn) &&
    reminderHourColumn >= 0 &&
    reminderHourColumn <= 23
  ) {
    return reminderHourColumn;
  }
  const record = asRecord(prefs);
  const reminderTime = record?.["reminderTime"];
  if (typeof reminderTime === "string") {
    const match = /^(\d{1,2}):\d{2}$/.exec(reminderTime.trim());
    if (match) {
      const hour = Number.parseInt(match[1], 10);
      if (hour >= 0 && hour <= 23) return hour;
    }
  }
  return DEFAULT_REMINDER_HOUR;
}

/**
 * JSONB preference key the one-click unsubscribe flips to false for each
 * unsubscribable email type. Deliberately NOT emailNotifications — one-click
 * unsubscribe from the digest shouldn't also kill morning reminders (and
 * vice versa); the master switch stays a deliberate choice in /settings.
 */
export const PREF_KEY_BY_EMAIL_TYPE = {
  morning_reminder: "dreamReminders",
  weekly_digest: "weeklyDigest",
} as const;

export type UnsubscribeEmailType = keyof typeof PREF_KEY_BY_EMAIL_TYPE;
