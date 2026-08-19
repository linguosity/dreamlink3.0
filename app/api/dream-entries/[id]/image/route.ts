// app/api/dream-entries/[id]/image/route.ts
//
// Self-heal / manual retry for a dream whose artwork never generated.
//
//   POST { manual?: boolean } -> (re)generate the image for a dream the caller
//   OWNS, but only when it is genuinely missing.
//
// Properties that keep this cheap and safe:
//   * Idempotent — if an image already exists it returns it with no BFL call.
//   * Attempt-capped — the automatic path stops after MAX_AUTO_ATTEMPTS so a
//     permanently failing prompt (e.g. content-moderated) can't be retried on
//     every page load forever. A manual request from the owner overrides the
//     cap: they've explicitly chosen to spend.
//   * Race-safe — the attempt counter is bumped by a single conditional UPDATE
//     ("the claim") before generating, so two concurrent loaders can't both
//     pay to generate the same image; exactly one wins the claim.
//   * Owner-only — the read is done through the caller's RLS-scoped client, so
//     it can only ever touch a dream the caller owns.
//
// Depends on dream_entries.image_attempts / image_last_attempt_at
// (migration 20260817000001).

import { createClient } from "@/utils/supabase/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";
import {
  buildImagePrompt,
  generateAndStoreDreamImage,
} from "@/utils/imageGeneration";
import type { ImageAesthetic } from "@/schema/imageAesthetic";

export const maxDuration = 60;

// Automatic self-heal stops after this many attempts.
const MAX_AUTO_ATTEMPTS = 3;
// Minimum gap between automatic attempts. Doubles as the race window: an
// in-flight generation stamps image_last_attempt_at, turning a second loader
// away until it clears.
const AUTO_COOLDOWN_MS = 90_000;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Dream ID is required" }, { status: 400 });
  }

  let manual = false;
  try {
    const body = await request.json();
    manual = Boolean(body?.manual);
  } catch {
    // No body — treat as an automatic self-heal request.
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ownership + current state via the caller's RLS-scoped client: this only
  // matches a row the caller owns, so it can never touch someone else's dream.
  // Cast to `any` because image_attempts / image_last_attempt_at aren't in the
  // generated types until `supabase gen types` is re-run post-migration.
  const { data: dreamRow, error: dreamError } = await (supabase.from("dream_entries") as any)
    .select(
      "id, title, dream_summary, topic_sentence, image_url, image_aesthetic_used, image_attempts, image_last_attempt_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (dreamError) {
    console.error("[dream-image] lookup failed:", dreamError);
    return NextResponse.json({ error: "Could not load that dream" }, { status: 500 });
  }
  if (!dreamRow) {
    return NextResponse.json({ error: "Dream not found" }, { status: 404 });
  }

  const row = dreamRow as any;

  // Already has art — idempotent success, never a second charge.
  if (row.image_url) {
    return NextResponse.json({ status: "already", imageUrl: row.image_url });
  }

  const attempts: number = row.image_attempts ?? 0;
  const lastAt: string | null = row.image_last_attempt_at ?? null;

  // Automatic path respects the cap and cooldown; manual overrides both.
  if (!manual) {
    if (attempts >= MAX_AUTO_ATTEMPTS) {
      return NextResponse.json({ status: "exhausted", attempts });
    }
    if (lastAt && Date.now() - new Date(lastAt).getTime() < AUTO_COOLDOWN_MS) {
      return NextResponse.json({ status: "cooldown" });
    }
  }

  const admin = getAdminClient();

  // ── Atomic claim ──────────────────────────────────────────────────────────
  // Bump the attempt counter + stamp the time BEFORE generating, but only if
  // the image is still missing AND (manual OR under-cap-and-past-cooldown).
  // Concurrent loaders race here; exactly one UPDATE matches and proceeds.
  const cooldownCutoff = new Date(Date.now() - AUTO_COOLDOWN_MS).toISOString();
  let claim = (admin.from("dream_entries") as any)
    .update({
      image_attempts: attempts + 1,
      image_last_attempt_at: new Date().toISOString(),
    })
    .eq("id", id)
    .is("image_url", null);
  if (!manual) {
    claim = claim
      .lt("image_attempts", MAX_AUTO_ATTEMPTS)
      .or(`image_last_attempt_at.is.null,image_last_attempt_at.lt.${cooldownCutoff}`);
  }
  const { data: claimed, error: claimError } = await claim.select("id").maybeSingle();

  if (claimError) {
    console.error("[dream-image] claim failed:", claimError);
    return NextResponse.json({ error: "Could not start generation" }, { status: 500 });
  }
  if (!claimed) {
    // Lost the race, already imaged, or guards not met — nothing to do.
    return NextResponse.json({ status: "in_progress" });
  }

  // ── Generate ────────────────────────────────────────────────────────────────
  try {
    const aesthetic = (row.image_aesthetic_used as ImageAesthetic) || undefined;
    const prompt = buildImagePrompt(
      row.title ?? "",
      row.dream_summary ?? "",
      row.topic_sentence ?? "",
      aesthetic,
    );
    const imageUrl = await generateAndStoreDreamImage(id, prompt);

    if (!imageUrl) {
      // No BFL key / storage disabled — not something the user can fix.
      return NextResponse.json({ status: "skipped" });
    }

    const { error: updateError } = await (admin.from("dream_entries") as any)
      .update({ image_url: imageUrl })
      .eq("id", id);
    if (updateError) {
      console.error("[dream-image] image_url update failed:", updateError);
      return NextResponse.json({ error: "Generated but failed to save" }, { status: 500 });
    }

    return NextResponse.json({ status: "success", imageUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // A real billing state is unmistakable and never hidden behind a 500.
    if (msg.startsWith("BFL_OUT_OF_CREDITS")) {
      console.error("[dream-image] out of credits:", msg);
      return NextResponse.json(
        { error: "Image credits exhausted", code: "out_of_image_credits" },
        { status: 402 },
      );
    }
    // The attempt counter was already bumped by the claim, so a doomed prompt
    // won't loop. Surface a soft failure the client can offer a retry for.
    console.error("[dream-image] generation failed:", msg);
    return NextResponse.json(
      { status: "failed", error: "Image generation failed" },
      { status: 502 },
    );
  }
}
