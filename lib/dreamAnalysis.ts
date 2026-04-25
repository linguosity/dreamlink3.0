// lib/dreamAnalysis.ts
//
// Shared dream-analysis function extracted from app/api/openai-analysis/route.ts.
// Both that route handler and the matrix flow in dream-entries/route.ts call this
// directly. Going through `openAiHandler(new NextRequest(...))` for parallel
// fan-out caused output corruption (multiple concurrent invocations interleaved
// somewhere — likely Next.js's request lifecycle around synthetic NextRequests),
// so the import is now plumbed as a plain async function with no Request/Response
// glue.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { zodTextFormat } from "openai/helpers/zod";
import {
  getOpenAIClient,
  OPENAI_MODEL,
  getDreamAnalysisSchemaForDepth,
  type DreamAnalysis,
  type BiblicalReference,
} from "@/lib/openai";
import { ReadingLevel, AnalysisDepth } from "@/schema/profile";

const DEBUG = process.env.NODE_ENV === "development";

// ── Prompt cache (in-memory, 5-min TTL) ────────────────────────────
interface PromptData {
  system_message: string;
  main_instructions: string;
  format_instructions: string;
  forbidden_phrases: string[];
  reading_level_radiant_clarity: string;
  reading_level_celestial_insight: string;
  reading_level_prophetic_wisdom: string;
  reading_level_divine_revelation: string;
  // Tier-specific instructions (added in citation-hydration refactor).
  // Optional on the type because legacy rows pre-date the column.
  depth_shallow: string | null;
  depth_deep: string | null;
  depth_profound: string | null;
}

interface CachedPrompt {
  data: PromptData;
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let promptCache: CachedPrompt | null = null;

async function getActivePrompt(): Promise<PromptData | null> {
  if (promptCache && Date.now() - promptCache.fetchedAt < CACHE_TTL_MS) {
    return promptCache.data;
  }

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;

    const supabase = createSupabaseClient(url, key);
    const { data, error } = await supabase
      .from("dream_prompts")
      .select(
        "system_message, main_instructions, format_instructions, forbidden_phrases, reading_level_radiant_clarity, reading_level_celestial_insight, reading_level_prophetic_wisdom, reading_level_divine_revelation, depth_shallow, depth_deep, depth_profound",
      )
      .eq("is_active", true)
      .single();

    if (error || !data) return null;

    promptCache = { data: data as PromptData, fetchedAt: Date.now() };
    return data as PromptData;
  } catch (err) {
    console.error("Failed to fetch dream prompt from DB:", err);
    return null;
  }
}

// ── Reading level helpers ──────────────────────────────────────────

function getFallbackReadingLevelInstructions(readingLevel: string): string {
  switch (readingLevel) {
    case ReadingLevel.RADIANT_CLARITY:
      return `
- Use simple, clear language suitable for a young reader (3rd grade level)
- Use short sentences with basic vocabulary
- Explain biblical concepts in simple terms
- Use everyday examples to illustrate spiritual concepts
- Avoid complex theological terms`;
    case ReadingLevel.CELESTIAL_INSIGHT:
      return `
- Use moderately sophisticated language (8th grade level)
- Balance clarity with some spiritual terminology
- Include some nuance in biblical interpretations
- Use moderately complex sentence structures
- Explain most theological concepts briefly`;
    case ReadingLevel.PROPHETIC_WISDOM:
      return `
- Use advanced vocabulary and mature phrasing (12th grade level)
- Include deeper theological insights and nuanced interpretation
- Use varied sentence structures with proper flow
- Reference biblical concepts with sophistication
- Assume familiarity with common biblical themes`;
    case ReadingLevel.DIVINE_REVELATION:
      return `
- Use scholarly theological language and advanced biblical terminology
- Provide deep exegetical insights into dream symbolism
- Reference biblical hermeneutics and interpretive frameworks
- Include nuanced spiritual insights with theological precision
- Use sophisticated language suitable for seminary-educated readers`;
    default:
      return `
- Use moderately sophisticated language (8th grade level)
- Balance clarity with some spiritual terminology
- Include some nuance in biblical interpretations
- Use moderately complex sentence structures
- Explain most theological concepts briefly`;
  }
}

function getReadingLevelInstructions(
  readingLevel: string,
  dbPrompt: PromptData | null,
): string {
  if (dbPrompt) {
    switch (readingLevel) {
      case ReadingLevel.RADIANT_CLARITY:
        return dbPrompt.reading_level_radiant_clarity;
      case ReadingLevel.CELESTIAL_INSIGHT:
        return dbPrompt.reading_level_celestial_insight;
      case ReadingLevel.PROPHETIC_WISDOM:
        return dbPrompt.reading_level_prophetic_wisdom;
      case ReadingLevel.DIVINE_REVELATION:
        return dbPrompt.reading_level_divine_revelation;
      default:
        return dbPrompt.reading_level_celestial_insight;
    }
  }
  return getFallbackReadingLevelInstructions(readingLevel);
}

