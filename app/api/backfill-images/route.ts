// app/api/backfill-images/route.ts
//
// One-time script to generate images for dream entries that are missing them.
// Call via: POST /api/backfill-images
// Processes up to 3 dreams per request with timeout safety buffer (10s buffer before 60s limit).
// Call repeatedly until all dreams have images.

import { NextResponse } from "next/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import {
  buildImagePrompt,
  generateAndStoreDreamImage,
  createDreamImageSignedUrl,
} from "@/utils/imageGeneration";

const DEBUG = process.env.NODE_ENV === 'development';

export const maxDuration = 60; // Vercel Hobby plan limit

// Security (added 2026-06-09 release audit): this maintenance route runs
// paid image generation across ALL users' dreams with the service-role
// client. It is admin-only.
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profile")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function POST() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const adminSupabase = getAdminClient();
  const startTime = Date.now();
  const TIMEOUT_BUFFER = 10000; // 10s buffer before 60s limit

  // ── Phase 0: re-sign legacy public URLs ──────────────────────────
  // Migration 20260609000001 made the dream-images bucket private, which
  // broke any image_url still pointing at /object/public/. Re-signing is
  // free (no BFL call), so sweep up to 100 per request.
  const PUBLIC_URL_MARKER = "/storage/v1/object/public/dream-images/";
  const { data: legacyRows } = await adminSupabase
    .from("dream_entries")
    .select("id, image_url")
    .like("image_url", `%${PUBLIC_URL_MARKER}%`)
    .limit(100);

  let resigned = 0;
  for (const row of legacyRows ?? []) {
    const url: string = (row as any).image_url ?? "";
    const path = decodeURIComponent(
      url.slice(url.indexOf(PUBLIC_URL_MARKER) + PUBLIC_URL_MARKER.length).split("?")[0],
    );
    const signed = await createDreamImageSignedUrl(adminSupabase as any, path);
    if (signed) {
      const { error: resignError } = await adminSupabase
        .from("dream_entries")
        .update({ image_url: signed } as never)
        .eq("id", (row as any).id);
      if (!resignError) resigned++;
    }
  }

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
    title?: string | null;
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
    resigned,
    remaining: Math.max(0, (count || 0) - successCount),
  });
}
