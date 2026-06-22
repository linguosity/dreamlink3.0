// app/api/dream-image/route.ts
//
// Generates a dream image via FLUX.2 [klein] 9B and stores it in Supabase.
// Called by the client after dream analysis completes. This runs as its own
// request so it isn't subject to the after() 10s cap on Vercel Hobby.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import {
  buildImagePrompt,
  generateAndStoreDreamImage,
} from "@/utils/imageGeneration";
import {
  ImageAesthetic,
  imageAestheticSchema,
  clampAestheticToTier,
  planToAestheticTier,
} from "@/schema/imageAesthetic";
import type { SubscriptionPlan } from "@/schema/profile";
import { FLUX_IMAGE_COST_USD } from "@/utils/pricing";

const DEBUG = process.env.NODE_ENV === 'development';

export const maxDuration = 60; // Vercel function timeout

// Security (added 2026-06-09 release audit): this route used to be fully
// unauthenticated while writing via the service-role client — anonymous
// callers could burn FLUX spend and overwrite any user's image_url (IDOR).
// Now: auth required; callers must own the dream; comparison-group (matrix
// test mode) generation is admin-only; non-admins can only generate when the
// dream has no image yet (the client fires this exactly once per new dream).

const bodySchema = z.object({
  dreamId: z.string().uuid(),
  title: z.string().max(500).optional().default(""),
  summary: z.string().max(4000).optional().default(""),
  topicSentence: z.string().max(2000).optional().default(""),
  aesthetic: z.unknown().optional(),
  comparisonGroupId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Input validation ──────────────────────────────────────────
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsedBody = bodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsedBody.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { dreamId, title, summary, topicSentence, aesthetic, comparisonGroupId } =
      parsedBody.data;

    const adminSupabase = getAdminClient();

    // ── Authorization ─────────────────────────────────────────────
    const { data: profile } = await supabase
      .from("profile")
      .select("is_admin")
      .eq("user_id", user.id)
      .single();
    const isAdmin = Boolean(profile?.is_admin);

    if (comparisonGroupId && !isAdmin) {
      // Matrix/test-mode generation spans rows across the comparison group
      // and is an admin-only feature.
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: dream, error: dreamError } = await adminSupabase
      .from("dream_entries")
      .select("id, user_id, image_url")
      .eq("id", dreamId)
      .maybeSingle();

    if (dreamError || !dream) {
      return NextResponse.json({ error: "Dream not found" }, { status: 404 });
    }
    if (!isAdmin) {
      if ((dream as any).user_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if ((dream as any).image_url) {
        // The client triggers generation once, right after analysis. A dream
        // that already has an image doesn't need a paid regeneration.
        return NextResponse.json({ imageUrl: (dream as any).image_url });
      }
    }

    // Validate aesthetic if provided, default to a free-tier style.
    const parsedAesthetic = aesthetic
      ? imageAestheticSchema.safeParse(aesthetic)
      : null;
    const requestedAesthetic = parsedAesthetic?.success
      ? parsedAesthetic.data
      : ImageAesthetic.SACRED_OIL_PAINTING;

    // Gate paid aesthetics by plan (non-admins). Without this a free user could
    // POST a Prophet-tier style directly and we'd pay for it. Admins (matrix
    // test mode) keep whatever they requested.
    let selectedAesthetic = requestedAesthetic;
    if (!isAdmin) {
      const { data: subRow } = await adminSupabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const plan: SubscriptionPlan =
        subRow?.plan === "visionary" || subRow?.plan === "prophet"
          ? subRow.plan
          : "free";
      selectedAesthetic = clampAestheticToTier(requestedAesthetic, planToAestheticTier(plan));
    }

    const imagePrompt = buildImagePrompt(title, summary, topicSentence, selectedAesthetic);
    const imageUrl = await generateAndStoreDreamImage(dreamId, imagePrompt);

    if (imageUrl) {
      // For matrix submissions, share the generated image across every row
      // in the comparison group that uses the same aesthetic. The admin
      // explicitly opted into per-aesthetic uniqueness by adding the
      // aesthetic dimension to test mode; rows without that dimension
      // (or non-matrix rows) get a single shared image.
      const update = adminSupabase
        .from("dream_entries")
        .update({ image_url: imageUrl } as never);

      const { error: updateError } = comparisonGroupId
        ? await update
            .eq("comparison_group_id", comparisonGroupId)
            .eq("image_aesthetic_used", selectedAesthetic)
        : await update.eq("id", dreamId);

      if (updateError) {
        console.error("Failed to update dream image_url:", updateError);
        return NextResponse.json(
          { error: "Image generated but DB update failed" },
          { status: 500 }
        );
      }

      // Stamp the image cost onto the chatgpt_interactions row(s) for this
      // dream entry so the admin DreamCard footer can show end-to-end cost.
      // For matrix submissions that share an image across an aesthetic, we
      // update every interaction row in the comparison group with the same
      // aesthetic — mirrors the image_url update above.
      const interactionUpdate = adminSupabase
        .from("chatgpt_interactions")
        .update({
          image_generated: true,
          image_cost_usd: FLUX_IMAGE_COST_USD,
        } as never);

      const { error: interactionError } = comparisonGroupId
        ? await interactionUpdate.in(
            "dream_entry_id",
            // Pull the IDs of every dream in the group that uses this aesthetic;
            // the chatgpt_interactions rows for those are the ones to stamp.
            (
              await adminSupabase
                .from("dream_entries")
                .select("id")
                .eq("comparison_group_id", comparisonGroupId)
                .eq("image_aesthetic_used", selectedAesthetic)
            ).data?.map((r: { id: string }) => r.id) ?? [dreamId],
          )
        : await interactionUpdate.eq("dream_entry_id", dreamId);

      if (interactionError) {
        // Don't fail the request — the image already saved, this is observability.
        console.error("Failed to log image cost on chatgpt_interactions:", interactionError);
      }

      return NextResponse.json({ imageUrl });
    }

    return NextResponse.json({ imageUrl: null });
  } catch (err) {
    console.error("Dream image generation failed:", err);
    return NextResponse.json(
      { error: "Image generation failed" },
      { status: 500 }
    );
  }
}
