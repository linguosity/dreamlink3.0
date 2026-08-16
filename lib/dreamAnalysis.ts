// lib/dreamAnalysis.ts
//
// Shared dream-analysis function, originally extracted from the
// /api/openai-analysis route handler (deleted — it had no callers left, and
// its `runtime = "edge"` could not have completed a deep or profound analysis
// anyway). The matrix flow in dream-entries/route.ts calls this directly.
// Going through `openAiHandler(new NextRequest(...))` for parallel fan-out
// caused output corruption (multiple concurrent invocations interleaved
// somewhere — likely Next.js's request lifecycle around synthetic NextRequests),
// so the import is now plumbed as a plain async function with no Request/Response
// glue.
//
// Analysis architecture (July 2026): shallow is one structured call; deep and
// profound are two-phase — the unchanged structured core call plus parallel
// plain-text section completions with hard word budgets, composed server-side
// into the `analysis` prose (see the "Two-phase composition" block below).

import type OpenAI from "openai";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { zodResponseFormat, zodTextFormat } from "openai/helpers/zod";
import {
  getOpenAIClient,
  getOpenRouterClient,
  getModelForDepth,
  modelTuning,
  serviceTierOption,
  OPENAI_FALLBACK_MODELS,
  OPENROUTER_MODEL,
  getDreamAnalysisSchemaForDepth,
  getDepthSpec,
  type DreamAnalysis,
  type BiblicalReference,
} from "@/lib/openai";
import { captureError } from "@/lib/sentry";
import { createJsonFieldStreamer } from "@/lib/streamJson";
import { ReadingLevel, AnalysisDepth } from "@/schema/profile";

const DEBUG = process.env.NODE_ENV === "development";

