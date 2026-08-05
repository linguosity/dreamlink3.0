"use server";

// Admin server actions. The /admin/* routes are already gated to admin users
// by utils/supabase/middleware.ts via the is_admin check on profile, so these
// actions can trust their caller. Defense-in-depth: each action still verifies
// the auth user has is_admin = true before mutating.

import { createClient } from "@/utils/supabase/server";
import { setComingSoonEnabled, setSocialLinks } from "@/lib/siteSettings";
import { setTestimonials, type Testimonial } from "@/lib/testimonials";
import {
  getAnalyticsDigestConfig,
  setAnalyticsDigestConfig,
} from "@/lib/analyticsDigest";
import {
  coerceAnalyticsDigestConfig,
  type AnalyticsDigestConfig,
} from "@/lib/analyticsDigestConfig";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  const { data: profile } = await supabase
    .from("profile")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) {
    throw new Error("Forbidden");
  }
  return user;
}

export async function toggleComingSoonAction(
  enabled: boolean,
): Promise<{ ok: true; enabled: boolean } | { error: string }> {
  try {
    const user = await requireAdmin();
    await setComingSoonEnabled(enabled, user.id);
    // Force the admin dashboard to re-render with the new flag value.
    revalidatePath("/admin");
    return { ok: true, enabled };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: message };
  }
}

export async function toggleFounderTaskAction(
  taskId: string,
  done: boolean,
): Promise<{ ok: true } | { error: string }> {
  try {
    const user = await requireAdmin();
    // RLS grants admins ALL on founder_tasks; use the user-scoped client so
    // the policy is exercised (defense-in-depth on top of requireAdmin).
    // Untyped cast: founder_tasks isn't in lib/database.types.ts yet —
    // regenerate types after applying migration 20260720000001.
    const supabase = (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;
    const { error } = await supabase
      .from("founder_tasks")
      .update(
        done
          ? { done_at: new Date().toISOString(), done_by: user.email ?? null }
          : { done_at: null, done_by: null },
      )
      .eq("id", taskId);
    if (error) throw new Error(error.message);
    revalidatePath("/admin");
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: message };
  }
}

export async function saveSocialLinksAction(
  links: Record<string, string>,
): Promise<{ ok: true } | { error: string }> {
  try {
    const user = await requireAdmin();
    // setSocialLinks re-validates server-side: only known platforms are
    // stored, blanks are dropped (= icon hidden), non-https URLs throw.
    await setSocialLinks(links, user.id);
    // Landing footer reads these server-side; drop its cache.
    revalidatePath("/landing");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: message };
  }
}

export async function saveAnalyticsDigestAction(
  input: Omit<AnalyticsDigestConfig, "lastSentOn">,
): Promise<{ ok: true } | { error: string }> {
  try {
    const user = await requireAdmin();
    // Preserve the dedupe ledger (lastSentOn) across saves — the form never
    // sees it, and losing it could double-send on the next tick.
    const current = await getAnalyticsDigestConfig();
    const candidate = coerceAnalyticsDigestConfig({
      ...input,
      lastSentOn: current.lastSentOn,
    });
    if (candidate.recipients.length === 0) {
      throw new Error("Add at least one valid recipient email.");
    }
    await setAnalyticsDigestConfig(candidate, user.id);
    revalidatePath("/admin/system");
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: message };
  }
}

export async function saveTestimonialsAction(
  testimonials: Testimonial[],
): Promise<{ ok: true } | { error: string }> {
  try {
    const user = await requireAdmin();
    await setTestimonials(testimonials, user.id);
    // Landing page reads these server-side; drop its cache.
    revalidatePath("/landing");
    revalidatePath("/admin/system");
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: message };
  }
}
