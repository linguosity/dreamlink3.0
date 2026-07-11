// app/api/dream-entries/[id]/feedback/route.ts
//
// Owner-only one-tap feedback on a dream's interpretation.
//
//   POST { meaningful: boolean } -> sets meaningful + feedback_at.
//
// Idempotent: re-voting simply overwrites both columns, so a user can
// change their mind (Yes -> No) at any time.
//
// Auth: requires a logged-in user. Ownership is enforced by the
// user-scoped (RLS) client — the UPDATE only matches rows where
// auth.uid() = user_id, so a user can never rate someone else's dream.
// The public shared-dream page never renders this control.

import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized: you must be logged in to rate an interpretation" },
      { status: 401 },
    );
  }

  let body: { meaningful?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof body.meaningful !== "boolean") {
    return NextResponse.json(
      { error: "`meaningful` must be a boolean" },
      { status: 400 },
    );
  }
  const meaningful = body.meaningful;

  if (!id) {
    return NextResponse.json({ error: "Dream ID is required" }, { status: 400 });
  }

  // RLS scopes this UPDATE to the owner's rows only.
  const { data, error: updateError } = await supabase
    .from("dream_entries")
    .update({ meaningful, feedback_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("Error saving interpretation feedback:", updateError);
    return NextResponse.json(
      { error: "Could not save feedback" },
      { status: 500 },
    );
  }

  if (!data) {
    // Not found OR not owned by this user (RLS hid it) — same response so
    // we don't leak existence of other users' dreams.
    return NextResponse.json({ error: "Dream not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, meaningful });
}