// ── Prompt cache (in-memory, 5-min TTL) ────────────────────────────
interface PromptData {
  /** Row version. Used in the prompt cache key so publishing a new prompt
   *  rotates the cache instead of colliding with the old prefix. */
  version: number | null;
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
        "version, system_message, main_instructions, format_instructions, forbidden_phrases, reading_level_radiant_clarity, reading_level_celestial_insight, reading_level_prophetic_wisdom, reading_level_divine_revelation, depth_shallow, depth_deep, depth_profound",
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

/**
 * Spreadable prompt_cache_key.
 *
 * ⚠️ Cast for the same reason as the one in modelTuning: the pinned SDK
 * (openai 4.104.0) predates prompt_cache_key on the Responses API, so it is
 * not in the request types. The SDK forwards the body object as given, so the
 * field is still transmitted — spreading a Record also sidesteps TypeScript's
 * excess-property check, which only applies to direct object literals. Drop it
 * with the v4 -> v7 upgrade.
 */
function promptCacheKeyOption(key: string): Record<string, unknown> {
  return { prompt_cache_key: key } as Record<string, unknown>;
}

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

// ── Two-phase composition (deep / profound) ────────────────────────
//
// Eval showed single-call analysis prose plateaus around ~600-715 words on
// both gpt-4.1-mini and gpt-4.1 regardless of the schema's stated range —
// structured outputs have no minimum-length mechanism. Paid tiers therefore
// get their length BY CONSTRUCTION:
//   Phase A — the unchanged structured core call (topic / points /
//             conclusion / summary / title / tags / references). Its
//             `analysis` field is superseded by the composition below.
//   Phase B — parallel plain-text section completions, each with a hard
//             word budget, composed server-side under the same heading
//             names the depth-tier prompts established.
// Shallow stays single-call (it passes eval).

/** A resolved (client, model) pair plus the request dialect to use:
 *  OpenAI's Responses API, or OpenRouter's Chat Completions
 *  (response_format json_schema) for the cross-provider failover. */
interface ModelTarget {
  client: OpenAI;
  model: string;
  provider: "openai" | "openrouter";
}

interface SectionSpec {
  /** Stable identifier for logs / Sentry tags. */
  key: string;
  /** Heading line composed into the analysis prose. Must keep matching the
   *  heading conventions the depth-tier prompts established ("Dream
   *  Symbols", "Three Lenses on This Dream", "For your prayer or journal"). */
  heading: string;
  /** Word budget the prompt asks for; the 70% quality guard keys off this. */
  targetWords: number;
  /** Bounds stated in the prompt. */
  minWords: number;
  maxWords: number;
  /** What the section must contain. Code-owned on purpose — section prompts
   *  must never depend on the DB prompt row. */
  instruction: string;
}

interface SectionOutcome {
  section: SectionSpec;
  /** Trimmed section body, or null when the section failed after its retry —
   *  composition simply skips it. */
  text: string | null;
}

/** Sections are small (≤ ~300 words), so they get their own modest cap
 *  instead of the tier's multi-thousand-token budget. */
const SECTION_MAX_OUTPUT_TOKENS = 600;

// Deterministic composed-length math (headings add ~10 words on top):
//   deep     ≈ topic 30 + 3 points × 65 + 160 + 130 + conclusion 25 ≈ 550
//              → mid-range of the 400-600 contract
//   profound ≈ topic 30 + 4 points × 75 + 200 + 250 + 140 + conclusion 25 ≈ 955
//              → mid-range of the 800-1100 contract
const DEEP_SECTIONS: SectionSpec[] = [
  {
    key: "symbols",
    heading: "Dream Symbols",
    targetWords: 160,
    minWords: 150,
    maxWords: 200,
    instruction:
      "Unpack 2-4 of the most resonant images from this dream. For each, name the image and explore what it may suggest spiritually for the dreamer, tying each image to scripture with a parenthetical citation.",
  },
  {
    key: "application",
    heading: "How this might apply to your life right now",
    targetWords: 130,
    minWords: 120,
    maxWords: 160,
    instruction:
      "Offer 2-3 gentle, practical suggestions for how the dream's themes might speak into the dreamer's life right now — invitations to reflect, pray, or act, never commands or predictions. Tie at least one suggestion to scripture with a parenthetical citation.",
  },
];

const PROFOUND_SECTIONS: SectionSpec[] = [
  {
    key: "symbols",
    heading: "Dream Symbols",
    targetWords: 200,
    minWords: 180,
    maxWords: 220,
    instruction:
      "Unpack 3-5 of the most resonant images from this dream. For each, name the image and explore what it may suggest spiritually for the dreamer, tying each image to scripture with a parenthetical citation.",
  },
  {
    key: "lenses",
    heading: "Three Lenses on This Dream",
    targetWords: 250,
    minWords: 220,
    maxWords: 280,
    instruction:
      "Read the dream through three lenses, giving each lens 2-3 sentences and naming it inline as you move through them. Literal: what the dream may reflect about the dreamer's present circumstances and emotions. Allegorical: how the dream's imagery echoes biblical narratives, symbols, or patterns, tied to scripture with a parenthetical citation. Prophetic: what gentle invitation, preparation, or encouragement the dream may point toward — held with humility, never predicting specific events.",
  },
  {
    key: "prayer",
    heading: "For your prayer or journal",
    targetWords: 140,
    minWords: 120,
    maxWords: 160,
    instruction:
      "Open with one or two framing sentences inviting the dreamer to bring the dream into prayer or journaling, then pose exactly 3 reflection questions the dreamer can sit with, each ending with a question mark, woven into flowing prose rather than a numbered list.",
  },
];

// Code-owned persona + style for section calls. Deliberately independent of
// the DB prompt row (getActivePrompt) so admin prompt edits can't break the
// composed tiers; mirrors the pastoral rules the core prompt establishes.
const SECTION_SYSTEM_MESSAGE =
  "You are a biblical dream interpreter writing one section of a longer, pastoral dream interpretation. You write warm, humble, scripture-grounded prose.";

const SECTION_STYLE_RULES = `Style rules:
- Interpret through a biblical lens with humility — use language like "may suggest", "could", or "points toward"; never fortune-telling, absolute claims, or date-setting.
- No fear-based, manipulative, or overly mystical language. Never shame, condemn, or frighten the dreamer.
- Address the dreamer directly as "you".
- Cite scripture inline with parenthetical citations in the format (Book Chapter:Verse), using full canonical book names — '1 Peter', not 'Peter'; 'Psalms', not 'Psalm'. Do not quote full verse text.
- Plain prose only: no markdown, no headings, no bullet points, no numbered lists.`;

function buildSectionPrompt(
  dream: string,
  core: DreamAnalysis,
  section: SectionSpec,
  readingLevelInstructions: string,
): string {
  return `A biblical dream interpretation is being assembled from parts. Write ONLY the body text of its "${section.heading}" section — do not write the heading itself, do not introduce or summarize the rest of the interpretation, and do not add a sign-off.

The dream:
"${dream}"

The interpretation's core (context only — do not restate it):
Theme: ${core.topicSentence}
${core.supportingPoints.map((p) => `- ${p}`).join("\n")}

Section content: ${section.instruction}

Length: about ${section.targetWords} words — no fewer than ${section.minWords}, no more than ${section.maxWords}. Count words as you write.

${SECTION_STYLE_RULES}

Reading level for this dreamer:
${readingLevelInstructions}`;
}

/** Server-side composition for deep/profound: topic ¶, one ¶ per supporting
 *  point, each delivered section under its plain-text heading, then the
 *  conclusion. Matches how the UI renders analysis prose — plain text run
 *  through the citation-tooltip splitter in DreamCard, no markdown — and the
 *  blank-line-separated layout the single-call output already used. */
function composeAnalysis(
  core: DreamAnalysis,
  outcomes: SectionOutcome[],
): string {
  const blocks: string[] = [core.topicSentence, ...core.supportingPoints];
  for (const { section, text } of outcomes) {
    if (text) blocks.push(`${section.heading}\n\n${text}`);
  }
  blocks.push(core.conclusionSentence);
  return blocks.join("\n\n");
}

// ── Fallback response ──────────────────────────────────────────────

// Citation-only fallback. Verse text is hydrated downstream via lib/bibleLookup
// in the dream-entries route, so this object only needs to satisfy the post-
// refactor schema: { citation: string, theme: string }. Server-side hydration
// fills in the canonical book/chapter/verse/text; theme is used as written.
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
    { citation: "Psalms 23:4", theme: "steady presence" },
    { citation: "Proverbs 3:5-6", theme: "divine guidance" },
    { citation: "2 Corinthians 5:17", theme: "spiritual renewal" },
  ],
  tags: ["spiritual journey", "divine guidance", "faith"],
};

