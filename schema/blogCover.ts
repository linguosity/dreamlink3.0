// schema/blogCover.ts
//
// The house style for generated article covers.
//
// This deliberately mirrors the shape that makes dream images work
// (utils/imageGeneration.ts): a prompt is `${subject}. ${scene} ${annotation}`,
// where the subject varies per item and everything after it never does. The
// varying half buys relevance; the fixed half buys consistency.
//
// The difference from dreams is that there is exactly ONE preset here, not a
// tier-gated set the reader picks from. A dream image belongs to the dreamer,
// so choice is the point. An article cover belongs to the publication, so
// choice is the problem — twenty posts each in a different medium read as
// twenty stock images rather than one magazine.

export interface CoverStyle {
  /** Setting, palette and lighting prose that follows the subject. */
  scene: string;
  /** Style + mood annotation appended at the end. */
  styleAnnotation: string;
}

/**
 * Chosen to sit beside the dream aesthetics rather than compete with them:
 * the same warm, reverent register readers already associate with DreamRiver,
 * but flatter and more editorial so it reads as an illustration heading an
 * article rather than as somebody's dream.
 */
export const BLOG_COVER_STYLE: CoverStyle = {
  scene:
    "Wide editorial composition with generous negative space and a clear focal point " +
    "left of centre. Soft directional dawn light, long gentle shadows. Muted palette " +
    "of deep indigo, warm sand, and pale gold.",
  styleAnnotation:
    "Style: Contemporary editorial illustration, matte finish, subtle paper grain, " +
    "restrained detail. Mood: Contemplative, spacious, quietly hopeful.",
};

/**
 * FLUX renders lettering when a prompt implies it, and article covers are
 * exactly the case that invites it — a prompt derived from a headline will
 * happily produce a book spine or a sign carrying garbled pseudo-English.
 * Stating the exclusion in prose works better than a keyword list here,
 * because the model is following prose everywhere else in the prompt.
 */
const NO_TEXT_CLAUSE =
  "Contains no text, letters, numerals, captions, signage, or written words of any kind.";

/**
 * Length cap on the scene sentence.
 *
 * The dream path truncates its summary to ~120 characters for the same reason:
 * a long subject crowds out the style annotation, and the annotation is the
 * only thing making separate images look related. 220 gives an article scene
 * more room than a dream summary needs — articles are more abstract, so the
 * scene has to work harder — while still leaving the style clause dominant.
 */
export const MAX_SCENE_CHARS = 220;

/** Used when scene extraction fails or returns nothing usable. */
export const FALLBACK_SCENE =
  "An open book resting on a windowsill beside a still glass of water, dawn light " +
  "crossing the page";

export function truncateScene(scene: string): string {
  const trimmed = scene.trim().replace(/[.!?]+$/, "");
  if (trimmed.length <= MAX_SCENE_CHARS) return trimmed;
  // Cut at a word boundary so the prompt never ends mid-word.
  return trimmed.slice(0, MAX_SCENE_CHARS).replace(/\s+\S*$/, "");
}

/**
 * Assembles the final FLUX prompt from a per-article visual scene.
 *
 * Order follows BFL's guide and the dream builder: subject leads, then
 * setting/lighting, then style/mood. See docs/flux-prompting-guide.md.
 */
export function buildBlogCoverPrompt(scene: string): string {
  const subject = truncateScene(scene) || FALLBACK_SCENE;
  return `${subject}. ${BLOG_COVER_STYLE.scene} ${BLOG_COVER_STYLE.styleAnnotation} ${NO_TEXT_CLAUSE}`;
}

/**
 * Deterministic seed derived from the post slug (FNV-1a, 32-bit).
 *
 * Without a seed, regenerating a cover returns a different image every time,
 * so an accidental re-run silently reshuffles art on already-published posts.
 * Keying on the slug means the same article plus the same prompt yields the
 * same picture, while genuinely editing the article — which changes the
 * extracted scene — still produces something new.
 */
export function seedFromSlug(slug: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    hash ^= slug.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // BFL wants a non-negative 32-bit integer.
  return hash >>> 0;
}
