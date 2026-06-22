// app/api/dream-entries/star/route.ts
//
// Owner-only toggle for "starring" (favoriting) a dream.
//
//   POST { id, starred: boolean } -> sets is_starred to the given value.
//
// Auth: requires a logged-in user. Ownership is enforced by the
// user-scoped (RLS) client — the UPDATE only matches rows where
// auth.uid() = user_id, so a user can never star someone else's dream.

import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized: you must be logged in to star a dream" },
      { status: 401 },
    );
  }

  let body: { id?: string; starred?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const id = body.id;
  const starred = Boolean(body.starred);

  if (!id) {
    return NextResponse.json({ error: "Dream ID is required" }, { status: 400 });
  }

  // RLS scopes this UPDATE to the owner's rows only.
  const { data, error: updateError } = await supabase
    .from("dream_entries")
    .update({ is_starred: starred })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("Error updating star:", updateError);
    return NextResponse.json({ error: "Could not update star" }, { status: 500 });
  }

  if (!data) {
    // Not found OR not owned by this user (RLS hid it) — same response so
    // we don't leak existence of other users' dreams.
    return NextResponse.json({ error: "Dream not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, starred });
}