// ── Public entry point ─────────────────────────────────────────────

export interface DreamAnalysisArgs {
  dream: string;
  topic?: string;
  readingLevel?: string;
  analysisDepth?: string;
  /** When set, the core call streams and emits decoded prose deltas as the
   *  model writes them. Purely additive: the return value is identical, and
   *  a throwing handler is swallowed rather than allowed to kill an analysis.
   *  Composed tiers stream topicSentence + supportingPoints (their `analysis`
   *  field is a placeholder); shallow streams `analysis`, which IS its prose. */
  onDelta?: (field: string, text: string) => void;
}

/**
 * Token usage summed across every call an analysis makes — core structured
 * call, fallback attempts, section completions, retries, and any OpenRouter
 * failover. Null on the fallback path (network/parse errors) where no usable
 * response was returned.
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
 * Run the dream analysis. Shallow is a single structured call; deep and
 * profound run the structured core call plus parallel plain-text section
 * completions composed server-side into the `analysis` prose (length by
 * construction — structured outputs cannot enforce a minimum length).
 *
 * Safe to call concurrently — there is no shared mutable state per call
 * beyond the prompt cache (which is read-only after first fetch).
 *
 * Always returns a DreamAnalysisResult; on error the analysis falls back to
 * FALLBACK_ANALYSIS and usage tokens are null (we never made a billable call,
 * or we couldn't read the usage block).
 */