// ── Analysis depth helpers ─────────────────────────────────────────

function getFallbackDepthInstructions(depth: string): string {
  switch (depth) {
    case AnalysisDepth.DEEP:
      return `
DEPTH TIER: deep
- supportingPoints must contain exactly 3 items.
- biblicalReferences must contain exactly 3 items, one per supportingPoint, in the same order.
- tags must contain exactly 3 items.
- Provide a fuller but still focused interpretation. Aim for ~400-600 words across the analysis prose.
- After the supporting points (within the analysis prose), you may include a "Dream Symbols" section unpacking 2-4 of the most resonant images, and a "How this might apply to your life right now" section with 2-3 gentle suggestions.`;
    case AnalysisDepth.PROFOUND:
      return `
DEPTH TIER: profound
- supportingPoints must contain exactly 4 items, each ~30-50 words.
- biblicalReferences must contain exactly 4 items, one per supportingPoint, in the same order.
- tags must contain exactly 5 items.
- Aim for ~800-1100 words across the analysis prose. Within the analysis you may include:
    * A "Dream Symbols" section unpacking 3-5 resonant images — one sentence each, tied to scripture.
    * A "Three Lenses on This Dream" section reading the dream through Literal, Allegorical, and Prophetic lenses (~2 sentences each).
    * A "For your prayer or journal" section with exactly 3 reflection questions.
- Be substantive but disciplined — no filler, no restating the dream back to the dreamer.`;
    case AnalysisDepth.SHALLOW:
    default:
      return `
DEPTH TIER: shallow
- supportingPoints must contain exactly 2 items.
- biblicalReferences must contain exactly 2 items, one per supportingPoint, in the same order.
- tags must contain exactly 3 items.
- Keep the analysis prose concise: ~150-250 words covering topic, supporting points, and conclusion.`;
  }
}

function getDepthInstructions(
  depth: string,
  dbPrompt: PromptData | null,
): string {
  if (dbPrompt) {
    switch (depth) {
      case AnalysisDepth.SHALLOW:
        if (dbPrompt.depth_shallow) return dbPrompt.depth_shallow;
        break;
      case AnalysisDepth.DEEP:
        if (dbPrompt.depth_deep) return dbPrompt.depth_deep;
        break;
      case AnalysisDepth.PROFOUND:
        if (dbPrompt.depth_profound) return dbPrompt.depth_profound;
        break;
    }
  }
  return getFallbackDepthInstructions(depth);
}

function getMaxOutputTokensForDepth(depth: string): number {
  switch (depth) {
    case AnalysisDepth.PROFOUND:
      return 8000;
    case AnalysisDepth.DEEP:
      return 4500;
    case AnalysisDepth.SHALLOW:
    default:
      return 2000;
  }
}

// ── Fallback response ──────────────────────────────────────────────

// Citation-only fallback. Verse text is hydrated downstream via lib/bibleLookup
// in the dream-entries route, so this object only needs to satisfy the post-
// refactor schema: { citation: string }. Server-side hydration fills in the
// canonical book/chapter/verse/text.
const FALLBACK_ANALYSIS: DreamAnalysis = {
  topicSentence: "Your dream contains spiritual symbolism.",
  supportingPoints: [
    "The imagery suggests a journey of faith (Psalms 23:4).",
    "The elements in your dream reflect divine guidance (Proverbs 3:5-6).",
    "There are signs of spiritual growth and renewal (2 Corinthians 5:17).",
  ],
  conclusionSentence:
    "Consider how these insights might apply to your current life circumstances.",
  analysis:
    "Your dream contains spiritual symbolism. The imagery suggests a journey of faith (Psalms 23:4). The elements in your dream reflect divine guidance (Proverbs 3:5-6). There are signs of spiritual growth and renewal (2 Corinthians 5:17). Consider how these insights might apply to your current life circumstances.",
  personalizedSummary:
    "Your dream reveals important spiritual insights for your journey.",
  dreamTitle: "Sacred Journey Vision",
  biblicalReferences: [
    { citation: "Psalms 23:4" },
    { citation: "Proverbs 3:5-6" },
    { citation: "2 Corinthians 5:17" },
  ],
  tags: ["spiritual journey", "divine guidance", "faith"],
};

// ── Public entry point ─────────────────────────────────────────────

export interface DreamAnalysisArgs {
  dream: string;
  topic?: string;
  readingLevel?: string;
  analysisDepth?: string;
}

/**
 * Run the OpenAI dream analysis. Safe to call concurrently — there is no
 * shared mutable state per call beyond the prompt cache (which is read-only
 * after first fetch).
 *
 * Always returns a DreamAnalysis; on error returns FALLBACK_ANALYSIS.
 */
