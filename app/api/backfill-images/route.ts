// app/api/backfill-images/route.ts
//
// One-time script to generate images for dream entries that are missing them.
// Call via: POST /api/backfill-images
// Processes up to 3 dreams per request with timeout safety buffer (10s buffer before 60s limit).
// Call repeatedly until all dreams have images.

import { NextResponse } from "next/server";
import { getAdminClient } from "@/utils/supabase/admin";
import {
  buildImagePrompt,
  generateAndStoreDreamImage,
} from "@/utils/imageGeneration";

const DEBUG = process.env.NODE_ENV === 'development';

export const maxDuration = 60; // Vercel Hobby plan limit

export async function POST() {
  const adminSupabase = getAdminClient();
  const startTime = Date.now();
  const TIMEOUT_BUFFER = 10000; // 10s buffer before 60s limit

  // Find up to 3 dreams without images that have analysis data
  const { data: dreams, error } = await adminSupabase
    .from("dream_entries")
    .select("id, title, dream_summary, topic_sentence")
    .is("image_url", null)
    .not("dream_summary", "is", null)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!dreams || dreams.length === 0) {
    return NextResponse.json({ message: "All dreams have images!", remaining: 0 });
  }

  // Count total remaining dreams that need images (for progress reporting)
  const { count } = await adminSupabase
    .from("dream_entries")
    .select("id", { count: "exact", head: true })
    .is("image_url", null)
    .not("dream_summary", "is", null);

  const results: Array<{
    dreamId: string;
    title?: string;
    status: "success" | "no_image" | "error" | "timeout";
    imageUrl?: string;
    error?: string;
  }> = [];

  // Process dreams sequentially (not parallel) to avoid BFL rate limits
  for (const dream of dreams) {
    // Check if we're approaching the timeout
    if (Date.now() - startTime > 60000 - TIMEOUT_BUFFER) {
      if (DEBUG) console.log(
        `Approaching timeout, stopping batch. Processed ${results.length} of ${dreams.length} dreams.`
      );
      break;
    }

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

        results.push({
          dreamId: dream.id,
          title: dream.title,
          status: "success",
          imageUrl,
        });
      } else {
        results.push({
          dreamId: dream.id,
          title: dream.title,
          status: "no_image",
        });
      }
    } catch (err) {
      results.push({
        dreamId: dream.id,
        title: dream.title,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const successCount = results.filter((r) => r.status === "success").length;

  return NextResponse.json({
    results,
    processed: results.length,
    successful: successCount,
    remaining: Math.max(0, (count || 0) - successCount),
  });
}
