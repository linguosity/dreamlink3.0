// lib/openai.ts
//
// Centralized OpenAI configuration for DreamRiver.
// - Single source of truth for the model string, client instance, and Zod schemas.
// - Uses the Responses API with structured output via zodTextFormat.
// - Tier-specific schemas (Shallow / Deep / Profound) enforce structural arity
//   on supportingPoints, biblicalReferences, and tags. Length is enforced by
//   the JSON Schema OpenAI generates from these — not by prompt prose alone.
// - The model emits citations only (e.g. "Genesis 1:1"). The verse text is
//   hydrated server-side via lib/bibleLookup; we never trust the model to
//   reproduce verses verbatim.

import OpenAI from "openai";
import { z } from "zod";
import { AnalysisDepth } from "@/schema/profile";

// ── Model configuration ─────────────────────────────────────────────
// Reads from OPENAI_MODEL env var so you can hot-swap without a deploy.
// Falls back to gpt-4.1-mini — a fast, cost-effective model with full
// structured output support and strong instruction following.
export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

// Per-tier model overrides. Deep/profound are the paid tiers, so they can be
// pointed at a newer/stronger model (e.g. an A/B of a gpt-5.x variant)
// without a deploy and without touching shallow. Both fall back to
// OPENAI_MODEL when unset.
export const OPENAI_MODEL_DEEP =
  process.env.OPENAI_MODEL_DEEP || OPENAI_MODEL;
export const OPENAI_MODEL_PROFOUND =
  process.env.OPENAI_MODEL_PROFOUND || OPENAI_MODEL;

/** Model for a depth tier — used for the tier's core call AND its section
 *  calls (see the two-phase composition in lib/dreamAnalysis.ts). */
export function getModelForDepth(depth: string): string {
  switch (depth) {
    case AnalysisDepth.DEEP:
      return OPENAI_MODEL_DEEP;
    case AnalysisDepth.PROFOUND:
      return OPENAI_MODEL_PROFOUND;
    default:
      return OPENAI_MODEL;
  }
}

// Ordered fallback models, tried in sequence when the primary model fails
// with a retryable error (429 / 5xx / connection timeout). Comma-separated
// env var so the chain can be re-ordered without a deploy:
//   OPENAI_FALLBACK_MODELS="gpt-4.1,gpt-4o-mini"
// Note this protects against single-MODEL failures and brownouts. For
// whole-provider outages, lib/dreamAnalysis additionally makes one final
// cross-provider attempt through OpenRouter after this ladder is exhausted —
// dark until OPENROUTER_API_KEY is set (see getOpenRouterClient below).
export const OPENAI_FALLBACK_MODELS: string[] = (
  process.env.OPENAI_FALLBACK_MODELS || "gpt-4.1"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

// ── Singleton client ────────────────────────────────────────────────
// Works in Node.js serverless and Edge runtimes (SDK v4 uses native fetch).
let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _client;
}

// ── Cross-provider failover (OpenRouter) ────────────────────────────
// Dark until OPENROUTER_API_KEY is set. When the OPENAI_FALLBACK_MODELS
// ladder is exhausted, lib/dreamAnalysis makes one final attempt through
// OpenRouter — a second OpenAI-SDK client pointed at their OpenAI-compatible
// API. OPENROUTER_MODEL accepts ANY OpenRouter model slug (e.g.
// "openai/gpt-4.1-mini", "google/gemini-2.5-flash",
// "anthropic/claude-3.5-haiku"); structured outputs via
// response_format json_schema work on compatible models.
export const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-haiku";

let _openRouterClient: OpenAI | null = null;

/** Second-provider client for failover. Returns null (failover disabled)
 *  until OPENROUTER_API_KEY is configured. */
export function getOpenRouterClient(): OpenAI | null {
  if (!process.env.OPENROUTER_API_KEY) return null;
  if (!_openRouterClient) {
    _openRouterClient = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      // Attribution headers OpenRouter recommends.
      defaultHeaders: {
        "HTTP-Referer": "https://dreamriver.io",
        "X-Title": "DreamRiver",
      },
    });
  }
  return _openRouterClient;
}

// ── Dream Analysis Zod Schemas ──────────────────────────────────────
// The model only emits the citation string. Server-side hydration in
// app/api/dream-entries/route.ts fills in book/chapter/verse/endVerse/text
// from the canonical KJV via lib/bibleLookup.

export const BiblicalReferenceSchema = z.object({
  citation: z
    .string()
    .describe(
      "Standard citation in the format 'Book Chapter:Verse' or 'Book Chapter:Verse-EndVerse'. Examples: 'Genesis 1:1', '1 Peter 5:8', 'Romans 8:28-30'. Use full canonical book names (e.g. '1 Peter', not 'Peter'). Do not include the verse text — the application retrieves it separately.",
    ),
});

// Base shape shared across all depth tiers. Field names stay the same so
// the persistence layer and UI components do not need to change.
const baseShape = {
  topicSentence: z.string().describe(
    "Opening sentence capturing the main spiritual theme — never start with 'This dream is about' or similar.",
  ),
  supportingPoints: z.array(z.string()).describe(
    "Supporting points, each with a parenthetical Bible citation embedded in the prose.",
  ),
  conclusionSentence: z.string().describe(
    "Actionable but gentle concluding sentence with guidance.",
  ),
  analysis: z.string().describe(
    "Full analysis prose combining topic sentence, supporting points, conclusion, and any depth-tier extras (e.g. Dream Symbols, Three Lenses, Prayer prompts).",
  ),
  personalizedSummary: z.string().describe(
    "One vivid sentence addressing the dreamer directly about their dream's significance.",
  ),
  dreamTitle: z.string().describe(
    "Memorable 3-6 word title capturing the dream's essence, e.g. 'Walking on Sacred Waters'.",
  ),
  biblicalReferences: z.array(BiblicalReferenceSchema).describe(
    "Bible references — one per supporting point, in the same order. Citations only; verse text is hydrated server-side.",
  ),
  tags: z.array(z.string()).describe(
    "Tags naming CONCRETE elements of this specific dream — symbols, places, actions, emotions, or biblical motifs actually present in the dream or analysis (e.g. 'flood waters', 'lost teeth', 'childhood home', 'wilderness season'). Lowercase noun phrases of 1-2 words. NEVER generic labels like 'faith', 'spirituality', 'dreams', 'spiritual journey', 'divine guidance', or 'symbolism' — if a tag could describe half of all dreams, it is wrong.",
  ),
} as const;

