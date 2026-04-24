// lib/openai.ts
//
// Centralized OpenAI configuration for DreamRiver.
// - Single source of truth for the model string, client instance, and Zod schemas.
// - Uses the Responses API with structured output via zodTextFormat.
// - Import { openai, OPENAI_MODEL, DreamAnalysisSchema } wherever needed.

import OpenAI from "openai";
import { z } from "zod";

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

// ── Dream Analysis Zod Schema ───────────────────────────────────────
// This is the single source of truth for the structured output shape.
// Used by zodTextFormat to guarantee schema-compliant responses from the
// Responses API — no manual JSON parsing or repair needed.

export const BiblicalReferenceSchema = z.object({
  citation: z.string().describe("Full citation string, e.g. 'Genesis 1:1'"),
  book: z.string().describe("Book name, e.g. 'Genesis'"),
  chapter: z.number().int().describe("Chapter number"),
  verse: z.number().int().describe("Starting verse number"),
  endVerse: z.number().int().nullable().describe("Ending verse number for ranges, or null"),
  verseText: z.string().describe("Full text of the verse(s)"),
});

export const DreamAnalysisSchema = z.object({
  topicSentence: z.string().describe(
    "Opening sentence capturing the main spiritual theme — never start with 'This dream is about' or similar."
  ),
  supportingPoints: z.array(z.string()).describe(
    "1-3 supporting points, each with a parenthetical Bible citation."
  ),
  conclusionSentence: z.string().describe(
    "Actionable but gentle concluding sentence with guidance."
  ),
  analysis: z.string().describe(
    "Full analysis text combining topic, points, and conclusion."
  ),
  personalizedSummary: z.string().describe(
    "One vivid sentence addressing the dreamer directly about their dream's significance."
  ),
  dreamTitle: z.string().describe(
    "Memorable 3-6 word title capturing the dream's essence, e.g. 'Walking on Sacred Waters'."
  ),
  biblicalReferences: z.array(BiblicalReferenceSchema).describe(
    "Array of biblical references with full verse text for each citation used."
  ),
  tags: z.array(z.string()).min(3).max(5).describe(
    "3-5 meaningful tags capturing key themes, symbols, emotions, or spiritual concepts."
  ),
});

export type DreamAnalysis = z.infer<typeof DreamAnalysisSchema>;
export type BiblicalReference = z.infer<typeof BiblicalReferenceSchema>;
