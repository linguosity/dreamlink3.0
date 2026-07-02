// app/api/dream-entries/share/route.ts
//
// Owner-only controls for opting a dream into (or out of) public sharing.
//
//   POST   { id, scope: 'summary' | 'full' }  -> enables sharing, mints a
//                                                share_token if needed, and
//                                                returns the token + scope.
//   DELETE ?id=<dreamId>                       -> revokes sharing
//                                                (is_public = false).
//
// Token rotation (2026-06-09 privacy fix): revoking then re-sharing mints a
// NEW token. Previously the old token was reused, so anyone who held the old
// link silently regained access on re-share. Re-sharing while already shared
// (e.g. changing scope) keeps the current token so a just-sent link doesn't
// break.
//
// Auth: requires a logged-in user. Ownership is enforced by the
// user-scoped (RLS) client — the UPDATE only matches rows where
// auth.uid() = user_id, so a user can never toggle someone else's dream.

import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import crypto from "crypto";

type Scope = "summary" | "full";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized: you must be logged in to share a dream" },
      { status: 401 },
    );
  }

  let body: { id?: string; scope?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const id = body.id;
  const scope: Scope = body.scope === "full" ? "full" : "summary";

  if (!id) {
    return NextResponse.json({ error: "Dream ID is required" }, { status: 400 });
  }

  // Look up the dream (RLS guarantees it belongs to this user).
  const { data: existing, error: fetchError } = await supabase
    .from("dream_entries")
    .select("id, share_token, is_public")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("Error loading dream for share:", fetchError);
    return NextResponse.json({ error: "Could not load dream" }, { status: 500 });
  }

  if (!existing) {
    // Not found OR not owned by this user (RLS hid it) — same response so
    // we don't leak existence of other users' dreams.
    return NextResponse.json({ error: "Dream not found" }, { status: 404 });
  }

  // Keep the token only while sharing is continuously on; a revoked dream
  // gets a fresh token on re-share so old link holders don't regain access.
  const token =
    existing.is_public && existing.share_token
      ? existing.share_token
      : crypto.randomUUID();

  const { error: updateError } = await supabase
    .from("dream_entries")
    .update({
      is_public: true,
      share_token: token,
      share_scope: scope,
    })
    .eq("id", id);

  if (updateError) {
    console.error("Error enabling share:", updateError);
    return NextResponse.json({ error: "Could not enable sharing" }, { status: 500 });
  }

  return NextResponse.json({ success: true, share_token: token, scope });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized: you must be logged in to manage sharing" },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Dream ID is required" }, { status: 400 });
  }

  // RLS scopes this UPDATE to the owner's rows only.
  const { error: updateError } = await supabase
    .from("dream_entries")
    .update({ is_public: false })
    .eq("id", id);

  if (updateError) {
    console.error("Error revoking share:", updateError);
    return NextResponse.json({ error: "Could not revoke sharing" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