// ── Depth tier specs ────────────────────────────────────────────────
// Single source of truth for per-tier structure AND length. Word budgets
// live here and are injected into both the JSON-schema field descriptions
// (models follow schema descriptions far more reliably than prompt prose)
// and the length-enforcement retry in lib/dreamAnalysis.ts.
export interface DepthSpec {
  /** Exact number of supporting points / biblical references. */
  points: number;
  /** Exact number of tags. */
  tags: number;
  /** Target word range for the full `analysis` prose. */
  minWords: number;
  maxWords: number;
  /** Target word range for each supporting point. */
  pointMinWords: number;
  pointMaxWords: number;
  /** Hard token cap passed to the API (~1.5 tokens/word + JSON overhead). */
  maxOutputTokens: number;
}

export const DEPTH_SPECS: Record<AnalysisDepth, DepthSpec> = {
  [AnalysisDepth.SHALLOW]: {
    points: 2,
    tags: 2,
    minWords: 150,
    maxWords: 250,
    pointMinWords: 25,
    pointMaxWords: 45,
    maxOutputTokens: 2000,
  },
  [AnalysisDepth.DEEP]: {
    points: 3,
    tags: 3,
    minWords: 400,
    maxWords: 600,
    pointMinWords: 40,
    pointMaxWords: 80,
    maxOutputTokens: 4500,
  },
  [AnalysisDepth.PROFOUND]: {
    points: 4,
    tags: 3,
    minWords: 800,
    maxWords: 1100,
    pointMinWords: 30,
    pointMaxWords: 60,
    maxOutputTokens: 8000,
  },
};

export function getDepthSpec(depth: string): DepthSpec {
  return (
    DEPTH_SPECS[depth as AnalysisDepth] ?? DEPTH_SPECS[AnalysisDepth.SHALLOW]
  );
}

// Tier schema builder: arity is enforced structurally (.length), length is
// pushed through .describe() so it lands in the JSON schema the model sees.
function buildTierSchema(spec: DepthSpec) {
  return z.object({
    ...baseShape,
    supportingPoints: z
      .array(
        z.string().describe(
          `One supporting point of ${spec.pointMinWords}-${spec.pointMaxWords} words with exactly one parenthetical Bible citation embedded in the prose.`,
        ),
      )
      .length(spec.points),
    analysis: z.string().describe(
      `Full analysis prose combining topic sentence, supporting points, conclusion, and any depth-tier extras (e.g. Dream Symbols, Three Lenses, Prayer prompts). LENGTH REQUIREMENT: ${spec.minWords}-${spec.maxWords} words. This range is mandatory — do not stop short of ${spec.minWords} words and do not exceed ${spec.maxWords}.`,
    ),
    biblicalReferences: z.array(BiblicalReferenceSchema).length(spec.points),
    tags: z
      .array(
        z.string().describe(
          "One lowercase 1-2 word noun phrase naming a concrete symbol, place, action, emotion, or biblical motif from THIS specific dream (e.g. 'flood waters', 'lost teeth', 'wilderness season', 'unanswered door'). Never a generic label like 'faith', 'spirituality', 'dreams', or 'divine guidance'.",
        ),
      )
      .length(spec.tags)
      .describe(
        `Exactly ${spec.tags} tags, each specific enough that a reader scanning only the tags could tell this dream apart from any other. Draw them from the dream's own imagery and the analysis themes — never generic spiritual vocabulary.`,
      ),
  });
}

// Shallow: minimum-viable analysis. 2 supporting points, 2 tags, 150-250 words.
export const ShallowDreamAnalysisSchema = buildTierSchema(
  DEPTH_SPECS[AnalysisDepth.SHALLOW],
);

// Deep: balanced analysis. 3 supporting points, 3 tags, 400-600 words.
export const DeepDreamAnalysisSchema = buildTierSchema(
  DEPTH_SPECS[AnalysisDepth.DEEP],
);

// Profound: layered analysis. 4 supporting points, 3 tags, 800-1100 words.
export const ProfoundDreamAnalysisSchema = buildTierSchema(
  DEPTH_SPECS[AnalysisDepth.PROFOUND],
);

// Default export keeps backward compatibility with code that imported
// DreamAnalysisSchema before tier-specific schemas existed.
export const DreamAnalysisSchema = DeepDreamAnalysisSchema;

export function getDreamAnalysisSchemaForDepth(depth: string) {
  switch (depth) {
    case AnalysisDepth.SHALLOW:
      return ShallowDreamAnalysisSchema;
    case AnalysisDepth.PROFOUND:
      return ProfoundDreamAnalysisSchema;
    case AnalysisDepth.DEEP:
    default:
      return DeepDreamAnalysisSchema;
  }
}

// All three tier schemas share the same field set, so a single inferred
// type covers consumers regardless of which depth was used.
export type DreamAnalysis = z.infer<typeof DeepDreamAnalysisSchema>;
export type BiblicalReference = z.infer<typeof BiblicalReferenceSchema>;
