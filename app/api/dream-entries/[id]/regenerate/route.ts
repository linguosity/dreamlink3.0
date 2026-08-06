// app/api/dream-entries/[id]/regenerate/route.ts
//
// "Read again · 1 credit" — HANDOFF-v3.md §5 item 4.
//
//   POST (no body) -> re-runs the interpretation for a dream the caller owns,
//                     replacing the analysis and its scripture citations in
//                     place, and returns the fresh reading.
//
// Why a re-read is worth shipping: a reading the user finds wrong is a dead
// end today. Item 5's Yes / Not really tells us it missed; item 4 lets them
// do something about it. The two are a pair.
//
// COST HONESTY. §5 item 3 forbids disclosing cost after deduction, and the
// button states "1 credit" — so this must actually spend one. The product's
// credit meter counts dream_entries ROWS (lib/monthlyCredits.ts), and a
// re-read updates a row rather than inserting one, so it would otherwise be
// silently free. The spend is recorded in `credit_spends`, which
// checkMonthlyCredits() now adds to its count (see migration
// 20260806000001). The ledger row is written BEFORE the model call and is
// fail-closed: if it can't be recorded, no reading is produced. A user who
// gets a free re-read because of a database blip is a smaller problem than a
// user who is charged for one they never received, but a re-read that
// bypasses the meter entirely is how a free tier stops being free.
//
// Guards mirror the create path (app/api/dream-entries POST) exactly, in the
// same order: admin bypass, email verification, global circuit breaker,
// per-tier credit cap, per-user daily rate limit. A re-read costs the same
// model call as a first read, so it gets the same defences.

import { createClient } from "@/utils/supabase/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";
import { decryptDreamRow } from "@/lib/crypto";
import { checkDreamSubmissionRateLimit } from "@/lib/rateLimit";
import { checkMonthlyCredits, checkGlobalDailyDreamCap } from "@/lib/monthlyCredits";
import { analyzeAndPersist } from "@/lib/analysisPersistence";
import { captureServerEvent } from "@/lib/analytics-server";
import {
  AnalysisDepth,
  ReadingLevel,
  clampDepthToPlan,
  type SubscriptionPlan,
} from "@/schema/profile";

