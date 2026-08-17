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

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ImageAesthetic, AESTHETIC_PRESETS } from '@/schema/imageAesthetic';

const BFL_ENDPOINT = 'https://api.bfl.ai/v1/flux-2-klein-9b';
// Must stay below the calling route's `maxDuration = 60` (Vercel kills the
// function at 60s — a 90s internal timeout could never fire, and slow
// generations were billed but never stored). 50s leaves headroom for the
// download + Supabase upload + DB writes.
const TIMEOUT_MS = 50_000;

// Per-request bounds.
//
// TIMEOUT_MS above is the *loop* budget, and the `while` condition is only
// evaluated between iterations — so a single socket that never answers hangs
// straight past it and burns the whole 60s function, having already been
// billed for the image. These cap each individual request instead. Sized to
// sit comfortably inside the loop budget: a poll returns a few bytes of JSON
// and should never need 8s, while submit and download move real payload.
const SUBMIT_TIMEOUT_MS = 15_000;
const POLL_TIMEOUT_MS = 8_000;
const DOWNLOAD_TIMEOUT_MS = 15_000;

// Exponential backoff polling config
const INITIAL_POLL_DELAY_MS = 500;
const BACKOFF_MULTIPLIER = 1.3;
const MAX_POLL_DELAY_MS = 4000;

// Submit-step retry policy. The submit call (not the poll loop) had no retry,
// so a single transient 429/5xx/timeout became a broken image even though a
// re-send would have succeeded. Two extra attempts with linear backoff let a
// blip self-heal. 402 (out of credits) is a billing state, never retried.
const SUBMIT_MAX_ATTEMPTS = 3;
const SUBMIT_RETRY_BASE_MS = 800;

// Square 1024×1024 (raised from 512 on 2026-07-31).
//
// FLUX.2 [klein] bills a FLAT RATE FOR THE FIRST MEGAPIXEL, then adds per
// additional MP. At 512×512 we were generating 0.26 MP and paying the full
// first-megapixel price — buying a megapixel and using a quarter of it.
// 1024×1024 is 1.05 MP: same ~$0.015/image, 4× the pixels.
//   https://docs.bfl.ml/quick_start/pricing
//
// Tradeoff (the 512 default was a deliberate thumbnail optimization, not an
// oversight): ~4× the bytes in Supabase Storage. At the time of the change
// the bucket held 77 objects / 14.6 MB against the 1 GB free-tier ceiling
// (1.4%), so there is ample headroom — but this is the knob to turn back
// first if storage becomes the binding constraint. Env-overridable so that
// can happen without a deploy.
const IMAGE_WIDTH = Number(process.env.DREAM_IMAGE_WIDTH) || 1024;
const IMAGE_HEIGHT = Number(process.env.DREAM_IMAGE_HEIGHT) || 1024;

// Blog covers are landscape, not square.
//
// cover_image_url is rendered into the OpenGraph tags and the
// summary_large_image Twitter card in app/blog/[slug]/page.tsx. Those cards
// are roughly 1.91:1 — a square image gets centre-cropped, which reliably
// eats the composition. 1216×640 is 1.9:1 and, at 0.78 MP, sits under the
// first megapixel FLUX charges a flat rate for: the better shape costs no
// more than the square, and marginally less.
const COVER_IMAGE_WIDTH = Number(process.env.BLOG_COVER_WIDTH) || 1216;
const COVER_IMAGE_HEIGHT = Number(process.env.BLOG_COVER_HEIGHT) || 640;

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

  // Look up the aesthetic preset. Default = Sacred Oil Painting — the
  // free-tier default, matching clampAestheticToTier's fallback. (Was
  // PHOTOREALISTIC_VISION, which silently gave undefined-aesthetic dreams
  // a Prophet-tier style.)
  const preset = AESTHETIC_PRESETS[aesthetic || ImageAesthetic.SACRED_OIL_PAINTING];

  // Build a prose prompt following Subject → Setting → Details → Lighting → Atmosphere
  // then append Style/Mood annotations from the selected aesthetic preset.
  // Camera/film language lives only in presets that call for it (Photorealistic
  // Vision already carries 35mm/Portra in its scene + annotation) — appending it
  // globally pushed stained glass, fresco, etc. toward photographic renders.
  return `${subject}. ${preset.scene} ${preset.styleAnnotation}`;
}

// Signed-URL lifetime. 10 years — these are share-by-link capabilities, not
// session credentials. If revocation-by-expiry is ever needed, shorten this
// and re-sign on read instead.
const SIGNED_URL_TTL_SECONDS = 10 * 365 * 24 * 60 * 60;

/**
 * Creates a long-lived signed URL for an object in the private dream-images
 * bucket. Exported so the admin backfill route can re-sign legacy public
 * URLs after the bucket was made private.
 */
