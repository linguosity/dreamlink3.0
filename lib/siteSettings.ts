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
