// app/api/dream-image/route.ts
//
// Generates a dream image via FLUX.2 [klein] 9B and stores it in Supabase.
// Called by the client after dream analysis completes. This runs as its own
// request so it isn't subject to the after() 10s cap on Vercel Hobby.

import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  buildImagePrompt,
  generateAndStoreDreamImage,
} from "@/utils/imageGeneration";
import { ImageAesthetic, imageAestheticSchema } from "@/schema/imageAesthetic";

export const maxDuration = 60; // Vercel function timeout

export async function POST(request: NextRequest) {
  try {
    const { dreamId, title, summary, topicSentence, aesthetic } = await request.json();

    if (!dreamId) {
      return NextResponse.json(
        { error: "dreamId is required" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }

    const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey);

    // Validate aesthetic if provided, default to sacred oil painting
    const parsedAesthetic = aesthetic
      ? imageAestheticSchema.safeParse(aesthetic)
      : null;
    const selectedAesthetic = parsedAesthetic?.success
      ? parsedAesthetic.data
      : ImageAesthetic.SACRED_OIL_PAINTING;

    const imagePrompt = buildImagePrompt(title, summary, topicSentence, selectedAesthetic);
    const imageUrl = await generateAndStoreDreamImage(dreamId, imagePrompt);

    if (imageUrl) {
      const { error: updateError } = await adminSupabase
        .from("dream_entries")
        .update({ image_url: imageUrl })
        .eq("id", dreamId);

      if (updateError) {
        console.error("Failed to update dream image_url:", updateError);
        return NextResponse.json(
          { error: "Image generated but DB update failed" },
          { status: 500 }
        );
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
