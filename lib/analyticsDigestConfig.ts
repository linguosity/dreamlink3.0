// lib/analyticsDigestConfig.ts
//
// Types, defaults, and validation for the founders' analytics digest.
// Isomorphic on purpose: the admin form (client component) and the server
// lib both import from here — so NO supabase, env, or server-only imports.
//
// The config itself lives in site_settings under key 'analytics_digest'
// (JSONB), same runtime-tunable pattern as coming_soon_enabled and
// social_links. lastSentOn rides inside the JSON as the dedupe ledger —
// the digest has no per-user notification_log row because recipients are
// founder inboxes, not necessarily app users.

export const DIGEST_CADENCES = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
] as const;
export type DigestCadence = (typeof DIGEST_CADENCES)[number];

export const DIGEST_CADENCE_LABELS: Record<DigestCadence, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every two weeks",
  monthly: "Monthly",
};

/** Sections the digest can include; keys are stored in the JSONB config. */
export const DIGEST_SECTIONS = [
  { key: "signups", label: "New signups" },
  { key: "dreams", label: "Dreams interpreted" },
  { key: "activeDreamers", label: "Active dreamers" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "aiUsage", label: "AI usage & spend" },
  { key: "blog", label: "Journal posts published" },
] as const;
export type DigestSectionKey = (typeof DIGEST_SECTIONS)[number]["key"];

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export interface AnalyticsDigestConfig {
  enabled: boolean;
  cadence: DigestCadence;
  /** 0 = Sunday … 6 = Saturday. Used for weekly + biweekly cadences. */
  weekday: number;
  /** 1–28 (clamped so every month qualifies). Used for monthly cadence. */
  dayOfMonth: number;
  /** Preferred delivery hour 0–23, interpreted in `timezone`. */
  hourLocal: number;
  /** IANA timezone the schedule is evaluated in. */
  timezone: string;
  /** Founder inboxes; at least one required for sends to happen. */
  recipients: string[];
  /** Which metric sections the email includes. */
  sections: Record<DigestSectionKey, boolean>;
  /** Local YYYY-MM-DD of the last successful send — the dedupe ledger. */
  lastSentOn: string | null;
}

export const DEFAULT_ANALYTICS_DIGEST_CONFIG: AnalyticsDigestConfig = {
  enabled: true,
  cadence: "weekly",
  weekday: 1, // Monday
  dayOfMonth: 1,
  hourLocal: 7,
  timezone: "America/Los_Angeles",
  recipients: ["brandon@linguosity.ai", "justinbrewer@kingdomheirsflag.org"],
  sections: {
    signups: true,
    dreams: true,
    activeDreamers: true,
    subscriptions: true,
    aiUsage: true,
    blog: true,
  },
  lastSentOn: null,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidDigestEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 3 &&
    value.trim().length <= 320 &&
    EMAIL_RE.test(value.trim())
  );
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? Math.trunc(value) : NaN;
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Merge unknown JSON (from site_settings or a form payload) into a fully
 * valid config. Every field is clamped/defaulted individually so a partial
 * or hand-edited row can never produce an invalid schedule.
 */
export function coerceAnalyticsDigestConfig(value: unknown): AnalyticsDigestConfig {
  const d = DEFAULT_ANALYTICS_DIGEST_CONFIG;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...d, sections: { ...d.sections }, recipients: [...d.recipients] };
  }
  const v = value as Record<string, unknown>;

  const cadence = DIGEST_CADENCES.includes(v.cadence as DigestCadence)
    ? (v.cadence as DigestCadence)
    : d.cadence;

  const recipients = Array.isArray(v.recipients)
    ? v.recipients
        .filter(isValidDigestEmail)
        .map((e) => (e as string).trim().toLowerCase())
        .filter((e, i, arr) => arr.indexOf(e) === i)
        .slice(0, 10)
    : [...d.recipients];

  const rawSections =
    v.sections && typeof v.sections === "object" && !Array.isArray(v.sections)
      ? (v.sections as Record<string, unknown>)
      : {};
  const sections = {} as Record<DigestSectionKey, boolean>;
  for (const { key } of DIGEST_SECTIONS) {
    const raw = rawSections[key];
    sections[key] = typeof raw === "boolean" ? raw : d.sections[key];
  }

  // Timezone: accept any string that Intl recognizes; fall back otherwise.
  let timezone = typeof v.timezone === "string" ? v.timezone : d.timezone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    timezone = d.timezone;
  }

  const lastSentOn =
    typeof v.lastSentOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.lastSentOn)
      ? v.lastSentOn
      : null;

  return {
    enabled: typeof v.enabled === "boolean" ? v.enabled : d.enabled,
    cadence,
    weekday: clampInt(v.weekday, 0, 6, d.weekday),
    dayOfMonth: clampInt(v.dayOfMonth, 1, 28, d.dayOfMonth),
    hourLocal: clampInt(v.hourLocal, 0, 23, d.hourLocal),
    timezone,
    recipients,
    sections,
    lastSentOn,
  };
}
