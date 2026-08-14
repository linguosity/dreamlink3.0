// lib/analysisPersistence.ts
//
// "Run the analysis for one dream row and write the results onto it."
//
// Extracted verbatim from app/api/dream-entries/route.ts's analyzeOneCombo(),
// which used to own this logic inline. It moved here so the "Read again"
// re-generation route (HANDOFF-v3.md §5 item 4) re-reads a dream through
// exactly the same code path that produced the first reading — same prompt
// assembly, same KJV hydration, same citation persistence, same cost
// telemetry. A second copy of ~130 lines of citation-hydration logic is the
// kind of thing that silently diverges, and the divergence would show up as
// "my re-read lost its scripture".
//
// The row must already exist: creation (insert) stays in the dream-entries
// route, because only that path knows about the comparison-group matrix.

import crypto from "crypto";
import { getAdminClient } from "@/utils/supabase/admin";
import { getModelForDepth } from "@/lib/openai";
import { runDreamAnalysis } from "@/lib/dreamAnalysis";
import { lookupVerse, type VerseLookupResult } from "@/lib/bibleLookup";
import { sanitizeTags } from "@/lib/tags";
import { encryptJson } from "@/lib/crypto";
import type { AnalysisDepth, ReadingLevel } from "@/schema/profile";

const DEBUG = process.env.NODE_ENV === "development";

// Simple in-memory analysis cache (LRU-style with TTL).
const analysisCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL_MS = 3600000; // 1 hour
const MAX_CACHE_SIZE = 100;

function getAnalysisCacheKey(
  dreamText: string,
  readingLevel: string,
  analysisDepth: string,
): string {
  return crypto
    .createHash("sha256")
    .update(`${dreamText}:${readingLevel}:${analysisDepth}`)
    .digest("hex");
}

export interface AnalyzeAndPersistArgs {
  adminSupabase: ReturnType<typeof getAdminClient>;
  /** An existing dream_entries row. Must already be inserted. */
  dreamId: string;
  /** Plaintext dream. Never persisted from here — the row already holds the
   *  encrypted copy. */
  dreamText: string;
  depth: AnalysisDepth;
  readingLevel: ReadingLevel;
  /** Skip the in-memory cache both on read and write. Re-generation sets this:
   *  a cache hit would hand back the byte-identical reading the user just
   *  asked to replace, which is the one outcome "Read again" must never
   *  produce. */
  bypassCache?: boolean;
  /** Streams decoded analysis prose as the model writes it. Threaded through
   *  to runDreamAnalysis untouched. Note the in-memory cache path emits
   *  nothing — a cache hit produces the reading instantly, so there is
   *  nothing to stream. */
  onDelta?: (field: string, text: string) => void;
  /** Replace this dream's existing bible_citations rows instead of appending.
   *  Re-generation sets this; a fresh dream has none to replace. */
  replaceCitations?: boolean;
}

export interface AnalyzeAndPersistResult {
  analysis: any;
  ok: boolean;
}

/**
 * Runs the model, hydrates its citations against canonical KJV, and writes
 * the analysis, citations, and cost telemetry onto an existing dream row.
 *
 * Never throws: a failed analysis leaves a human-readable dream_summary on the
 * row and reports ok:false, exactly as the original inline version did.
 */
