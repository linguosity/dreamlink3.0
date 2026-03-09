// app/api/backfill-images/route.ts
//
// One-time script to generate images for dream entries that are missing them.
// Call via: POST /api/backfill-images
// Processes one dream per request to stay within Vercel timeout.
// Call repeatedly until all dreams have images.

import { NextResponse } from "next/server";
import { getAdminClient } from "@/utils/supabase/admin";
import {
  buildImagePrompt,
  generateAndStoreDreamImage,
} from "@/utils/imageGeneration";

export const maxDuration = 60; // Vercel Hobby plan limit

export async function POST() {
  const adminSupabase = getAdminClient();

  // Find the next dream without an image that has analysis data
  const { data: dreams, error } = await adminSupabase
    .from("dream_entries")
    .select("id, title, dream_summary, topic_sentence")
    .is("image_url", null)
    .not("dream_summary", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!dreams || dreams.length === 0) {
    return NextResponse.json({ message: "All dreams have images!", remaining: 0 });
  }

  const dream = dreams[0];

  // Count how many more need images (for progress reporting)
  const { count } = await adminSupabase
    .from("dream_entries")
    .select("id", { count: "exact", head: true })
    .is("image_url", null)
    .not("dream_summary", "is", null);

  try {
    const imagePrompt = buildImagePrompt(
      dream.title || "",
      dream.dream_summary || "",
      dream.topic_sentence || ""
    );

    const imageUrl = await generateAndStoreDreamImage(dream.id, imagePrompt);

    if (imageUrl) {
      await adminSupabase
        .from("dream_entries")
        .update({ image_url: imageUrl })
        .eq("id", dream.id);

      return NextResponse.json({
        status: "success",
        dreamId: dream.id,
        title: dream.title,
        imageUrl,
        remaining: (count || 1) - 1,
      });
    }

    return NextResponse.json({
      status: "no_image_returned",
      dreamId: dream.id,
      remaining: count || 0,
    });
  } catch (err) {
    return NextResponse.json({
      status: "error",
      dreamId: dream.id,
      error: err instanceof Error ? err.message : String(err),
      remaining: count || 0,
    }, { status: 500 });
  }
}
