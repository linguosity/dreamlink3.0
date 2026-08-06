// lib/sharedDream.ts
//
// Shared read path for publicly shared dreams. Used by BOTH:
//   - app/api/shared-dream/[token]/route.ts (public JSON API)
//   - app/shared/dream/[id]/page.tsx (server-rendered share page + OG metadata)
//
// Security model (unchanged from the original route):
// - Service-role client (bypasses RLS) so logged-out visitors can read, but
//   filtered strictly on `share_token = ? AND is_public = true` — only dreams
//   the owner opted to share, only via the unguessable token.
// - Hand-picked whitelist of columns. `original_text` only for 'full' scope.
//   Owner-only fields (user_id, encryption blobs, flags) are never returned.

import { getAdminClient } from "@/utils/supabase/admin";
import { decryptDreamRow } from "@/lib/crypto";

/** One matched verse, as rendered on the share page. `theme` is the short
 *  phrase the model matched it on — "crossing waters" (HANDOFF-v3.md §5
 *  item 2). Null for readings recorded before themes were persisted. */
export interface SharedCitation {
  reference: string;
  text: string | null;
  theme: string | null;
}

export interface SharedDream {
  scope: "summary" | "full";
  id: string;
  title: string | null;
  dream_summary: string | null;
  analysis_summary: string | null;
  formatted_analysis: string | null;
  personalized_summary: string | null;
  tags: string[] | null;
  bible_refs: string[] | null;
  image_url: string | null;
  created_at: string | null;
  original_text?: string | null;
  /** Resolved KJV citations with their themes. Safe to expose publicly: the
   *  verse text is public-domain scripture and `bible_refs` already listed
   *  the references. This is what makes the disclosure's "grounded in the
   *  verses below" a checkable claim on the one page strangers ever see —
   *  previously it pointed at verses the page did not render. */
  citations: SharedCitation[];
}

// Fields safe to expose on any shared link (summary scope).
const SUMMARY_FIELDS = [
  "id",
  "title",
  "dream_summary",
  "analysis_summary",
  "formatted_analysis",
  "personalized_summary",
  "tags",
  "bible_refs",
  "image_url",
  "created_at",
] as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fetches a publicly shared dream by its share token.
 * Returns null when the token is malformed, unknown, or sharing was revoked.
 * Throws only on unexpected DB errors.
 */
export async function getSharedDream(
  token: string,
): Promise<SharedDream | null> {
  if (!token || !UUID_RE.test(token)) return null;

  const admin = getAdminClient();

  // Pull the encrypted column too so we can conditionally decrypt it for
  // 'full' scope. It is stripped from the result below for 'summary'.
  // NOTE: literal select string (not built from SUMMARY_FIELDS) so the
  // Supabase typed-query parser can validate the columns.
  const { data, error } = await admin
    .from("dream_entries")
    .select(
      "id, title, dream_summary, analysis_summary, formatted_analysis, personalized_summary, tags, bible_refs, image_url, created_at, share_scope, original_text_enc",
    )
    .eq("share_token", token)
    .eq("is_public", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching shared dream:", error);
    throw new Error("Could not load shared dream");
  }
  if (!data) return null;

  const row = data as Record<string, unknown> & {
    share_scope?: string | null;
    original_text_enc?: string | null;
  };

  const scope: SharedDream["scope"] =
    row.share_scope === "full" ? "full" : "summary";

  const result: Record<string, unknown> = { scope };
  for (const f of SUMMARY_FIELDS) result[f] = row[f as keyof typeof row];

  // Matched verses, in the order the reading cites them. Fetched separately
  // rather than as a nested select so a citations failure degrades to "no
  // verses shown" instead of losing the whole shared dream.
  let citations: SharedCitation[] = [];
  const dreamId = row.id as string | undefined;
  if (dreamId) {
    const { data: citationRows, error: citationError } = await admin
      .from("bible_citations")
      .select("bible_book, chapter, verse, end_verse, full_text, citation_order, theme")
      .eq("dream_entry_id", dreamId)
      .order("citation_order", { ascending: true });

    if (citationError) {
      console.error("Error fetching shared dream citations:", citationError);
    } else {
      citations = (citationRows ?? []).map((c: any) => ({
        reference:
          `${c.bible_book ?? ""} ${c.chapter ?? ""}:${c.verse ?? ""}${
            c.end_verse && c.end_verse !== c.verse ? `-${c.end_verse}` : ""
          }`.trim(),
        text: c.full_text ?? null,
        theme: c.theme ?? null,
      }));
    }
  }
  result.citations = citations;

  if (scope === "full") {
    const decrypted = decryptDreamRow({
      original_text: null as string | null,
      original_text_enc: row.original_text_enc ?? null,
    });
    result.original_text = decrypted.original_text ?? null;
  }

  return result as unknown as SharedDream;
}
