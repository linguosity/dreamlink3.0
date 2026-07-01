// lib/testimonials.ts
//
// Admin-managed testimonials for the landing page's social-proof slot, plus
// the live user count. Testimonials live in the generic `site_settings`
// key/value store (key = "testimonials") so an admin can edit them without a
// deploy — same pattern as the coming-soon flag.
//
// Display rule (per product): until we cross USER_COUNT_DISPLAY_THRESHOLD
// users, the landing shows ONLY rotating testimonials. Once we're at/above it,
// it shows BOTH the testimonials and a real "Joined by N believers" count.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/** At/above this many users, the landing also shows the live user count. */
export const USER_COUNT_DISPLAY_THRESHOLD = 2001;

export interface Testimonial {
  quote: string;
  author: string;
}

/** Placeholder copy so the slot is never empty — admins replace these. */
export const DEFAULT_TESTIMONIALS: Testimonial[] = [
  { quote: "I've never understood my dreams like this before — every reading points me back to scripture.", author: "Emily M." },
  { quote: "DreamRiver has become part of my morning devotion. It's uncanny how relevant the verses are.", author: "James T." },
  { quote: "A gentle, faithful way to reflect on what God might be saying while I sleep.", author: "Sarah R." },
];

const CACHE_TTL_MS = 30_000;
let testimonialsCache: { value: Testimonial[]; fetchedAt: number } | null = null;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service role env vars");
  return createSupabaseClient(url, key);
}

function coerceTestimonials(value: unknown): Testimonial[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (t): t is Testimonial =>
        !!t && typeof (t as any).quote === "string" && typeof (t as any).author === "string",
    )
    .map((t) => ({ quote: t.quote.trim(), author: t.author.trim() }))
    .filter((t) => t.quote.length > 0);
}

/** Read the admin-managed testimonials (cached 30s). Falls back to defaults. */
export async function getTestimonials(): Promise<Testimonial[]> {
  if (testimonialsCache && Date.now() - testimonialsCache.fetchedAt < CACHE_TTL_MS) {
    return testimonialsCache.value;
  }
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "testimonials")
      .maybeSingle();

    const list = error || !data ? [] : coerceTestimonials(data.value);
    const value = list.length > 0 ? list : DEFAULT_TESTIMONIALS;
    testimonialsCache = { value, fetchedAt: Date.now() };
    return value;
  } catch (err) {
    console.error("getTestimonials failed; using defaults:", err);
    return DEFAULT_TESTIMONIALS;
  }
}

/** Overwrite the testimonials list. Caller MUST verify the user is an admin. */
export async function setTestimonials(
  list: Testimonial[],
  adminUserId: string,
): Promise<void> {
  const supabase = getServiceClient();
  const clean = coerceTestimonials(list);
  const { error } = await supabase
    .from("site_settings")
    .upsert(
      { key: "testimonials", value: clean, updated_at: new Date().toISOString(), updated_by: adminUserId },
      { onConflict: "key" },
    );
  if (error) throw new Error(`setTestimonials: ${error.message}`);
  testimonialsCache = null; // invalidate
}

/**
 * Total registered users, counted from the `profile` table (one row per user).
 * Used to decide whether to surface the live count on the landing page.
 */
export async function getUserCount(): Promise<number> {
  try {
    const supabase = getServiceClient();
    const { count, error } = await supabase
      .from("profile")
      .select("id", { count: "exact", head: true });
    if (error) return 0;
    return count ?? 0;
  } catch (err) {
    console.error("getUserCount failed:", err);
    return 0;
  }
}