export async function runDreamAnalysis(
  args: DreamAnalysisArgs,
): Promise<DreamAnalysisResult> {
  const { dream, topic, readingLevel, analysisDepth, onDelta } = args;

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
    // Deep and profound are composed (two-phase); shallow stays single-call.
    const isComposedTier =
      effectiveDepth === AnalysisDepth.DEEP ||
      effectiveDepth === AnalysisDepth.PROFOUND;
    const depthInstructions = getDepthInstructions(effectiveDepth, dbPrompt);

    // Routes requests that share a prompt prefix to the same cache.
    //
    // GPT-5.6+ needs this to match reliably — without it, whether you get a
    // cache hit depends on which machine the request lands on. Keyed on
    // exactly what changes the prefix and nothing that doesn't: prompt
    // version, reading level, depth. Publishing a new prompt row rotates the
    // key automatically, which is the correct behaviour — a new prompt IS a
    // new prefix.
    //
    // The dream text is deliberately excluded. It is the variable part, it now
    // sits at the very end of the prompt, and keying on it would give every
    // request a unique key and defeat the entire point.
    const promptCacheKey = `dr-p${dbPrompt?.version ?? "fallback"}-${effectiveReadingLevel}-${effectiveDepth}`;

    // The depth instructions come from the database (dream_prompts.depth_deep
    // / depth_profound) and still tell the model to write "Dream Symbols" and
    // "How this might apply" inline — written before the two-phase compose
    // existed. Those sections are now separate completions, so obeying that
    // instruction is pure waste. Overriding it here rather than in the DB
    // keeps the two architectures from disagreeing at runtime, and means this
    // fix does not depend on a prompt migration landing first.
    const composedOverride = isComposedTier
      ? `
IMPORTANT — OUTPUT SCOPE: Return ONLY topicSentence, supportingPoints, conclusionSentence, biblicalReferences and tags. Do NOT write any named sections (Dream Symbols, How this might apply, Three Lenses, Prayer prompts, or similar) anywhere in your output — the application generates each of those separately and will discard anything you write for them. Leave "analysis" as a single short sentence.`
      : "";

    const forbiddenPhrases = dbPrompt?.forbidden_phrases?.length
      ? dbPrompt.forbidden_phrases.map((p) => `"${p}"`).join(", ")
      : '"This dream is about", "Your dream is about", "This dream symbolizes", "This dream represents"';

    const systemMessage =
      dbPrompt?.system_message ||
      "You are a biblical dream interpreter who provides concise analysis with scripture references.";

    // ── Prompt order is load-bearing for caching ──────────────────────
    //
    // OpenAI caches on an exact prefix match: static content must come first,
    // variable content last, or everything after the first difference is
    // reprocessed every call. This prompt used to put the dream text in the
    // MIDDLE — right after main_instructions — which stranded roughly 1,085
    // tokens of unchanging instruction (format_instructions, the six rules,
    // reading level, depth) behind it, where they could never be cached.
    //
    // Now: instructions, then the per-request variables, then the dream. The
    // reading-level and depth blocks are semi-static — twelve combinations
    // total — so they sit late but still ahead of the dream, and each
    // combination caches on its own prefix.
    //
    // Note this is a cost win far more than a latency win: input tokens are
    // mostly prefill-parallel, and OpenAI's own guidance is that halving input
    // moves latency 1-5%. Cached input bills at 0.1x.
    const userPrompt = dbPrompt
      ? `${dbPrompt.main_instructions}

${dbPrompt.format_instructions}

- NEVER start with ${forbiddenPhrases}
- Begin directly with the spiritual theme or insight without introductory phrases
- For each supporting point, include exactly one Bible citation in the supportingPoints prose (e.g., "(Genesis 1:1)" or "(1 Peter 5:8)"). Use full canonical book names — '1 Peter', not 'Peter'; 'Psalms', not 'Psalm'.
- The biblicalReferences array must contain one entry per supporting point, in the same order. Provide the citation, plus a short "theme" phrase (2-4 words, e.g. "crossing waters") naming why THAT specific verse was matched — not the dream's overall theme, the reason for that one citation. Do not include verse text; the application retrieves it from a canonical KJV source.
- Tags: each tag must name something CONCRETE from this specific dream — a symbol, place, action, emotion, or biblical motif actually present in the dream or analysis (e.g. 'flood waters', 'lost teeth', 'childhood home', 'wilderness season'). Lowercase noun phrases, 1-2 words. Never generic labels like 'faith', 'spirituality', 'dreams', 'spiritual journey', or 'divine guidance'.

${readingLevelInstructions}
${depthInstructions}${composedOverride}

- Focus analysis on theme: ${topic || "general spiritual meaning"}

Analyze the following dream:
"${dream}"
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
- The biblicalReferences array must contain one entry per supporting point, in the same order. Provide the citation string plus a short "theme" phrase (2-4 words, e.g. "crossing waters") naming why THAT specific verse was matched — not the dream's overall theme, the reason for that one citation. Do not include verse text; the application retrieves it from a canonical KJV source.

${readingLevelInstructions}
${depthInstructions}${composedOverride}
`;

    const client = getOpenAIClient();
    const schemaForDepth = getDreamAnalysisSchemaForDepth(effectiveDepth);
    const spec = getDepthSpec(effectiveDepth);

    // Accumulates tokens across every call this analysis makes — the core
    // call, fallback attempts, section completions, and retries — so the
    // admin cost footer reflects what was actually billed.
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let sawUsage = false;

    const addUsage = (
      usage:
        | { input_tokens?: number | null; output_tokens?: number | null }
        | null
        | undefined,
    ) => {
      if (!usage) return;
      sawUsage = true;
      totalInputTokens += usage.input_tokens ?? 0;
      totalOutputTokens += usage.output_tokens ?? 0;
    };

    // Per-attempt timeout + a single SDK-level retry. Without these the
    // SDK's default retry/backoff can eat the whole function budget
    // before the next model in the chain ever runs.
    const requestOptions = { timeout: PER_ATTEMPT_TIMEOUT_MS, maxRetries: 1 };

    /** Phase A: the structured core call. OpenAI targets use the Responses
     *  API with zodTextFormat (unchanged from the single-call architecture);
     *  the OpenRouter failover target sends the same messages and schema
     *  through Chat Completions' response_format json_schema, which
     *  OpenRouter supports on compatible models. */
    const callCore = async (
      target: ModelTarget,
      extraInstruction?: string,
    ): Promise<DreamAnalysis | null> => {
      const messages = [
        { role: "system" as const, content: systemMessage },
        {
          role: "user" as const,
          content: extraInstruction
            ? `${userPrompt}\n\n${extraInstruction}`
            : userPrompt,
        },
      ];

      if (target.provider === "openrouter") {
        const completion = await target.client.beta.chat.completions.parse(
          {
            model: target.model,
            messages,
            temperature: 0.7,
            max_tokens: spec.maxOutputTokens,
            response_format: zodResponseFormat(schemaForDepth, "DreamAnalysis"),
          },
          requestOptions,
        );
        if (completion.usage) {
          addUsage({
            input_tokens: completion.usage.prompt_tokens,
            output_tokens: completion.usage.completion_tokens,
          });
        }
        return completion.choices[0]?.message?.parsed ?? null;
      }

      const requestBody = {
        model: target.model,
        input: messages,
        ...modelTuning(target.model),
        ...serviceTierOption(),
        ...promptCacheKeyOption(promptCacheKey),
        max_output_tokens: spec.maxOutputTokens,
        text: {
          format: zodTextFormat(schemaForDepth, "DreamAnalysis"),
        },
      };

      // Streaming path. Only the first attempt streams — a length-correction
      // retry re-generates prose the client has already displayed, so it runs
      // silently and only the final parsed result changes.
      if (onDelta && !extraInstruction) {
        // Stream every prose field, in the order the schema emits them, so
        // text appears from the first token rather than after the model has
        // silently written the earlier fields. topicSentence is first in the
        // schema, so the reader sees words almost immediately on every tier.
        // (On composed tiers `analysis` is a one-line placeholder and simply
        // contributes nothing visible; on shallow it is the full prose.)
        const streamFields = [
          "dreamTitle",
          "topicSentence",
          "supportingPoints",
          "conclusionSentence",
          "analysis",
        ];
        const streamer = createJsonFieldStreamer(streamFields, (d) => {
          try {
            onDelta(d.field, d.text);
          } catch {
            // A broken UI wire must never kill an analysis mid-generation.
          }
        });
        // ⚠️ Same SDK-vintage cast family as serviceTierOption above:
        // responses.stream exists at runtime on openai 4.104 but its typings
        // predate our extra body fields. Goes away with the v4 -> v7 upgrade.
        const stream = (target.client.responses as unknown as {
          stream: (body: unknown, opts?: unknown) => AsyncIterable<{ type?: string; delta?: string }> & {
            finalResponse: () => Promise<{
              usage?: unknown;
              output_text?: string;
              output_parsed?: DreamAnalysis | null;
            }>;
          };
        }).stream(requestBody, requestOptions);

        for await (const event of stream) {
          if (event?.type === "response.output_text.delta" && typeof event.delta === "string") {
            streamer.push(event.delta);
          }
        }
        const final = await stream.finalResponse();
        addUsage(final.usage as Parameters<typeof addUsage>[0]);
        if (final.output_parsed) return final.output_parsed;
        // Some SDK builds don't populate output_parsed on the stream helper —
        // fall back to parsing the accumulated text through the same schema.
        try {
          return schemaForDepth.parse(
            JSON.parse(final.output_text ?? ""),
          ) as DreamAnalysis;
        } catch {
          return null;
        }
      }

      const response = await target.client.responses.parse(
        requestBody as Parameters<typeof target.client.responses.parse>[0],
        requestOptions,
      );
      addUsage(response.usage);
      return response.output_parsed;
    };

    /** Phase B transport: one plain-text completion — no JSON schema, since
     *  length control is far more reliable unconstrained. */
    const callSectionText = async (
      target: ModelTarget,
      prompt: string,
    ): Promise<string> => {
      const messages = [
        { role: "system" as const, content: SECTION_SYSTEM_MESSAGE },
        { role: "user" as const, content: prompt },
      ];

      if (target.provider === "openrouter") {
        const completion = await target.client.chat.completions.create(
          {
            model: target.model,
            messages,
            temperature: 0.7,
            max_tokens: SECTION_MAX_OUTPUT_TOKENS,
          },
          requestOptions,
        );
        if (completion.usage) {
          addUsage({
            input_tokens: completion.usage.prompt_tokens,
            output_tokens: completion.usage.completion_tokens,
          });
        }
        return (completion.choices[0]?.message?.content ?? "").trim();
      }

      const response = await target.client.responses.create(
        {
          model: target.model,
          input: messages,
          ...modelTuning(target.model),
          ...serviceTierOption(),
          // Sections have their own system message and prompt shape, so they
          // form a separate prefix from the core call and get their own key.
          ...promptCacheKeyOption(`${promptCacheKey}-section`),
          max_output_tokens: SECTION_MAX_OUTPUT_TOKENS,
        },
        requestOptions,
      );
      addUsage(response.usage);
      return (response.output_text ?? "").trim();
    };

    /** Phase B: generate one section with a per-section quality guard — if
     *  the draft lands under 70% of its word budget, ONE corrective retry of
     *  that section only. Returns text: null on failure so the composer can
     *  skip it: a slightly short deep/profound beats a FALLBACK_ANALYSIS. */
    const generateSection = async (
      target: ModelTarget,
      section: SectionSpec,
      coreResult: DreamAnalysis,
    ): Promise<SectionOutcome> => {
      const prompt = buildSectionPrompt(
        dream,
        coreResult,
        section,
        readingLevelInstructions,
      );
      try {
        let text = await callSectionText(target, prompt);
        let words = countWords(text);

        if (words < Math.ceil(section.targetWords * 0.7)) {
          if (DEBUG) {
            console.log(
              `runDreamAnalysis depth=${effectiveDepth}: section "${section.key}" is ${words} words (target ~${section.targetWords}), retrying with expansion`,
            );
          }
          try {
            const retryText = await callSectionText(
              target,
              `${prompt}\n\nIMPORTANT LENGTH CORRECTION: a previous draft of this section was only ${words} words. Expand it to about ${section.targetWords} words — keep the same approach and content, just develop each thought more fully. Count words as you write.`,
            );
            if (countWords(retryText) > words) {
              text = retryText;
              words = countWords(retryText);
            }
          } catch (retryErr) {
            // Expansion retry is best-effort — keep the short draft.
            captureError(retryErr, {
              tags: { area: "ai-pipeline", stage: "section", model: target.model },
              extra: { depth: effectiveDepth, section: section.key, firstDraftWords: words },
              level: "warning",
            });
          }
        }

        if (!text) throw new Error(`section "${section.key}" returned no text`);
        return { section, text };
      } catch (err) {
        // Section failure after retry → compose without it.
        captureError(err, {
          tags: { area: "ai-pipeline", stage: "section", model: target.model },
          extra: { depth: effectiveDepth, section: section.key, heading: section.heading },
          level: "warning",
        });
        return { section, text: null };
      }
    };

    // ── Model fallback chain ──────────────────────────────────────
    // Tier-override model first (OPENAI_MODEL_DEEP / OPENAI_MODEL_PROFOUND,
    // both defaulting to OPENAI_MODEL), then each fallback, but only on
    // retryable errors (429/5xx/timeouts). Schema/validation errors propagate
    // immediately. Core and sections both run on whichever target ends up
    // serving the core call.
    const tierModel = getModelForDepth(effectiveDepth);
    const modelChain = [
      tierModel,
      ...OPENAI_FALLBACK_MODELS.filter((m) => m !== tierModel),
    ];

    let core: DreamAnalysis | null = null;
    let coreTarget: ModelTarget | null = null;
    let lastError: unknown = null;

    for (const model of modelChain) {
      const target: ModelTarget = { client, model, provider: "openai" };
      try {
        core = await callCore(target);
        coreTarget = target;
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

    if (!coreTarget) {
      // ── Cross-provider failover (dark until OPENROUTER_API_KEY set) ──
      // The whole OpenAI ladder failed with retryable errors — one final
      // attempt through OpenRouter with the same request. A structured-parse
      // failure here falls through to FALLBACK_ANALYSIS exactly as before.
      const openRouterClient = getOpenRouterClient();
      if (openRouterClient) {
        const target: ModelTarget = {
          client: openRouterClient,
          model: OPENROUTER_MODEL,
          provider: "openrouter",
        };
        try {
          core = await callCore(target);
          coreTarget = target;
        } catch (err) {
          lastError = err;
          captureError(err, {
            tags: { area: "ai-pipeline", stage: "analysis", model: `openrouter/${OPENROUTER_MODEL}` },
            extra: { depth: effectiveDepth, fallbackAvailable: false },
            level: "warning",
          });
        }
      }
    }

    if (!coreTarget) {
      // Entire chain (and failover, when keyed) failed with retryable errors.
      throw lastError ?? new Error("All models in fallback chain failed");
    }
    // Const capture so closures below see the narrowed non-null type.
    const activeTarget: ModelTarget = coreTarget;

    const usage: DreamAnalysisUsage = {
      inputTokens: sawUsage ? totalInputTokens : null,
      outputTokens: sawUsage ? totalOutputTokens : null,
    };

    if (!core) {
      captureError(new Error("null parsed output"), {
        tags: { area: "ai-pipeline", stage: "parse", model: activeTarget.model },
        extra: { depth: effectiveDepth },
      });
      // Tokens may still have been billed even though parsing failed — preserve
      // the usage block so the admin footer doesn't undercount cost.
      return { analysis: FALLBACK_ANALYSIS, usage };
    }
    const coreResult: DreamAnalysis = core;

    let parsed: DreamAnalysis = coreResult;

    if (isComposedTier) {
      // ── Phase B: parallel plain-text sections + server-side compose ──
      // Deep/profound get their word count BY CONSTRUCTION: the core call
      // supplies topic/points/conclusion, and each extra section is its own
      // plain-text completion with a hard word budget.
      const sectionSpecs =
        effectiveDepth === AnalysisDepth.PROFOUND
          ? PROFOUND_SECTIONS
          : DEEP_SECTIONS;
      const outcomes = await Promise.all(
        sectionSpecs.map((section) =>
          generateSection(activeTarget, section, coreResult),
        ),
      );
      // Compose either way. When every section failed this yields topic +
      // supporting points + conclusion, which is a shorter but complete
      // reading. It used to fall back to the core call's own analysis prose —
      // but composed tiers no longer ask the model for that prose, so
      // coreResult.analysis is now a one-line placeholder and would render as
      // a stub. Failures are already captured per section.
      parsed = {
        ...coreResult,
        analysis: composeAnalysis(coreResult, outcomes),
      };
    } else {
      // ── Length enforcement (single corrective retry — shallow only) ──
      // max_output_tokens only caps length; it can't force a minimum, and
      // mini-tier models routinely undershoot the prose targets. If the
      // analysis lands below ~75% of the tier's floor, retry once on the
      // target that succeeded, with an explicit word-count correction.
      // Composed tiers deliberately skip this: their length is built from
      // per-section budgets guarded above, so re-running the whole analysis
      // would double-retry and double-spend.
      const words = countWords(parsed.analysis);
      if (words < Math.floor(spec.minWords * 0.75)) {
        if (DEBUG) {
          console.log(
            `runDreamAnalysis depth=${effectiveDepth}: analysis is ${words} words (target ${spec.minWords}-${spec.maxWords}), retrying with length correction`,
          );
        }
        try {
          const retryParsed = await callCore(
            activeTarget,
            `IMPORTANT LENGTH CORRECTION: A previous draft of this analysis was only ${words} words. The "analysis" field MUST be between ${spec.minWords} and ${spec.maxWords} words. Expand each supporting point to ${spec.pointMinWords}-${spec.pointMaxWords} words and fully develop every section required by the depth tier. Count words as you write.`,
          );
          if (retryParsed && countWords(retryParsed.analysis) > words) {
            parsed = retryParsed;
          }
        } catch (err) {
          // Length retry is best-effort — keep the short-but-valid result.
          captureError(err, {
            tags: { area: "ai-pipeline", stage: "length-retry", model: activeTarget.model },
            extra: { depth: effectiveDepth, firstDraftWords: words },
            level: "warning",
          });
        }
      }
    }

    if (DEBUG) {
      const modelLabel =
        activeTarget.provider === "openrouter"
          ? `openrouter/${activeTarget.model}`
          : activeTarget.model;
      console.log(
        `runDreamAnalysis depth=${effectiveDepth}: model=${modelLabel} words=${countWords(parsed.analysis)} tokens=${totalInputTokens}/${totalOutputTokens}`,
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
