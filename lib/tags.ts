// lib/tags.ts
//
// Tag hygiene for dream analyses. Tags should describe the *content* of a
// dream — its symbols, emotions, and themes (e.g. "water symbolism", "fear",
// "divine guidance", "transformation") — never meta-labels about the product
// or the act of interpretation (e.g. "dream interpretation", "dream
// analysis"). The AI occasionally emits those meta-tags; this strips them as a
// guarantee, on top of the prompt guidance.

const META_TAGS = new Set([
  "dream interpretation",
  "dream analysis",
  "dream meaning",
  "dream",
  "dreams",
  "interpretation",
  "analysis",
  "spiritual insight",
  "biblical interpretation",
  "bible interpretation",
  "dream journal",
]);

// Characters models have actually used to cram several tags into one string.
// Observed in production: "progressive revelation process」「divine patience
// symbol」「humble discernment" — CJK corner brackets, three tags in one row.
const TAG_SPLIT_RE = /[」「|;/•·]+|,\s*/g;

/** Words in a tag before we treat it as a phrase rather than a label. */
const MAX_TAG_WORDS = 4;

/**
 * Trim, split accidental multi-tags, case-normalize, drop empties, and remove
 * generic meta-tags.
 *
 * Case normalization matters more than it looks: the previous version
 * lowercased only for the dedupe *key* and stored the original casing, so
 * "divine calling" (x18) and "Divine Calling" (x7) both persisted as distinct
 * tags. Any symbol index or "recurring themes" view double-counts them, which
 * defeats the point of the 2026-07-08 concrete-tags decision. Lowercase is the
 * stored form; presentation can capitalize in CSS.
 */
export function sanitizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    if (typeof raw !== "string") continue;
    for (const piece of raw.split(TAG_SPLIT_RE)) {
      const t = piece
        // zero-width / BOM, same family lib/bibleLookup.ts strips from citations
        .replace(/[​-‍﻿⁠­]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
        .toLowerCase();
      if (!t || META_TAGS.has(t) || seen.has(t)) continue;
      // Runaway concatenations like "grief and remembrance nourishment
      // provision renewal light" are not tags; drop rather than store noise
      // that can never recur and so can never form a pattern.
      if (t.split(" ").length > MAX_TAG_WORDS) continue;
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}
