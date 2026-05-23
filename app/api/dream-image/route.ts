// app/api/dream-image/route.ts
//
// Generates a dream image via FLUX.2 [klein] 9B and stores it in Supabase.
// Called by the client after dream analysis completes. This runs as its own
// request so it isn't subject to the after() 10s cap on Vercel Hobby.

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/utils/supabase/admin";
import {
  buildImagePrompt,
  generateAndStoreDreamImage,
} from "@/utils/imageGeneration";
import { ImageAesthetic, imageAestheticSchema } from "@/schema/imageAesthetic";
import { FLUX_IMAGE_COST_USD } from "@/utils/pricing";

const DEBUG = process.env.NODE_ENV === 'development';

export const maxDuration = 60; // Vercel function timeout

export async function POST(request: NextRequest) {
  try {
    const {
      dreamId,
      title,
      summary,
      topicSentence,
      aesthetic,
      comparisonGroupId,
    } = await request.json();

    if (!dreamId) {
      return NextResponse.json(
        { error: "dreamId is required" },
        { status: 400 }
      );
    }

    const adminSupabase = getAdminClient();

    // Validate aesthetic if provided, default to sacred oil painting
    const parsedAesthetic = aesthetic
      ? imageAestheticSchema.safeParse(aesthetic)
      : null;
    const selectedAesthetic = parsedAesthetic?.success
      ? parsedAesthetic.data
      : ImageAesthetic.PHOTOREALISTIC_VISION;

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
