// utils/imageGeneration.ts
//
// Handles AI image generation for dream entries using the Black Forest Labs
// FLUX.2 [klein] 9B model, with automatic upload to Supabase Storage.
//
// Flow:
//   1. Submit a generation request to BFL API (async)
//   2. Poll the polling_url until status is "Ready"
//   3. Download the generated image from the signed URL
//   4. Upload to Supabase Storage bucket "dream-images"
//   5. Return the permanent public URL

import { createClient } from '@supabase/supabase-js';
import { ImageAesthetic, AESTHETIC_PRESETS } from '@/schema/imageAesthetic';

const BFL_ENDPOINT = 'https://api.bfl.ai/v1/flux-2-klein-9b';
const TIMEOUT_MS = 90_000; // 90 second timeout

// Exponential backoff polling config
const INITIAL_POLL_DELAY_MS = 500;
const BACKOFF_MULTIPLIER = 1.3;
const MAX_POLL_DELAY_MS = 4000;

// Square 512×512 — thumbnail-optimized for DreamCard grid display
// ~75% smaller file size vs 1024×1024 with faster generation
const IMAGE_WIDTH = 512;
const IMAGE_HEIGHT = 512;

/**
 * Builds a FLUX.2 [klein] image prompt following BFL's prompting guide:
 *   Subject → Setting → Details → Lighting → Atmosphere
 *   + Style/Mood annotation at the end
 *
 * Key principles applied:
 * - Prose sentences, not keyword lists
 * - Subject and action lead the prompt
 * - Lighting described explicitly (source, quality, direction, temperature)
 * - Style/Mood tags appended for consistent biblical aesthetic
 *
 * See: docs/flux-prompting-guide.md
 */
export function buildImagePrompt(
  dreamTitle?: string,
  dreamSummary?: string,
  topicSentence?: string,
  aesthetic?: ImageAesthetic
): string {
  // Build the subject from ALL available dream content for unique imagery.
  // Title alone is too generic — the summary carries the actual dream details.
  const title = dreamTitle?.replace(/[.!?]+$/, '').trim();
  const summary = dreamSummary?.replace(/[.!?]+$/, '').trim();
  const topic = topicSentence?.replace(/[.!?]+$/, '').trim();

  // Combine: title sets the scene, summary/topic add unique detail
  // Truncate summary to ~120 chars to keep the prompt focused for FLUX
  const truncatedSummary = summary && summary.length > 120
    ? summary.substring(0, 120).replace(/\s+\S*$/, '')
    : summary;

  const parts = [title, truncatedSummary || topic].filter(Boolean);
  const subject = parts.length > 0 ? parts.join('. ') : 'A sacred vision';

  // Look up the aesthetic preset (default to Sacred Oil Painting for free users)
  const preset = AESTHETIC_PRESETS[aesthetic || ImageAesthetic.PHOTOREALISTIC_VISION];

  // Build a prose prompt following Subject → Setting → Details → Lighting → Atmosphere
  // then append Style/Mood annotations from the selected aesthetic preset
  // Default camera: 35mm film (Kodak Portra 400) with shallow DoF
  return `${subject}. ${preset.scene} ${preset.styleAnnotation} Shot on 35mm film (Kodak Portra 400) with shallow depth of field—subject razor-sharp, background softly blurred.`;
}

/**
 * Generates a dream image via BFL API, downloads it, uploads to Supabase
 * Storage, and returns the permanent public URL.
 *
 * Uses the service-role key so it can bypass RLS for storage uploads.
 * This is safe because this function only runs server-side.
 */
export async function generateAndStoreDreamImage(
  dreamId: string,
  prompt: string
): Promise<string | null> {
  const bflApiKey = process.env.BFL_API_KEY;
  if (!bflApiKey) {
    console.log('⚠️ BFL_API_KEY not set — skipping image generation');
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.log('⚠️ Supabase service role key not set — skipping image storage');
    return null;
  }

  // Admin client bypasses RLS for storage uploads
  const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('🎨 Submitting dream image generation to FLUX.2 [klein] 9B...');
  console.log(`🎨 Full prompt: ${prompt}`);

  // ── Step 1: Submit generation request ──────────────────────────────────────
  const submitRes = await fetch(BFL_ENDPOINT, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'x-key': bflApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`BFL submit failed (${submitRes.status}): ${errText}`);
  }

  const submitData = await submitRes.json();
  const pollingUrl: string = submitData.polling_url;
  const requestId: string = submitData.id;

  if (!pollingUrl) {
    throw new Error('BFL response missing polling_url');
  }
  console.log(`🎨 BFL request ID: ${requestId}`);

  // ── Step 2: Poll until Ready ────────────────────────────────────────────────
  const startTime = Date.now();
  let currentDelay = INITIAL_POLL_DELAY_MS;

  while (Date.now() - startTime < TIMEOUT_MS) {
    await new Promise(resolve => setTimeout(resolve, currentDelay));

    const pollRes = await fetch(pollingUrl, {
      headers: {
        'accept': 'application/json',
        'x-key': bflApiKey,
      },
    });

    if (!pollRes.ok) {
      console.log(`🎨 Poll returned ${pollRes.status}, retrying...`);
      // Increase delay with exponential backoff, capped at MAX_POLL_DELAY_MS
      currentDelay = Math.min(currentDelay * BACKOFF_MULTIPLIER, MAX_POLL_DELAY_MS);
      continue;
    }

    const pollData = await pollRes.json();
    console.log(`🎨 BFL status: ${pollData.status}`);

    if (pollData.status === 'Ready' && pollData.result?.sample) {
      const signedUrl: string = pollData.result.sample;

      // ── Step 3: Download image ─────────────────────────────────────────────
      console.log('🎨 Downloading generated image...');
      const imgRes = await fetch(signedUrl);
      if (!imgRes.ok) {
        throw new Error(`Failed to download image from BFL (${imgRes.status})`);
      }

      const imageBuffer = Buffer.from(await imgRes.arrayBuffer());
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const fileName = `${dreamId}/dream-image.${ext}`;

      // ── Step 4: Upload to Supabase Storage ────────────────────────────────
      console.log(`🎨 Uploading to Supabase Storage: dream-images/${fileName}`);
      const { error: uploadError } = await adminSupabase.storage
        .from('dream-images')
        .upload(fileName, imageBuffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // ── Step 5: Return public URL ──────────────────────────────────────────
      const { data: urlData } = adminSupabase.storage
        .from('dream-images')
        .getPublicUrl(fileName);

      console.log(`🎨 Dream image stored successfully: ${urlData.publicUrl}`);
      return urlData.publicUrl;
    }

    if (pollData.status === 'Error' || pollData.status === 'Failed') {
      throw new Error(`BFL generation failed: ${JSON.stringify(pollData)}`);
    }

    // Increase delay with exponential backoff, capped at MAX_POLL_DELAY_MS
    currentDelay = Math.min(currentDelay * BACKOFF_MULTIPLIER, MAX_POLL_DELAY_MS);
  }

  throw new Error('BFL image generation timed out after 90 seconds');
}
