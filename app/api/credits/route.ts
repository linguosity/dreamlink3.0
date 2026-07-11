// app/api/credits/route.ts
//
// GET — the signed-in user's plan and remaining interpretation credits.
//
// Exists so the composer (CompactDreamInput) can tell the user what a
// submission will cost BEFORE they spend a credit ("This will use 1 of
// your N remaining free interpretations"). Read-only and cheap: one
// subscriptions lookup + the same count query the credit gate runs.
//
// Plan resolution mirrors getProfileContext() in app/api/dream-entries
// (and app/api/openai-analysis): an active `subscriptions` row wins,
// anything else is the free tier. Credit math reuses checkMonthlyCredits
// so this endpoint can never disagree with the enforcement path
// (Free = 3 lifetime at signup; paid = per calendar month).

import { createClient } from "@/utils/supabase/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";
import { checkMonthlyCredits } from "@/lib/monthlyCredits";
import { isUnlimitedPlan } from "@/lib/tierConfig";
import type { SubscriptionPlan } from "@/schema/profile";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized: you must be logged in to view credits" },
      { status: 401 },
    );
  }

  // Admin flag via the caller's own RLS-scoped profile row; subscriptions
  // via the admin client (same split as app/api/openai-analysis).
  const admin = getAdminClient();
  const [{ data: profile }, { data: sub }] = await Promise.all([
    supabase.from("profile").select("is_admin").eq("user_id", user.id).single(),
    admin
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const plan: SubscriptionPlan =
    (sub as any)?.plan === "visionary" || (sub as any)?.plan === "prophet"
      ? (sub as any).plan
      : "free";

  const credits = await checkMonthlyCredits(user.id, plan);

  return NextResponse.json({
    plan,
    used: credits.used,
    limit: credits.limit,
    remaining: Math.max(0, credits.limit - credits.used),
    unlimited: isUnlimitedPlan(plan),
    // Admins bypass the credit gate entirely (see dream-entries POST), so
    // the composer hides the cost line for them rather than show a number
    // that will never be enforced.
    is_admin: Boolean(profile?.is_admin),
  });
}