export async function createDreamImageSignedUrl(
  adminSupabase: Pick<SupabaseClient<any, any, any>, 'storage'>,
  fileName: string
): Promise<string | null> {
  const { data, error } = await adminSupabase.storage
    .from('dream-images')
    .createSignedUrl(fileName, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    console.error('Failed to sign dream image URL:', error?.message);
    return null;
  }
  return data.signedUrl;
}

interface GenerateAndStoreOptions {
  /** Full FLUX prompt. */
  prompt: string;
  /** Supabase Storage bucket to upload into. */
  bucket: string;
  /** Object path within the bucket, minus the file extension. */
  pathPrefix: string;
  width: number;
  height: number;
  /** Omit for a fresh image each run; pass one to make regeneration stable. */
  seed?: number;
  /**
   * How the returned URL is formed. "signed" suits private buckets holding
   * personal content; "public" suits published content whose URL is handed to
   * unauthenticated fetchers such as OpenGraph scrapers.
   */
  urlMode: 'signed' | 'public';
  /** Prefix for the log lines, so dream and cover runs are tellable apart. */
  label: string;
}

/**
 * Shared BFL submit → poll → download → upload → URL pipeline.
 *
 * Extracted from generateAndStoreDreamImage when article covers needed the
 * same flow with a different bucket, shape and URL mode. The dream path
 * behaves exactly as before — it now just passes its choices in explicitly
 * rather than reading them from module constants.
 */
async function generateAndStore(
  options: GenerateAndStoreOptions
): Promise<string | null> {
  const { prompt, bucket, pathPrefix, width, height, seed, urlMode, label } = options;

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

  console.log(`🎨 Submitting ${label} generation to FLUX.2 [klein] 9B...`);
  console.log(`🎨 Full prompt: ${prompt}`);

  // ── Step 1: Submit generation request (retry on transient failures) ─────────
  let submitData: { polling_url?: string; id?: string } | null = null;
  let lastSubmitErr = '';
  for (let attempt = 1; attempt <= SUBMIT_MAX_ATTEMPTS; attempt++) {
    let submitRes: Response;
    try {
      submitRes = await fetch(BFL_ENDPOINT, {
        method: 'POST',
        signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
        headers: {
          'accept': 'application/json',
          'x-key': bflApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          width,
          height,
          ...(seed !== undefined ? { seed } : {}),
        }),
      });
    } catch (err) {
      // Network error or SUBMIT_TIMEOUT_MS abort — transient, worth a retry.
      lastSubmitErr = `network/timeout (${(err as Error).name})`;
      console.warn(
        `🎨 BFL submit attempt ${attempt}/${SUBMIT_MAX_ATTEMPTS} for ${label} failed: ${lastSubmitErr}`,
      );
      if (attempt < SUBMIT_MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, SUBMIT_RETRY_BASE_MS * attempt));
        continue;
      }
      throw new Error(`BFL submit failed after ${SUBMIT_MAX_ATTEMPTS} attempts: ${lastSubmitErr}`);
    }

    if (submitRes.ok) {
      submitData = await submitRes.json();
      break;
    }

    // Non-OK: read the body once so the REAL reason lands in the logs instead
    // of collapsing into a generic 500 at the client.
    const errText = await submitRes.text().catch(() => '');
    const status = submitRes.status;

    // 402 is a billing state, not a blip — retrying never helps, and it must be
    // unmistakable in the logs so a genuine out-of-credits case is never
    // mistaken for a transient hiccup.
    if (status === 402) {
      console.error(`🎨 BFL OUT OF CREDITS (402) for ${label}: ${errText}`);
      throw new Error(`BFL_OUT_OF_CREDITS: ${errText}`);
    }

    lastSubmitErr = `HTTP ${status}: ${errText}`;
    console.warn(
      `🎨 BFL submit attempt ${attempt}/${SUBMIT_MAX_ATTEMPTS} for ${label} returned ${lastSubmitErr}`,
    );

    // 429 (rate limit) and 5xx are transient — back off and retry. Other 4xx
    // (400/403/422…) are our fault or a hard reject; retrying won't help.
    const transient = status === 429 || status >= 500;
    if (transient && attempt < SUBMIT_MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, SUBMIT_RETRY_BASE_MS * attempt));
      continue;
    }
    throw new Error(`BFL submit failed (${status}): ${errText}`);
  }

  if (!submitData) {
    throw new Error(`BFL submit failed: no data after ${SUBMIT_MAX_ATTEMPTS} attempts (${lastSubmitErr})`);
  }

  const pollingUrl = submitData.polling_url;
  const requestId = submitData.id;

  if (!pollingUrl) {
    throw new Error('BFL response missing polling_url');
  }
  console.log(`🎨 BFL request ID: ${requestId}`);

  // ── Step 2: Poll until Ready ────────────────────────────────────────────────
  const startTime = Date.now();
  let currentDelay = INITIAL_POLL_DELAY_MS;

  while (Date.now() - startTime < TIMEOUT_MS) {
    await new Promise(resolve => setTimeout(resolve, currentDelay));

    // A hung or slow poll is not fatal — treat it exactly like a non-OK
    // response and let the loop budget govern the total. Aborting the whole
    // generation because one poll stalled would throw away work BFL has
    // already been paid for.
    let pollRes: Response;
    try {
      pollRes = await fetch(pollingUrl, {
        signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
        headers: {
          'accept': 'application/json',
          'x-key': bflApiKey,
        },
      });
    } catch (err) {
      console.log(`🎨 Poll request failed (${(err as Error).name}), retrying...`);
      currentDelay = Math.min(currentDelay * BACKOFF_MULTIPLIER, MAX_POLL_DELAY_MS);
      continue;
    }

    if (!pollRes.ok) {
      console.log(`🎨 Poll returned ${pollRes.status}, retrying...`);
      currentDelay = Math.min(currentDelay * BACKOFF_MULTIPLIER, MAX_POLL_DELAY_MS);
      continue;
    }

    const pollData = await pollRes.json();
    console.log(`🎨 BFL status: ${pollData.status}`);

    if (pollData.status === 'Ready' && pollData.result?.sample) {
      const signedUrl: string = pollData.result.sample;

      // ── Step 3: Download image ─────────────────────────────────────────────
      console.log('🎨 Downloading generated image...');
      const imgRes = await fetch(signedUrl, {
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      });
      if (!imgRes.ok) {
        throw new Error(`Failed to download image from BFL (${imgRes.status})`);
      }

      const imageBuffer = Buffer.from(await imgRes.arrayBuffer());
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const fileName = `${pathPrefix}.${ext}`;

      // ── Step 4: Upload to Supabase Storage ────────────────────────────────
      console.log(`🎨 Uploading to Supabase Storage: ${bucket}/${fileName}`);
      const { error: uploadError } = await adminSupabase.storage
        .from(bucket)
        .upload(fileName, imageBuffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // ── Step 5: Return the read URL ───────────────────────────────────────
      if (urlMode === 'public') {
        const { data } = adminSupabase.storage.from(bucket).getPublicUrl(fileName);
        if (!data?.publicUrl) {
          throw new Error('Failed to resolve public URL for stored image');
        }
        console.log(`🎨 Stored successfully: ${bucket}/${fileName}`);
        return data.publicUrl;
      }

      // The dream bucket is private (migration 20260609000001). The signed URL
      // is the capability: shareable by link, but the bucket can't be browsed
      // and objects can't be fetched without the token.
      const signed = await createDreamImageSignedUrl(adminSupabase, fileName);
      if (!signed) {
        throw new Error('Failed to create signed URL for stored image');
      }

      console.log(`🎨 Stored successfully: ${bucket}/${fileName}`);
      return signed;
    }

    if (pollData.status === 'Error' || pollData.status === 'Failed') {
      throw new Error(`BFL generation failed: ${JSON.stringify(pollData)}`);
    }

    currentDelay = Math.min(currentDelay * BACKOFF_MULTIPLIER, MAX_POLL_DELAY_MS);
  }

  throw new Error(`BFL image generation timed out after ${TIMEOUT_MS / 1000} seconds`);
}

