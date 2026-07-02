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

// Ordered fallback models, tried in sequence when the primary model fails
// with a retryable error (429 / 5xx / connection timeout). Comma-separated
// env var so the chain can be re-ordered without a deploy:
//   OPENAI_FALLBACK_MODELS="gpt-4.1,gpt-4o-mini"
// Note this protects against single-MODEL failures and brownouts. For
// whole-provider outage resilience, point OPENAI_BASE_URL at a multi-
// provider router (e.g. OpenRouter) — the SDK reads that env var natively
// and no code change is needed.
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
    "Meaningful tags capturing key themes, symbols, emotions, or spiritual concepts.",
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
    tags: 3,
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
    pointMinWords: 50,
    pointMaxWords: 80,
    maxOutputTokens: 4500,
  },
  [AnalysisDepth.PROFOUND]: {
    points: 4,
    tags: 5,
    minWords: 800,
    maxWords: 1100,
    pointMinWords: 60,
    pointMaxWords: 90,
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
    tags: z.array(z.string()).length(spec.tags),
  });
}

// Shallow: minimum-viable analysis. 2 supporting points, 3 tags, 150-250 words.
export const ShallowDreamAnalysisSchema = buildTierSchema(
  DEPTH_SPECS[AnalysisDepth.SHALLOW],
);

// Deep: balanced analysis. 3 supporting points, 3 tags, 400-600 words.
export const DeepDreamAnalysisSchema = buildTierSchema(
  DEPTH_SPECS[AnalysisDepth.DEEP],
);

// Profound: layered analysis. 4 supporting points, 5 tags, 800-1100 words.
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
