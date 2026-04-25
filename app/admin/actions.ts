"use server";

// Admin server actions. The /admin/* routes are already gated to admin users
// by utils/supabase/middleware.ts via the is_admin check on profile, so these
// actions can trust their caller. Defense-in-depth: each action still verifies
// the auth user has is_admin = true before mutating.

import { createClient } from "@/utils/supabase/server";
import { setComingSoonEnabled } from "@/lib/siteSettings";
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
