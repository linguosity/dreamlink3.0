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

// Shallow: minimum-viable analysis. 2 supporting points, 3 tags.
export const ShallowDreamAnalysisSchema = z.object({
  ...baseShape,
  supportingPoints: z.array(z.string()).length(2),
  biblicalReferences: z.array(BiblicalReferenceSchema).length(2),
  tags: z.array(z.string()).length(3),
});

// Deep: balanced analysis. 3 supporting points, 3 tags.
export const DeepDreamAnalysisSchema = z.object({
  ...baseShape,
  supportingPoints: z.array(z.string()).length(3),
  biblicalReferences: z.array(BiblicalReferenceSchema).length(3),
  tags: z.array(z.string()).length(3),
});

// Profound: layered analysis. 4 supporting points, 5 tags.
export const ProfoundDreamAnalysisSchema = z.object({
  ...baseShape,
  supportingPoints: z.array(z.string()).length(4),
  biblicalReferences: z.array(BiblicalReferenceSchema).length(4),
  tags: z.array(z.string()).length(5),
});

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
