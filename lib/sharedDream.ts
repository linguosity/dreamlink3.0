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

  if (scope === "full") {
    const decrypted = decryptDreamRow({
      original_text: null as string | null,
      original_text_enc: row.original_text_enc ?? null,
    });
    result.original_text = decrypted.original_text ?? null;
  }

  return result as unknown as SharedDream;
}