/**
 * Generates a dream image via BFL API, downloads it, uploads to Supabase
 * Storage, and returns a long-lived signed URL (bucket is private).
 *
 * Uses the service-role key so it can bypass RLS for storage uploads.
 * This is safe because this function only runs server-side.
 */
export async function generateAndStoreDreamImage(
  dreamId: string,
  prompt: string
): Promise<string | null> {
  return generateAndStore({
    prompt,
    bucket: 'dream-images',
    pathPrefix: `${dreamId}/dream-image`,
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    urlMode: 'signed',
    label: 'dream image',
  });
}

/**
 * Generates a cover image for a blog post and returns a PUBLIC URL.
 *
 * Public rather than signed because cover_image_url is rendered into the
 * OpenGraph and Twitter card tags in app/blog/[slug]/page.tsx — the fetchers
 * that matter are Facebook, LinkedIn, X and Google, none of which
 * authenticate. See migration 20260809000001.
 *
 * Landscape rather than square because those cards render summary_large_image,
 * which crops a 1:1 image badly. FLUX bills a flat rate for the first
 * megapixel and 1216×640 is 0.78 MP, so the better shape costs the same as the
 * square it replaces.
 */
export async function generateAndStoreBlogCover(
  slug: string,
  prompt: string,
  seed?: number
): Promise<string | null> {
  return generateAndStore({
    prompt,
    bucket: 'blog-covers',
    pathPrefix: `${slug}/cover`,
    width: COVER_IMAGE_WIDTH,
    height: COVER_IMAGE_HEIGHT,
    seed,
    urlMode: 'public',
    label: 'blog cover',
  });
}
