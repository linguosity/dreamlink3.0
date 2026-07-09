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
  OPENAI_FALLBACK_MODELS,
  getDreamAnalysisSchemaForDepth,
  getDepthSpec,
  type DreamAnalysis,
  type BiblicalReference,
} from "@/lib/openai";
import { captureError } from "@/lib/sentry";
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
- tags must contain exactly 3 items.
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
- tags must contain exactly 2 items.
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

// ── Model fallback + length enforcement helpers ────────────────────

/** Per-attempt request timeout. Keeps a failed model from eating the whole
 *  Vercel budget before the next model in the chain gets a chance. */
const PER_ATTEMPT_TIMEOUT_MS = 45_000;

/** Retryable = the model/provider had a problem, not our request.
 *  4xx validation/schema errors must NOT fall through to another model —
 *  they'd fail identically and just double the spend. */
function isRetryableError(err: unknown): boolean {
  const anyErr = err as any;
  const status: unknown = anyErr?.status ?? anyErr?.response?.status;
  if (typeof status === "number") {
    return status === 408 || status === 429 || status >= 500;
  }
  // No HTTP status → connection error / timeout / abort.
  const name: string = anyErr?.constructor?.name ?? "";
  return (
    name.includes("APIConnection") ||
    name.includes("Timeout") ||
    anyErr?.name === "AbortError" ||
    anyErr?.code === "ETIMEDOUT" ||
    anyErr?.code === "ECONNRESET"
  );
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
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
 * Token usage from the OpenAI Responses API. Null on the fallback path
 * (network/parse errors) where no usable response was returned.
 */
export interface DreamAnalysisUsage {
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface DreamAnalysisResult {
  analysis: DreamAnalysis;
  usage: DreamAnalysisUsage;
}

/**
 * Run the OpenAI dream analysis. Safe to call concurrently — there is no
 * shared mutable state per call beyond the prompt cache (which is read-only
 * after first fetch).
 *
 * Always returns a DreamAnalysisResult; on error the analysis falls back to
 * FALLBACK_ANALYSIS and usage tokens are null (we never made a billable call,
 * or we couldn't read the usage block).
 */
export async function runDreamAnalysis(
  args: DreamAnalysisArgs,
): Promise<DreamAnalysisResult> {
  const { dream, topic, readingLevel, analysisDepth } = args;

  if (!dream) {
    return { analysis: FALLBACK_ANALYSIS, usage: { inputTokens: null, outputTokens: null } };
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
- Tags: each tag must name something CONCRETE from this specific dream — a symbol, place, action, emotion, or biblical motif actually present in the dream or analysis (e.g. 'flood waters', 'lost teeth', 'childhood home', 'wilderness season'). Lowercase noun phrases, 1-2 words. Never generic labels like 'faith', 'spirituality', 'dreams', 'spiritual journey', or 'divine guidance'.

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
6. Follow the depth tier instructions below for the exact number of tags. Each tag must name something CONCRETE from this specific dream — a symbol, place, action, emotion, or biblical motif that actually appears in the dream or your analysis (e.g. 'flood waters', 'lost teeth', 'childhood home', 'wilderness season'). Lowercase noun phrases, 1-2 words. Never generic labels like 'faith', 'spirituality', 'dreams', 'spiritual journey', or 'divine guidance' — if a tag could describe half of all dreams, replace it with one only this dream could carry.

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
    const spec = getDepthSpec(effectiveDepth);

    // Accumulates tokens across fallback attempts and the length-retry so
    // the admin cost footer reflects what was actually billed.
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let sawUsage = false;

    const callModel = async (model: string, extraInstruction?: string) => {
      const response = await client.responses.parse(
        {
          model,
          input: [
            { role: "system", content: systemMessage },
            {
              role: "user",
              content: extraInstruction
                ? `${userPrompt}\n\n${extraInstruction}`
                : userPrompt,
            },
          ],
          temperature: 0.7,
          max_output_tokens: spec.maxOutputTokens,
          text: {
            format: zodTextFormat(schemaForDepth, "DreamAnalysis"),
          },
        },
        // Per-attempt timeout + a single SDK-level retry. Without these the
        // SDK's default retry/backoff can eat the whole function budget
        // before the next model in the chain ever runs.
        { timeout: PER_ATTEMPT_TIMEOUT_MS, maxRetries: 1 },
      );
      if (response.usage) {
        sawUsage = true;
        totalInputTokens += response.usage.input_tokens ?? 0;
        totalOutputTokens += response.usage.output_tokens ?? 0;
      }
      return response;
    };

    // ── Model fallback chain ──────────────────────────────────────
    // Primary first, then each fallback, but only on retryable errors
    // (429/5xx/timeouts). Schema/validation errors propagate immediately.
    const modelChain = [
      OPENAI_MODEL,
      ...OPENAI_FALLBACK_MODELS.filter((m) => m !== OPENAI_MODEL),
    ];

    let response: Awaited<ReturnType<typeof callModel>> | null = null;
    let modelUsed = OPENAI_MODEL;
    let lastError: unknown = null;

    for (const model of modelChain) {
      try {
        response = await callModel(model);
        modelUsed = model;
        break;
      } catch (err) {
        lastError = err;
        if (!isRetryableError(err)) throw err;
        captureError(err, {
          tags: { area: "ai-pipeline", stage: "analysis", model },
          extra: { depth: effectiveDepth, fallbackAvailable: model !== modelChain[modelChain.length - 1] },
          level: "warning",
        });
        if (DEBUG) {
          console.warn(
            `runDreamAnalysis: model ${model} failed (retryable), trying next in chain`,
          );
        }
      }
    }

    if (!response) {
      // Entire chain failed with retryable errors.
      throw lastError ?? new Error("All models in fallback chain failed");
    }

    const usage: DreamAnalysisUsage = {
      inputTokens: sawUsage ? totalInputTokens : null,
      outputTokens: sawUsage ? totalOutputTokens : null,
    };

    let parsed = response.output_parsed;
    if (!parsed) {
      captureError(new Error("null parsed output"), {
        tags: { area: "ai-pipeline", stage: "parse", model: modelUsed },
        extra: { depth: effectiveDepth, status: response.status },
      });
      // Tokens may still have been billed even though parsing failed — preserve
      // the usage block so the admin footer doesn't undercount cost.
      return { analysis: FALLBACK_ANALYSIS, usage };
    }

    // ── Length enforcement (single corrective retry) ──────────────
    // max_output_tokens only caps length; it can't force a minimum, and
    // mini-tier models routinely undershoot the prose targets. If the
    // analysis lands below ~75% of the tier's floor, retry once on the
    // model that succeeded, with an explicit word-count correction.
    const words = countWords(parsed.analysis);
    if (words < Math.floor(spec.minWords * 0.75)) {
      if (DEBUG) {
        console.log(
          `runDreamAnalysis depth=${effectiveDepth}: analysis is ${words} words (target ${spec.minWords}-${spec.maxWords}), retrying with length correction`,
        );
      }
      try {
        const retry = await callModel(
          modelUsed,
          `IMPORTANT LENGTH CORRECTION: A previous draft of this analysis was only ${words} words. The "analysis" field MUST be between ${spec.minWords} and ${spec.maxWords} words. Expand each supporting point to ${spec.pointMinWords}-${spec.pointMaxWords} words and fully develop every section required by the depth tier. Count words as you write.`,
        );
        const retryParsed = retry.output_parsed;
        if (
          retryParsed &&
          countWords(retryParsed.analysis) > words
        ) {
          parsed = retryParsed;
        }
      } catch (err) {
        // Length retry is best-effort — keep the short-but-valid result.
        captureError(err, {
          tags: { area: "ai-pipeline", stage: "length-retry", model: modelUsed },
          extra: { depth: effectiveDepth, firstDraftWords: words },
          level: "warning",
        });
      }
    }

    if (DEBUG) {
      console.log(
        `runDreamAnalysis depth=${effectiveDepth}: model=${modelUsed} words=${countWords(parsed.analysis)} tokens=${totalInputTokens}/${totalOutputTokens}`,
      );
    }

    return {
      analysis: parsed,
      usage: {
        inputTokens: sawUsage ? totalInputTokens : null,
        outputTokens: sawUsage ? totalOutputTokens : null,
      },
    };
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      console.error(
        `runDreamAnalysis depth=${analysisDepth}: JSON parse error — likely truncation. Bump the tier's maxOutputTokens in DEPTH_SPECS.`,
        error,
      );
    } else {
      console.error(`runDreamAnalysis depth=${analysisDepth}: error`, error);
    }
    captureError(error, {
      tags: { area: "ai-pipeline", stage: "analysis" },
      extra: { depth: analysisDepth ?? "unknown" },
    });
    return { analysis: FALLBACK_ANALYSIS, usage: { inputTokens: null, outputTokens: null } };
  }
}

export { FALLBACK_ANALYSIS };
export type { BiblicalReference };
