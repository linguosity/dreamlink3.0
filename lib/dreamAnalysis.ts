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
  DreamAnalysisSchema,
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
        "system_message, main_instructions, format_instructions, forbidden_phrases, reading_level_radiant_clarity, reading_level_celestial_insight, reading_level_prophetic_wisdom, reading_level_divine_revelation",
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

function getDepthInstructions(depth: string): string {
  switch (depth) {
    case AnalysisDepth.DEEP:
      return `
DEPTH TIER: deep
- Provide 4 to 6 supporting points (instead of 1-3) — each grounded in a distinct biblical reference.
- After the supporting points, include a "Dream Symbols" section that unpacks 2-4 of the most resonant images in the dream (e.g., water, bridge, animal). For each symbol, give a one-sentence biblical/typological reading.
- Add a "How this might apply to your life right now" section with 2-3 concrete, gentle suggestions for the dreamer to consider.
- Total length: roughly 400-600 words across all sections.`;
    case AnalysisDepth.PROFOUND:
      return `
DEPTH TIER: profound
- Provide 5 to 7 supporting points — each ~30-50 words and grounded in a distinct biblical reference.
- Include a "Dream Symbols" section unpacking 3-5 resonant images. Each symbol is one sentence (~25 words) tied to scripture.
- Include a "Three Lenses on This Dream" section reading the dream through three frameworks; each lens is exactly 2 sentences (~40 words):
    * Literal lens — concrete situation this could rehearse, with a biblical precedent.
    * Allegorical lens — what the symbols represent in spiritual terms.
    * Prophetic lens — divine timing or invitation this might mark.
- Include 4-6 cross-reference verses for further study — book + chapter + verse only, NO exposition or commentary.
- Include a "For your prayer or journal" section with exactly 3 reflection questions, each one sentence (~20 words).
- Total budget: ~1000 words across all sections. Be substantive but disciplined — no filler, no restating the dream back to the dreamer.`;
    case AnalysisDepth.SHALLOW:
    default:
      return `
DEPTH TIER: shallow
- Keep the response concise: topic sentence + 1 to 3 supporting points + conclusion sentence.
- Total length: roughly 150-250 words.`;
  }
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

const FALLBACK_ANALYSIS: DreamAnalysis = {
  topicSentence: "Your dream contains spiritual symbolism.",
  supportingPoints: [
    "The imagery suggests a journey of faith (Psalm 23:4).",
    "The elements in your dream reflect divine guidance (Proverbs 3:5-6).",
    "There are signs of spiritual growth and renewal (2 Corinthians 5:17).",
  ],
  conclusionSentence:
    "Consider how these insights might apply to your current life circumstances.",
  analysis:
    "Your dream contains spiritual symbolism. The imagery suggests a journey of faith (Psalm 23:4). The elements in your dream reflect divine guidance (Proverbs 3:5-6). There are signs of spiritual growth and renewal (2 Corinthians 5:17). Consider how these insights might apply to your current life circumstances.",
  personalizedSummary:
    "Your dream reveals important spiritual insights for your journey.",
  dreamTitle: "Sacred Journey Vision",
  biblicalReferences: [
    {
      citation: "Psalm 23:4",
      book: "Psalm",
      chapter: 23,
      verse: 4,
      endVerse: null,
      verseText:
        "Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me.",
    },
    {
      citation: "Proverbs 3:5-6",
      book: "Proverbs",
      chapter: 3,
      verse: 5,
      endVerse: 6,
      verseText:
        "Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
    },
    {
      citation: "2 Corinthians 5:17",
      book: "2 Corinthians",
      chapter: 5,
      verse: 17,
      endVerse: null,
      verseText:
        "Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!",
    },
  ],
  tags: ["spiritual journey", "divine guidance", "faith", "transformation", "trust"],
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
    const depthInstructions = getDepthInstructions(effectiveDepth);

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

${readingLevelInstructions}
${depthInstructions}
`
      : `
You are a dream interpreter specializing in Christian biblical interpretation.

Analyze the following dream, connecting it to biblical themes, symbols, and scriptures:
"${dream}"

Format your analysis using this exact structure:
1. Start with a topic sentence that captures the main spiritual theme without using phrases like "This dream is about" or "Your dream is about". Instead, directly state what the dream reveals, represents, or contains.
2. Provide 1-3 supporting points based on what best explains the dream's meaning (not always exactly 3). Each point should include a direct Bible citation in parentheses.
3. End with a concluding sentence that provides guidance based on the dream's meaning.
4. Create a personalized summary that addresses the dreamer directly about their dream's significance using vivid language - just one compelling sentence.
5. Generate a clever, memorable title (3-6 words) that captures the essence of the dream and its spiritual meaning, making it easy for the dreamer to identify this dream later (e.g., "Walking on Sacred Waters", "The Golden Key Vision", "Angels in the Storm").
6. Generate 3-5 meaningful tags that capture the dream's key themes, symbols, emotions, or spiritual concepts (e.g., "transformation", "divine guidance", "fear", "water symbolism", "spiritual growth").

Additional instruction:
- Focus analysis on theme: ${topic || "general spiritual meaning"}
- Keep each supporting point brief but insightful
- Include biblical references (one per supporting point)
- NEVER start with ${forbiddenPhrases}
- Begin directly with the spiritual theme or insight without introductory phrases
- Ensure each supporting point has logical connection to the dream content
- Use parenthetical citations (Book Chapter:Verse)
- Make the concluding sentence actionable but gentle
- Personalize the one-sentence summary to speak directly to the dreamer about their spiritual journey
- Additionally, provide the full Bible verse text for each citation as shown in the example: Genesis 1:1 -> "In the beginning God created the heaven and the earth."

${readingLevelInstructions}
${depthInstructions}
`;

    const client = getOpenAIClient();

    const response = await client.responses.parse({
      model: OPENAI_MODEL,
      input: [
        { role: "system", content: systemMessage },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_output_tokens: getMaxOutputTokensForDepth(effectiveDepth),
      text: {
        format: zodTextFormat(DreamAnalysisSchema, "DreamAnalysis"),
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