export async function analyzeAndPersist({
  adminSupabase,
  dreamId,
  dreamText,
  depth,
  readingLevel,
  bypassCache = false,
  replaceCitations = false,
  onDelta,
}: AnalyzeAndPersistArgs): Promise<AnalyzeAndPersistResult> {
  // `runDreamAnalysis` returns { analysis, usage }. We cache only the
  // analysis — token usage describes a specific API call, so a cache hit
  // should report zero tokens (no billable call happened).
  let analysisResult: any = null;
  let analysisUsage: { inputTokens: number | null; outputTokens: number | null } = {
    inputTokens: null,
    outputTokens: null,
  };

  try {
    const cacheKey = getAnalysisCacheKey(dreamText, readingLevel, depth);
    const cached = bypassCache ? undefined : analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      if (DEBUG) console.log("✅ Analysis cache hit", { depth });
      analysisResult = cached.result;
      // Cache hit: no OpenAI call was made for this dream entry.
      analysisUsage = { inputTokens: 0, outputTokens: 0 };
    } else {
      // Call the shared analyzer directly. Going through the route handler
      // with a synthetic NextRequest broke under parallel fan-out because
      // multiple concurrent invocations corrupted each other's output.
      const { analysis: fresh, usage } = await runDreamAnalysis({
        onDelta,
        dream: dreamText,
        topic: "dream interpretation",
        readingLevel,
        analysisDepth: depth,
      });
      analysisResult = fresh;
      analysisUsage = usage;

      if (!bypassCache) {
        if (analysisCache.size >= MAX_CACHE_SIZE) {
          const oldestKey = analysisCache.keys().next().value;
          if (oldestKey) analysisCache.delete(oldestKey);
        }
        analysisCache.set(cacheKey, { result: analysisResult, timestamp: Date.now() });
      }
    }

    const {
      analysis,
      topicSentence,
      supportingPoints = [],
      conclusionSentence,
      personalizedSummary,
      dreamTitle,
      biblicalReferences = [],
      tags = [],
    } = analysisResult;

    const formattedAnalysis =
      analysis ||
      `${topicSentence} ${supportingPoints.join(" ")} ${conclusionSentence}`;
    const dreamSummary = analysis
      ? analysis.split(".").slice(0, 2).join(".") + "."
      : "";

    // Hydrate model-emitted citations against canonical KJV. The model returns
    // citation strings only; book/chapter/verse/text come from lib/bibleLookup.
    // Misses are logged but do not block persistence — we keep the original
    // citation in bible_refs so the prose still references it.
    interface HydratedRef {
      index: number;
      original: { citation?: string; theme?: string } | null;
      lookup: VerseLookupResult;
    }
    const hydratedRefs: HydratedRef[] = biblicalReferences.map(
      (ref: { citation?: string; theme?: string } | null, index: number) => ({
        index,
        original: ref,
        lookup: lookupVerse(ref?.citation ?? ""),
      }),
    );

    const lookupMisses = hydratedRefs.filter(
      (h: HydratedRef) => h.lookup.status === "not_found",
    );
    if (lookupMisses.length > 0) {
      console.warn(
        `Citation lookup miss (depth=${depth}, dream=${dreamId}, n=${lookupMisses.length}/${hydratedRefs.length}): ${lookupMisses
          .map((h: HydratedRef) => `"${(h.original?.citation ?? "").trim()}"`)
          .join(", ")}`,
      );
    }

    const bibleRefs = hydratedRefs
      .map(({ original, lookup }: HydratedRef) =>
        lookup.status === "not_found"
          ? (original?.citation ?? "").trim()
          : lookup.normalizedRef,
      )
      .filter(Boolean);

    const updateData: any = {
      dream_summary: dreamSummary,
      analysis_summary: analysis,
      topic_sentence: topicSentence,
      supporting_points: supportingPoints,
      conclusion_sentence: conclusionSentence,
      formatted_analysis: formattedAnalysis,
      personalized_summary: personalizedSummary || null,
      tags: sanitizeTags(tags),
      bible_refs: bibleRefs,
      raw_analysis_enc: encryptJson(analysisResult),
      // Cost telemetry (migration 20260731000001). These same numbers go to
      // chatgpt_interactions below, but utils/pricing.ts reads them off the
      // dream row — denormalizing here is what makes the admin cost footer
      // show a real figure instead of $0. model_used is recorded per row
      // because per-tier overrides (OPENAI_MODEL_PROFOUND) mean two rows in
      // this table can carry prices that differ by ~10×.
      input_tokens: analysisUsage.inputTokens,
      output_tokens: analysisUsage.outputTokens,
      model_used: getModelForDepth(depth),
    };
    if (dreamTitle?.trim()) updateData.title = dreamTitle;

    // Only persist citation rows we could resolve against KJV. Hallucinated
    // citations (status === "not_found") are intentionally skipped here so
    // we never store known-bad verse text — they remain in bible_refs above
    // so the prose context survives, but the lookup route will fall through
    // to its placeholder for them.
    const citations = hydratedRefs
      .filter(({ lookup }: HydratedRef) => lookup.status !== "not_found")
      .map(({ index, lookup, original }: HydratedRef) => ({
        dream_entry_id: dreamId,
        bible_book: lookup.book,
        chapter: lookup.chapter,
        verse: lookup.verse,
        end_verse: lookup.endVerse,
        full_text: lookup.text,
        citation_order: index + 1,
        // HANDOFF-v3.md §5 item 2 ("themed verse citations") — the model's
        // own reason for matching this verse, persisted as written. Trimmed
        // to a sane display length so a model that ignores the "2-4 words"
        // instruction can't blow out the scripture chip; null (not "") when
        // absent so the UI can cleanly fall back to the bare reference.
        theme: original?.theme?.trim().slice(0, 80) || null,
      }));

    // Re-generation: the previous reading's citations belong to a reading that
    // no longer exists. Delete before insert so the chips under the new
    // interpretation are the new interpretation's, not a union of both.
    if (replaceCitations) {
      const { error: clearError } = await adminSupabase
        .from("bible_citations")
        .delete()
        .eq("dream_entry_id", dreamId);
      if (clearError) {
        console.error("Error clearing previous Bible citations:", clearError);
      }
    }

    await Promise.all([
      adminSupabase
        .from("dream_entries")
        .update(updateData)
        .eq("id", dreamId)
        .then(({ error }) => {
          if (error) console.error("Error updating dream with analysis:", error);
        }),
      adminSupabase
        .from("chatgpt_interactions")
        .insert({
          dream_entry_id: dreamId,
          model: getModelForDepth(depth),
          temperature: 0.7,
          input_tokens: analysisUsage.inputTokens,
          output_tokens: analysisUsage.outputTokens,
        } as never)
        .then(({ error }) => {
          if (error) console.error("Error storing ChatGPT interaction:", error);
        }),
      citations.length > 0
        ? adminSupabase
            .from("bible_citations")
            .insert(citations as never)
            .then(({ error }) => {
              if (error) console.error("Error saving Bible citations:", error);
            })
        : Promise.resolve(),
    ]);

    return { analysis: analysisResult, ok: true };
  } catch (analysisError) {
    console.error(
      `Analysis failed for dream=${dreamId} depth=${depth}:`,
      analysisError,
    );
    await adminSupabase
      .from("dream_entries")
      .update({
        dream_summary: "Analysis could not be completed at this time.",
      })
      .eq("id", dreamId);
    return { analysis: analysisResult, ok: false };
  }
}
