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

/** Trim, drop empties, and remove generic meta-tags (case-insensitive). */
export function sanitizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    if (typeof raw !== "string") continue;
    const t = raw.trim();
    const key = t.toLowerCase();
    if (!t || META_TAGS.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}
