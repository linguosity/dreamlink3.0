// lib/blogCoverScene.ts
//
// Turns an article into a single concrete visual scene, which is the half of
// the cover prompt that carries relevance (schema/blogCover.ts holds the half
// that carries consistency).
//
// Why this needs a model call at all, rather than just reusing the title:
//
//   utils/imageGeneration.ts already learned this on the dream path — its
//   comment reads "Title alone is too generic — the summary carries the actual
//   dream details." Article titles are worse. "What Scripture Says About
//   Recurring Dreams" contains no image; hand it to FLUX and you get a
//   generic Bible-on-a-table, and so does the next article, and the one after
//   that. The failure mode is not ugly covers, it is twenty near-identical
//   ones — consistency of exactly the wrong kind.
//
//   Truncating the body instead does not work either, because the opening
//   paragraph of an essay is usually argument, not imagery. What is needed is
//   a small act of translation: grief and Psalm 23 becomes a lone figure on a
//   valley path at first light. That is a language task, and a cheap one.

import { getOpenAIClient, OPENAI_MODEL, modelTuning } from "@/lib/openai";
import { FALLBACK_SCENE, MAX_SCENE_CHARS, truncateScene } from "@/schema/blogCover";

/**
 * How much of the article the model reads.
 *
 * Generous enough to get past the introduction — where the actual imagery
 * usually lives — but bounded so a long post cannot turn a cover refresh into
 * an expensive call. At ~6k characters this costs a fraction of a cent.
 */
const MAX_CONTENT_CHARS = 6000;

const SYSTEM_PROMPT = `You write one-sentence visual scenes for article cover illustrations.

Given an article, reply with a single sentence describing ONE concrete, physical scene that evokes the article's theme.

Rules:
- Concrete nouns only. Things that can be photographed or painted: objects, landscapes, weather, a human figure seen at a distance.
- Never state the topic. "A lone figure on a narrow valley path at first light" — not "a scene about grief".
- No text, letters, signs, books with legible titles, or anything that invites written words into the image.
- No named or recognisable real people, no logos, no brands.
- No camera or style language (no "cinematic", "35mm", "oil painting"). House style is applied separately; adding your own fights it.
- One sentence, under ${MAX_SCENE_CHARS} characters, no trailing period needed.

Reply with the sentence only. No preamble, no quotes, no explanation.`;

export interface CoverSceneInput {
  title: string;
  excerpt?: string | null;
  contentMd?: string | null;
}

/**
 * Strips the markdown that would otherwise burn tokens or mislead the model.
 *
 * Image and link URLs in particular are noise that occasionally leaks into the
 * output as scene detail, and code fences are never the subject of a cover.
 */
function toPlainish(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_>`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Returns a visual scene sentence for an article.
 *
 * Never throws: a cover is a nice-to-have, and a failed model call should not
 * be able to block saving or importing a post. On any failure this returns
 * FALLBACK_SCENE, which still produces a usable on-brand image — just a
 * generic one — and the caller can regenerate later.
 */
export async function extractCoverScene(
  input: CoverSceneInput,
): Promise<{ scene: string; fallback: boolean }> {
  const title = input.title?.trim();
  if (!title) return { scene: FALLBACK_SCENE, fallback: true };

  const body = input.contentMd ? toPlainish(input.contentMd) : "";
  const article = [
    `Title: ${title}`,
    input.excerpt?.trim() ? `Excerpt: ${input.excerpt.trim()}` : null,
    body ? `Article: ${body.slice(0, MAX_CONTENT_CHARS)}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: article },
      ],
      // Higher than the analysis path: two articles on adjacent themes should
      // not converge on the same scene, and there is no correctness to lose.
      ...modelTuning(OPENAI_MODEL, 0.9),
      max_completion_tokens: 120,
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    // Models occasionally wrap the sentence in quotes despite being asked not
    // to, and that punctuation would survive into the image prompt.
    const cleaned = raw.trim().replace(/^["'“”]+|["'“”]+$/g, "").trim();

    if (!cleaned) return { scene: FALLBACK_SCENE, fallback: true };
    return { scene: truncateScene(cleaned), fallback: false };
  } catch (error) {
    console.error("Cover scene extraction failed, using fallback:", error);
    return { scene: FALLBACK_SCENE, fallback: true };
  }
}
