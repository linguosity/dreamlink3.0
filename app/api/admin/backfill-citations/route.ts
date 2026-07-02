// app/api/admin/backfill-citations/route.ts
//
// Admin-only, one-time backfill: dreams created before the citation-hydration
// refactor have `bible_refs` strings but no `bible_citations` rows, so their
// dialogs show "Verse text not available". This re-hydrates those refs against
// the canonical KJV (lib/bibleLookup — pure local lookup, no AI cost) and
// inserts the missing rows.
//
// Call repeatedly (processes up to 100 dreams per request) until
// `remaining: 0`:
//   fetch('/api/admin/backfill-citations', { method: 'POST' })
//     .then(r => r.json()).then(console.log)

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { lookupVerse } from "@/lib/bibleLookup";

const BATCH_SIZE = 100;

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

  const admin = getAdminClient();

  // Dreams that have refs to hydrate.
  const { data: dreams, error: dreamsError } = await admin
    .from("dream_entries")
    .select("id, bible_refs")
    .not("bible_refs", "is", null)
    .order("created_at", { ascending: false });

  if (dreamsError) {
    return NextResponse.json({ error: dreamsError.message }, { status: 500 });
  }

  const withRefs = (dreams ?? []).filter(
    (d: any) => Array.isArray(d.bible_refs) && d.bible_refs.length > 0,
  );

  // Dreams that already have citation rows.
  const { data: cited, error: citedError } = await admin
    .from("bible_citations")
    .select("dream_entry_id");

  if (citedError) {
    return NextResponse.json({ error: citedError.message }, { status: 500 });
  }

  const citedIds = new Set((cited ?? []).map((c: any) => c.dream_entry_id));
  const missing = withRefs.filter((d: any) => !citedIds.has(d.id));
  const batch = missing.slice(0, BATCH_SIZE);

  let dreamsHydrated = 0;
  let citationsInserted = 0;
  const unresolved: Array<{ dreamId: string; refs: string[] }> = [];

  for (const dream of batch) {
    const refs: string[] = (dream as any).bible_refs;
    const rows = refs
      .map((ref, index) => ({ lookup: lookupVerse(ref), index }))
      .filter(({ lookup }) => lookup.status !== "not_found")
      .map(({ lookup, index }) => ({
        dream_entry_id: (dream as any).id,
        bible_book: lookup.book,
        chapter: lookup.chapter,
        verse: lookup.verse,
        end_verse: lookup.endVerse,
        full_text: lookup.text,
        citation_order: index + 1,
      }));

    const misses = refs.length - rows.length;
    if (misses > 0) {
      unresolved.push({
        dreamId: (dream as any).id,
        refs: refs.filter((r) => lookupVerse(r).status === "not_found"),
      });
    }

    if (rows.length > 0) {
      const { error: insertError } = await admin
        .from("bible_citations")
        .insert(rows as never);
      if (insertError) {
        console.error(
          `backfill-citations: insert failed for dream ${(dream as any).id}:`,
          insertError.message,
        );
        continue;
      }
      dreamsHydrated++;
      citationsInserted += rows.length;
    }
  }

  return NextResponse.json({
    dreamsWithRefs: withRefs.length,
    dreamsAlreadyCited: withRefs.length - missing.length,
    processed: batch.length,
    dreamsHydrated,
    citationsInserted,
    unresolved, // hallucinated/unparseable citations — kept in bible_refs only
    remaining: Math.max(0, missing.length - batch.length),
  });
}