export async function runDreamAnalysis(
  args: DreamAnalysisArgs,
): Promise<DreamAnalysis> {
  const { dream, topic, readingLevel, analysisDepth } = args;

  if (!dream) {
    return FALLBACK_ANALYSIS;
  }

  if (DEBUG) {
    console.log(
      `runDreamAnalysis: depth=${analysisDepth ?? AnalysisDepth.SHALLOW} level=${readingLevel ?? ReadingLevel.CELESTIAL_INSIGHT} dreamLen=${dream.length}`,
    );
  }

  try {
    const dbPrompt = await getActivePrompt();

    const effectiveReadingLevel = readingLevel || ReadingLevel.CELESTIAL_INSIGHT;
    const readingLevelInstructions = getReadingLevelInstructions(
      effectiveReadingLevel,
      dbPrompt,
    );

    const effectiveDepth = analysisDepth || AnalysisDepth.SHALLOW;
    const depthInstructions = getDepthInstructions(effectiveDepth, dbPrompt);

    const forbiddenPhrases = dbPrompt?.forbidden_phrases?.length
      ? dbPrompt.forbidden_phrases.map((p) => `"${p}"`).join(", ")
      : '"This dream is about", "Your dream is about", "This dream symbolizes", "This dream represents"';

    const systemMessage =
      dbPrompt?.system_message ||
      "You are a biblical dream interpreter who provides concise analysis with scripture references.";

    const userPrompt = dbPrompt
      ? `${dbPrompt.main_instructions}

Analyze the following dream:
"${dream}"

${dbPrompt.format_instructions}

- Focus analysis on theme: ${topic || "general spiritual meaning"}
- NEVER start with ${forbiddenPhrases}
- Begin directly with the spiritual theme or insight without introductory phrases
- For each supporting point, include exactly one Bible citation in the supportingPoints prose (e.g., "(Genesis 1:1)" or "(1 Peter 5:8)"). Use full canonical book names — '1 Peter', not 'Peter'; 'Psalms', not 'Psalm'.
- The biblicalReferences array must contain one entry per supporting point, in the same order. Provide the citation only — do not include verse text. The application retrieves verse text from a canonical KJV source.

${readingLevelInstructions}
${depthInstructions}
`
      : `
You are a dream interpreter specializing in Christian biblical interpretation.

Analyze the following dream, connecting it to biblical themes, symbols, and scriptures:
"${dream}"

Format your analysis using this exact structure:
1. Start with a topic sentence that captures the main spiritual theme without using phrases like "This dream is about" or "Your dream is about". Instead, directly state what the dream reveals, represents, or contains.
2. Follow the depth tier instructions below for the exact number of supporting points. Each point includes a direct Bible citation in parentheses.
3. End with a concluding sentence that provides guidance based on the dream's meaning.
4. Create a personalized summary that addresses the dreamer directly about their dream's significance using vivid language - just one compelling sentence.
5. Generate a clever, memorable title (3-6 words) that captures the essence of the dream and its spiritual meaning, making it easy for the dreamer to identify this dream later (e.g., "Walking on Sacred Waters", "The Golden Key Vision", "Angels in the Storm").
6. Follow the depth tier instructions below for the exact number of tags.

Additional instruction:
- Focus analysis on theme: ${topic || "general spiritual meaning"}
- Keep each supporting point brief but insightful
- NEVER start with ${forbiddenPhrases}
- Begin directly with the spiritual theme or insight without introductory phrases
- Ensure each supporting point has logical connection to the dream content
- Use parenthetical citations (Book Chapter:Verse) with full canonical book names — '1 Peter', not 'Peter'; 'Psalms', not 'Psalm'.
- Make the concluding sentence actionable but gentle
- Personalize the one-sentence summary to speak directly to the dreamer about their spiritual journey
- The biblicalReferences array must contain one entry per supporting point, in the same order. Provide only the citation string — do not include verse text. The application retrieves verse text from a canonical KJV source.

${readingLevelInstructions}
${depthInstructions}
`;

    const client = getOpenAIClient();
    const schemaForDepth = getDreamAnalysisSchemaForDepth(effectiveDepth);

    const response = await client.responses.parse({
      model: OPENAI_MODEL,
      input: [
        { role: "system", content: systemMessage },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_output_tokens: getMaxOutputTokensForDepth(effectiveDepth),
      text: {
        format: zodTextFormat(schemaForDepth, "DreamAnalysis"),
      },
    });

    if (DEBUG) {
      console.log(
        `runDreamAnalysis depth=${effectiveDepth}: status=${response.status} tokens=${response.usage?.input_tokens}/${response.usage?.output_tokens}`,
      );
    }

    const parsed = response.output_parsed;
    if (!parsed) {
      console.error(
        `runDreamAnalysis depth=${effectiveDepth}: null parsed output, status=${response.status}`,
      );
      return FALLBACK_ANALYSIS;
    }

    return parsed;
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      console.error(
        `runDreamAnalysis depth=${analysisDepth}: JSON parse error — likely truncation. Bump getMaxOutputTokensForDepth().`,
        error,
      );
    } else {
      console.error(`runDreamAnalysis depth=${analysisDepth}: error`, error);
    }
    return FALLBACK_ANALYSIS;
  }
}

export { FALLBACK_ANALYSIS };
export type { BiblicalReference };