// Same budget as the create path — one model call of identical shape.
export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Dream ID is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized: you must be logged in to re-read a dream" },
      { status: 401 },
    );
  }

  // Ownership via the caller's RLS-scoped client — the select only matches
  // rows where auth.uid() = user_id, so this can never re-read someone
  // else's dream (and never reveals that theirs exists).
  const { data: dreamRow, error: dreamError } = await supabase
    .from("dream_entries")
    .select("id, original_text, original_text_enc, analysis_depth, reading_level_used")
    .eq("id", id)
    .maybeSingle();

  if (dreamError) {
    console.error("[regenerate] dream lookup failed:", dreamError);
    return NextResponse.json({ error: "Could not load that dream" }, { status: 500 });
  }
  if (!dreamRow) {
    return NextResponse.json({ error: "Dream not found" }, { status: 404 });
  }

  const { original_text: dreamText } = decryptDreamRow({
    original_text: (dreamRow as any).original_text ?? null,
    original_text_enc: (dreamRow as any).original_text_enc ?? null,
  });

  if (!dreamText || !dreamText.trim()) {
    // Nothing to re-read. Never charge for this.
    return NextResponse.json(
      { error: "This dream has no text to re-read." },
      { status: 422 },
    );
  }

  const admin = getAdminClient();

  const [{ data: profile }, { data: sub }] = await Promise.all([
    admin.from("profile").select("is_admin, analysis_depth, reading_level").eq("user_id", user.id).single(),
    admin
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const p: any = profile ?? {};
  const s: any = sub ?? {};
  const isAdmin = Boolean(p.is_admin);
  const plan: SubscriptionPlan =
    s?.plan === "visionary" || s?.plan === "prophet" ? s.plan : "free";

  // Spend guards — same order and same semantics as the create path.
  if (!isAdmin) {
    if (!user.email_confirmed_at) {
      return NextResponse.json(
        { error: "Please verify your email before re-reading a dream.", code: "email_unverified" },
        { status: 403 },
      );
    }

    const globalCap = await checkGlobalDailyDreamCap();
    if (!globalCap.allowed) {
      return NextResponse.json(
        { error: "DreamRiver is at capacity right now. Please try again shortly." },
        { status: 503, headers: { "Retry-After": "3600" } },
      );
    }

    const credits = await checkMonthlyCredits(user.id, plan);
    if (!credits.allowed) {
      return NextResponse.json(
        {
          error:
            plan === "free"
              ? `You've used all ${credits.limit} of your free dream credits. Upgrade to keep interpreting.`
              : `You've used all ${credits.limit} of your monthly dream credits. Upgrade for more.`,
          code: "out_of_credits",
          used: credits.used,
          limit: credits.limit,
        },
        {
          status: 402,
          headers: credits.retryAfterSeconds
            ? { "Retry-After": String(credits.retryAfterSeconds) }
            : undefined,
        },
      );
    }

    const rl = await checkDreamSubmissionRateLimit(user.id);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Daily dream submission limit reached (${rl.limit} per 24 hours). Please try again later.`,
          used: rl.used,
          limit: rl.limit,
        },
        {
          status: 429,
          headers: rl.retryAfterSeconds
            ? { "Retry-After": String(rl.retryAfterSeconds) }
            : undefined,
        },
      );
    }

    // Record the spend BEFORE the model call. Fail closed: an unrecorded
    // spend is a free re-read, and a free re-read in a loop is an unmetered
    // OpenAI bill. Admins are exempt because they bypass the meter entirely.
    const { error: spendError } = await admin
      .from("credit_spends")
      .insert({ user_id: user.id, dream_entry_id: id, kind: "regeneration" } as never);

    if (spendError) {
      console.error(
        "[regenerate] could not record credit spend — refusing to re-read (is migration 20260806000001 applied?):",
        spendError,
      );
      return NextResponse.json(
        { error: "Could not start a new reading right now. Please try again shortly." },
        { status: 503 },
      );
    }
  }

  // Depth/reading level: whatever this dream was originally read at, falling
  // back to the profile's current preference. Clamped to plan so a downgrade
  // can't be laundered into a Profound re-read.
  const depth = clampDepthToPlan(
    ((dreamRow as any).analysis_depth as AnalysisDepth) ??
      (p.analysis_depth as AnalysisDepth) ??
      AnalysisDepth.SHALLOW,
    plan,
  );
  const readingLevel: ReadingLevel =
    ((dreamRow as any).reading_level_used as ReadingLevel) ??
    (p.reading_level as ReadingLevel) ??
    ReadingLevel.CELESTIAL_INSIGHT;

  const { ok } = await analyzeAndPersist({
    adminSupabase: admin,
    dreamId: id,
    dreamText,
    depth,
    readingLevel,
    // A cache hit would return the byte-identical reading the user just asked
    // to replace — the one outcome "Read again" must never produce.
    bypassCache: true,
    replaceCitations: true,
  });

  if (!ok) {
    return NextResponse.json(
      { error: "That reading didn't come through. Please try again." },
      { status: 502 },
    );
  }

  await captureServerEvent(user.id, "interpretation_regenerated", {
    dream_id: id,
    plan,
    depth,
  });

  // Return the refreshed row so the client can swap the reading in without a
  // full reload. Read through the user-scoped client, so what comes back is
  // exactly what that user is allowed to see.
  const { data: refreshed } = await supabase
    .from("dream_entries")
    .select(
      "id, title, dream_summary, analysis_summary, formatted_analysis, topic_sentence, supporting_points, conclusion_sentence, personalized_summary, tags, bible_refs",
    )
    .eq("id", id)
    .maybeSingle();

  return NextResponse.json({ success: true, dream: refreshed ?? null });
}
