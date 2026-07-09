import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { decryptDreamRow } from "@/lib/crypto";
import { captureError } from "@/lib/sentry";

/**
 * GET /api/account/export
 *
 * Authenticated data export: returns a JSON attachment containing the user's
 * profile, dreams (analysis fields live on the dream row), and Bible
 * citations (nested per dream). Encrypted dream fields are decrypted
 * server-side via decryptDreamRow, which also strips the *_enc columns.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin client with explicit user filters: consistent results regardless
    // of RLS policy drift, and bible_citations has no direct user_id column.
    const admin = getAdminClient();

    const [profileResult, dreamsResult] = await Promise.all([
      admin.from("profile").select("*").eq("user_id", user.id).maybeSingle(),
      admin
        .from("dream_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ]);

    if (dreamsResult.error) {
      captureError(
        new Error(`account-export: dreams query failed: ${dreamsResult.error.message}`),
        { tags: { area: "account-export" }, extra: { userId: user.id } },
      );
      return NextResponse.json(
        { error: "Could not load your dreams. Please try again." },
        { status: 500 },
      );
    }
    if (profileResult.error) {
      captureError(
        new Error(`account-export: profile query failed: ${profileResult.error.message}`),
        { tags: { area: "account-export" }, extra: { userId: user.id } },
      );
      return NextResponse.json(
        { error: "Could not load your profile. Please try again." },
        { status: 500 },
      );
    }

    const dreams = dreamsResult.data ?? [];
    const dreamIds = dreams.map((d) => d.id);

    // Citations are keyed by dream_entry_id; chunk the IN() filter so a large
    // journal doesn't blow past URL length limits.
    const citations: Record<string, unknown>[] = [];
    const CHUNK = 100;
    for (let i = 0; i < dreamIds.length; i += CHUNK) {
      const chunk = dreamIds.slice(i, i + CHUNK);
      const { data, error } = await admin
        .from("bible_citations")
        .select("*")
        .in("dream_entry_id", chunk)
        .order("citation_order", { ascending: true });
      if (error) {
        captureError(
          new Error(`account-export: citations query failed: ${error.message}`),
          { tags: { area: "account-export" }, extra: { userId: user.id } },
        );
        return NextResponse.json(
          { error: "Could not load your citations. Please try again." },
          { status: 500 },
        );
      }
      citations.push(...((data ?? []) as Record<string, unknown>[]));
    }

    const citationsByDream = new Map<string, Record<string, unknown>[]>();
    for (const citation of citations) {
      const key = String(citation.dream_entry_id);
      const list = citationsByDream.get(key) ?? [];
      list.push(citation);
      citationsByDream.set(key, list);
    }

    const exportDreams = dreams.map((row) => {
      // decryptDreamRow populates original_text / raw_analysis from the *_enc
      // columns and deletes the *_enc keys. Per-field failures degrade to null
      // (already logged inside the helper) rather than failing the export.
      const decrypted = decryptDreamRow({ ...row }) as Record<string, unknown>;
      delete decrypted.search_vector; // internal tsvector, noise in an export
      delete decrypted.original_text_enc; // belt & braces — helper strips these
      delete decrypted.raw_analysis_enc;
      return {
        ...decrypted,
        citations: citationsByDream.get(String(row.id)) ?? [],
      };
    });

    const payload = {
      export_version: 1,
      app: "DreamRiver",
      exported_at: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email ?? null,
        created_at: user.created_at ?? null,
      },
      profile: profileResult.data ?? null,
      dreams: exportDreams,
      counts: {
        dreams: exportDreams.length,
        citations: citations.length,
      },
    };

    const filename = `dreamriver-export-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Account export error:", error);
    captureError(error, { tags: { area: "account-export" } });
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
