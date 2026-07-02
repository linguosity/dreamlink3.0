// app/api/openai-analysis/route.ts
//
// Thin HTTP wrapper around the shared runDreamAnalysis() function in
// lib/dreamAnalysis.ts. The route exists for direct API calls (curl, future
// streaming variants); dream-entries calls runDreamAnalysis() directly to
// avoid the parallelism issues that arise when fanning out via synthetic
// NextRequest objects.
//
// Security (added 2026-06-09 release audit):
// - Requires an authenticated user (middleware deliberately exempts /api/*,
//   so the check lives here).
// - Shares the per-user daily budget with dream submissions so this route
//   can't be used to sidestep the rate limit.
// - Requested analysisDepth is clamped to the caller's subscription plan
//   (admins pass through unclamped), mirroring dream-entries.

import { NextResponse } from "next/server";
import { runDreamAnalysis } from "@/lib/dreamAnalysis";
import { createClient } from "@/utils/supabase/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { checkDreamSubmissionRateLimit } from "@/lib/rateLimit";
import {
  AnalysisDepth,
  analysisDepthSchema,
  clampDepthToPlan,
  type SubscriptionPlan,
} from "@/schema/profile";

export const runtime = "edge";

const MAX_DREAM_CHARS = 10_000;

export async function POST(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Rate limit (shared daily budget with dream submissions) ──────
  const rate = await checkDreamSubmissionRateLimit(user.id);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Daily analysis limit reached", limit: rate.limit },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds ?? 3600) },
      },
    );
  }

  // ── Input ─────────────────────────────────────────────────────────
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { dream, topic, readingLevel, analysisDepth } = body ?? {};

  if (!dream || typeof dream !== "string") {
    return NextResponse.json(
      { error: "Dream content is required" },
      { status: 400 },
    );
  }
  if (dream.length > MAX_DREAM_CHARS) {
    return NextResponse.json(
      { error: `Dream text exceeds ${MAX_DREAM_CHARS} characters` },
      { status: 400 },
    );
  }

  // ── Depth clamped to plan (admin bypasses) ────────────────────────
  // Admin client for the subscriptions lookup mirrors getProfileContext()
  // in dream-entries; the profile read goes through the caller's RLS.
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

  const requested = analysisDepthSchema.safeParse(analysisDepth);
  const requestedDepth = requested.success
    ? requested.data
    : AnalysisDepth.SHALLOW;
  const effectiveDepth = profile?.is_admin
    ? requestedDepth
    : clampDepthToPlan(requestedDepth, plan);

  const { analysis, usage } = await runDreamAnalysis({
    dream,
    topic,
    readingLevel,
    analysisDepth: effectiveDepth,
  });

  // Preserve the previous response shape (analysis fields at the top level)
  // and add a `_usage` block so callers that care about token counts can read
  // it without breaking older consumers that don't.
  return NextResponse.json({ ...analysis, _usage: usage });
}
