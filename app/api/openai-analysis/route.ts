import { NextResponse } from "next/server";
import { ReadingLevel, AnalysisDepth } from "@/schema/profile";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { zodTextFormat } from "openai/helpers/zod";
import {
  getOpenAIClient,
  OPENAI_MODEL,
  DreamAnalysisSchema,
  type DreamAnalysis,
} from "@/lib/openai";

const DEBUG = process.env.NODE_ENV === "development";

export const runtime = "edge";

// ── Prompt cache (in-memory, 5-min TTL) ────────────────────────────
interface CachedPrompt {
  data: PromptData;
  fetchedAt: number;
}

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

const CACHE_TTL_MS = 5 * 60 * 1000;
let promptCache: CachedPrompt | null = null;

async function getActivePrompt(): Promise<PromptData | null> {
  if (promptCache && Date.now() - promptCache.fetchedAt < CACHE_TTL_MS) {
    if (DEBUG) console.log("Using cached dream prompt");
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
        "system_message, main_instructions, format_instructions, forbidden_phrases, reading_level_radiant_clarity, reading_level_celestial_insight, reading_level_prophetic_wisdom, reading_level_divine_revelation"
      )
      .eq("is_active", true)
      .single();

    if (error || !data) {
      if (DEBUG) console.log("No active prompt in DB, using hardcoded fallback");
      return null;
    }

    promptCache = { data, fetchedAt: Date.now() };
    if (DEBUG) console.log("Loaded dream prompt from database");
    return data;
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
  dbPrompt: PromptData | null
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
// Depth controls length and breadth, independent of reading level. Tier
// names are water-themed: shallow (free), deep (visionary), profound (prophet).

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
- Provide 5 to 7 supporting points — each grounded in a distinct biblical reference.
- Include a "Dream Symbols" section unpacking 3-5 of the most resonant images, each tied to scripture.
- Include a "Three Lenses on This Dream" section that reads the dream through three frameworks:
    * Literal lens — what concrete situation in the dreamer's life this could rehearse, with a biblical precedent.
    * Allegorical lens — what the symbols represent in spiritual terms.
    * Prophetic lens — what divine timing or invitation this might mark.
  Each lens is 2-3 sentences.
- Include 4-6 cross-reference verses for further study (book + chapter + verse, no exposition).
- Include a "For your prayer or journal" section with 3 specific reflection questions tied to the dream's content.
- Total length: roughly 800-1200 words. Maintain depth of insight; avoid filler.`;

    case AnalysisDepth.SHALLOW:
    default:
      return `
DEPTH TIER: shallow
- Keep the response concise: topic sentence + 1 to 3 supporting points + conclusion sentence.
- Total length: roughly 150-250 words.`;
  }
}

// Approximate token budget per depth so we don't truncate longer outputs.
function getMaxOutputTokensForDepth(depth: string): number {
  switch (depth) {
    case AnalysisDepth.PROFOUND:
      return 4000;
    case AnalysisDepth.DEEP:
      return 2800;
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

// ── Main handler ───────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    if (DEBUG) console.log("OpenAI Analysis: Request received");

    const { dream, topic, readingLevel, analysisDepth } = await request.json();
    if (DEBUG) {
      console.log(`Dream length: ${dream?.length || 0} chars`);
      console.log(`Topic: ${topic || "general spiritual meaning"}`);
      console.log(`Reading level: ${readingLevel || ReadingLevel.CELESTIAL_INSIGHT}`);
      console.log(`Analysis depth: ${analysisDepth || AnalysisDepth.SHALLOW}`);
    }

    if (!dream) {
      return NextResponse.json(
        { error: "Dream content is required" },
        { status: 400 }
      );
    }

    // Fetch the active prompt from the database (cached)
    const dbPrompt = await getActivePrompt();

    // Build reading level instructions
    const effectiveReadingLevel = readingLevel || ReadingLevel.CELESTIAL_INSIGHT;
    const readingLevelInstructions = getReadingLevelInstructions(
      effectiveReadingLevel,
      dbPrompt
    );

    // Build depth instructions (length / breadth, independent of reading level)
    const effectiveDepth = analysisDepth || AnalysisDepth.SHALLOW;
    const depthInstructions = getDepthInstructions(effectiveDepth);

    // Build forbidden phrases
    const forbiddenPhrases = dbPrompt?.forbidden_phrases?.length
      ? dbPrompt.forbidden_phrases.map((p) => `"${p}"`).join(", ")
      : '"This dream is about", "Your dream is about", "This dream symbolizes", "This dream represents"';

    // Build system and user messages
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

Example format:
"God's promise of provision shines through times of uncertainty in this dream. The water symbolizes God's spirit bringing renewal (Isaiah 44:3), while the mountain represents the challenges you're facing (Zechariah 4:7). Consider how God might be preparing you for upcoming changes that require faith and trust."

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

    if (DEBUG) {
      console.log(`Model: ${OPENAI_MODEL}`);
      console.log("Sending request via OpenAI SDK Responses API");
    }

    // ── Call OpenAI Responses API with Zod structured output ───────
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
      console.log(`Response ID: ${response.id}`);
      console.log(`Status: ${response.status}`);
      if (response.usage) {
        console.log(
          `Tokens: input=${response.usage.input_tokens}, output=${response.usage.output_tokens}`
        );
      }
    }

    // ── Extract parsed result ────────────────────────────────────────
    // The SDK + Zod integration guarantees type-safe, schema-valid output.
    // No manual JSON.parse, no repair logic, no regex extraction needed.
    const parsed = response.output_parsed;

    if (!parsed) {
      console.error("OpenAI returned null parsed output. Response status:", response.status);
      return NextResponse.json(FALLBACK_ANALYSIS);
    }

    if (DEBUG) {
      console.log(
        `Analysis: ${parsed.supportingPoints.length} points, title: "${parsed.dreamTitle}", ${parsed.tags.length} tags`
      );
    }

    return NextResponse.json({
      topicSentence: parsed.topicSentence,
      supportingPoints: parsed.supportingPoints,
      conclusionSentence: parsed.conclusionSentence,
      analysis: parsed.analysis,
      personalizedSummary: parsed.personalizedSummary,
      dreamTitle: parsed.dreamTitle,
      biblicalReferences: parsed.biblicalReferences,
      tags: parsed.tags,
    });
  } catch (error: unknown) {
    console.error("OpenAI analysis error:", error);

    // Return fallback so the app keeps working even if the API call fails
    return NextResponse.json(FALLBACK_ANALYSIS);
  }
}
