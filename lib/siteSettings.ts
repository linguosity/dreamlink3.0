// lib/siteSettings.ts
//
// Site-wide settings flags that can be toggled by an admin at runtime
// (no redeploy). Backed by the `site_settings` Supabase table.
//
// Reads are heavily cached (in-memory per Edge/serverless instance) since
// flags change rarely and middleware reads them on every request. The 30s
// TTL means flag flips propagate globally within ~30s — acceptable for
// pre-launch / maintenance-mode use.
//
// Writes invalidate the local cache immediately, but other instances will
// pick up the change on their next TTL expiry.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const CACHE_TTL_MS = 30_000;

interface CachedFlag<T> {
  value: T;
  fetchedAt: number;
}

let comingSoonCache: CachedFlag<boolean> | null = null;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase service role env vars");
  }
  return createSupabaseClient(url, key);
}

/**
 * Reads the `coming_soon_enabled` flag. Cached per instance for 30s.
 * On any failure (DB unreachable, missing row, etc.) returns `false` — fail-open
 * is the safer default; we never want a Supabase blip to lock everyone out.
 */
export async function getComingSoonEnabled(): Promise<boolean> {
  if (
    comingSoonCache &&
    Date.now() - comingSoonCache.fetchedAt < CACHE_TTL_MS
  ) {
    return comingSoonCache.value;
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "coming_soon_enabled")
      .maybeSingle();

    if (error || !data) {
      // Treat missing flag as "off" to avoid accidental lockouts.
      comingSoonCache = { value: false, fetchedAt: Date.now() };
      return false;
    }

    // Stored as JSONB so the value can be `true` / `false` literal.
    const value = data.value === true;
    comingSoonCache = { value, fetchedAt: Date.now() };
    return value;
  } catch (err) {
    console.error("getComingSoonEnabled failed; defaulting to false:", err);
    return false;
  }
}

/**
 * Updates the `coming_soon_enabled` flag and invalidates the local cache.
 * Caller must verify the user is an admin before calling — RLS will also
 * enforce admin-only writes when authenticated client is used.
 */
export async function setComingSoonEnabled(
  enabled: boolean,
  updatedBy: string | null = null,
): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert(
      {
        key: "coming_soon_enabled",
        value: enabled,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );

  if (error) {
    console.error("setComingSoonEnabled failed:", error);
    throw new Error(`Failed to update coming-soon flag: ${error.message}`);
  }

  // Invalidate the local cache so the next read sees the new value.
  comingSoonCache = { value: enabled, fetchedAt: Date.now() };
}

// ---------------------------------------------------------------------------
// Social links (landing-footer icons)
//
// Stored in site_settings under key = 'social_links' as a JSONB object of
// platform key -> https profile URL. The landing footer renders for anonymous
// visitors, so reads use the PUBLIC anon-key client — migration
// 20260710000001_social_links_setting.sql grants public SELECT on this key
// only (writes stay admin/service-role). An icon shows only for platforms
// with a valid https:// URL; an empty object hides them all.
// ---------------------------------------------------------------------------

/** Platforms the landing footer knows how to render (keys match the JSONB). */
export const SOCIAL_PLATFORMS = [
  { key: "x", label: "X" },
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
  { key: "tiktok", label: "TikTok" },
] as const;

export type SocialPlatformKey = (typeof SOCIAL_PLATFORMS)[number]["key"];

/** True when `value` is a well-formed https:// URL — the only kind we link. */
export function isValidSocialUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 2048) return false;
  try {
    return new URL(trimmed).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Keep only entries whose value is a valid https:// URL. Unknown platform
 * keys are accepted harmlessly (consumers render only the platforms they
 * have icons for); malformed values are dropped silently.
 */
function coerceSocialLinks(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (isValidSocialUrl(raw)) out[key] = raw.trim();
  }
  return out;
}

let socialLinksCache: CachedFlag<Record<string, string>> | null = null;

function getAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase anon env vars");
  }
  return createSupabaseClient(url, key);
}

/**
 * Reads the admin-managed social profile URLs (cached 30s per instance).
 * Anon-safe: uses the public anon key + the public-read RLS policy, so it
 * works while rendering for logged-out visitors. Returns `{}` on ANY error —
 * the footer then simply renders no icons.
 */
export async function getSocialLinks(): Promise<Record<string, string>> {
  if (
    socialLinksCache &&
    Date.now() - socialLinksCache.fetchedAt < CACHE_TTL_MS
  ) {
    return socialLinksCache.value;
  }

  try {
    const supabase = getAnonClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "social_links")
      .maybeSingle();

    const value = error || !data ? {} : coerceSocialLinks(data.value);
    socialLinksCache = { value, fetchedAt: Date.now() };
    return value;
  } catch (err) {
    console.error("getSocialLinks failed; returning {}:", err);
    return {};
  }
}

/**
 * Overwrites the social links and invalidates the local cache. Only known
 * platform keys are persisted; blank values are dropped (blank = icon
 * hidden); any non-blank value that is not a valid https:// URL throws.
 * Caller MUST verify the user is an admin (see app/admin/actions.ts).
 */
export async function setSocialLinks(
  links: Record<string, string>,
  updatedBy: string | null = null,
): Promise<void> {
  const clean: Record<string, string> = {};
  for (const { key, label } of SOCIAL_PLATFORMS) {
    const raw = links[key];
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue; // blank = hide the icon
    if (!isValidSocialUrl(trimmed)) {
      throw new Error(`${label}: enter a full https:// URL or leave it blank.`);
    }
    clean[key] = trimmed;
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert(
      {
        key: "social_links",
        value: clean,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );

  if (error) {
    console.error("setSocialLinks failed:", error);
    throw new Error(`Failed to save social links: ${error.message}`);
  }

  socialLinksCache = { value: clean, fetchedAt: Date.now() };
}

/**
 * Email allowlist for admins who should always bypass the coming-soon gate
 * even before they have a profile row with `is_admin = true`.
 *
 * Source: ADMIN_EMAIL_ALLOWLIST env var, comma-separated.
 * Example: ADMIN_EMAIL_ALLOWLIST=brandon@linguosity.ai,brother@example.com
 *
 * The list is intentionally separate from the `is_admin` column on `profile`:
 * - allowlist = "this email is trusted" (works pre-signup, env-driven)
 * - is_admin  = "this user has admin UI access" (post-signup, DB-driven)
 *
 * Either grants access during coming-soon mode. The two converge once an
 * allowlisted user signs up — their profile gets is_admin = true via the
 * sign-up flow, so the env var becomes redundant for them.
 */
export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAIL_ALLOWLIST;
  if (!raw) return false;
  const normalized = email.trim().toLowerCase();
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}
