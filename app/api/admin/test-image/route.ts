// app/api/admin/test-image/route.ts
//
// Admin-only smoke test for the Black Forest Labs (FLUX) image pipeline.
// Submits one small generation job and polls until it's Ready (or errors),
// then returns the outcome so the admin System page can show green/red without
// anyone having to curl by hand. Costs a fraction of a cent per run.
//
// Mirrors utils/imageGeneration.ts (same endpoint + dimensions) but does NOT
// store anything — it just proves the key, credits, and round-trip work.

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const maxDuration = 60;

const BFL_ENDPOINT = "https://api.bfl.ai/v1/flux-2-klein-9b";
const WIDTH = 512;
const HEIGHT = 512;
const TIMEOUT_MS = 45_000;
// Per-request bounds — TIMEOUT_MS is only checked between loop iterations,
// so it cannot rescue a single socket that never answers.
const SUBMIT_TIMEOUT_MS = 15_000;
const POLL_TIMEOUT_MS = 8_000;

export async function POST() {
  // ── Auth: admin only ──────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profile")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const key = process.env.BFL_API_KEY;
  if (!key) {
    return NextResponse.json({
      ok: false,
      stage: "config",
      error: "BFL_API_KEY is not set in this environment.",
    });
  }

  const started = Date.now();
  try {
    // ── Submit ──────────────────────────────────────────────────
    const submitRes = await fetch(BFL_ENDPOINT, {
      method: "POST",
      signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
      headers: { accept: "application/json", "x-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt:
          "a serene river of golden light beneath a crescent moon, luminous oil painting, sacred and peaceful",
        width: WIDTH,
        height: HEIGHT,
      }),
    });

    if (!submitRes.ok) {
      const text = await submitRes.text();
      return NextResponse.json({
        ok: false,
        stage: "submit",
        httpStatus: submitRes.status,
        error:
          submitRes.status === 401 || submitRes.status === 403
            ? "BFL rejected the API key (401/403) — check BFL_API_KEY."
            : submitRes.status === 402
              ? "BFL account is out of credits (402)."
              : submitRes.status === 429
                ? "Rate limited by BFL (429) — try again shortly."
                : `BFL submit failed: ${text.slice(0, 300)}`,
      });
    }

    const submit = await submitRes.json();
    const pollingUrl: string | undefined = submit.polling_url;
    if (!pollingUrl) {
      return NextResponse.json({ ok: false, stage: "submit", error: "No polling_url in BFL response." });
    }

    // ── Poll ────────────────────────────────────────────────────
    let delay = 600;
    while (Date.now() - started < TIMEOUT_MS) {
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 1.5, 4000);

      let pollRes: Response;
      try {
        pollRes = await fetch(pollingUrl, {
          signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
          headers: { accept: "application/json", "x-key": key },
        });
      } catch {
        continue;
      }
      if (!pollRes.ok) continue;
      const poll = await pollRes.json();

      if (poll.status === "Ready" && poll.result?.sample) {
        return NextResponse.json({
          ok: true,
          stage: "ready",
          sampleUrl: poll.result.sample as string,
          cost: submit.cost ?? null,
          elapsedMs: Date.now() - started,
        });
      }
      if (poll.status === "Error" || poll.status === "Failed") {
        return NextResponse.json({
          ok: false,
          stage: "generation",
          error: `BFL generation failed: ${JSON.stringify(poll).slice(0, 300)}`,
        });
      }
    }

    return NextResponse.json({
      ok: false,
      stage: "timeout",
      error: `Timed out after ${Math.round(TIMEOUT_MS / 1000)}s waiting for BFL.`,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      stage: "network",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
