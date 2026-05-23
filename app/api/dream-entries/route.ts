// app/api/dream-entries/route.ts
//
// Technical explanation:
// This file defines the API route handler for managing dream entries. It
// supports GET, POST, and DELETE HTTP methods to interact with the Supabase
// database. For POST requests (new dream entries), it also triggers an
// asynchronous AI analysis of the dream content using a separate OpenAI
// analysis service.
//
// Analogy:
// This script acts like a central post office for all dream-related mail.
// - When you send a new dream (POST request), the post office receives it,
//   stores it in the main archive (Supabase), and also sends a copy to a
//   specialist (AI analysis service) for interpretation.
// - If you want to retrieve a dream (GET request), the post office fetches
//   it from the archive for you.
// - If you want to discard a dream (DELETE request), the post office removes
//   it from the archive.
// It handles all the backend logistics for your dream journal entries.

import { createClient } from "@/utils/supabase/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { NextResponse, NextRequest } from "next/server";
import crypto from 'crypto';
import { dreamEntryCreateSchema } from "@/schema/dreamEntry";
import { OPENAI_MODEL } from "@/lib/openai";
import { checkDreamSubmissionRateLimit } from "@/lib/rateLimit";
import { encrypt, encryptJson, decryptDreamRow } from "@/lib/crypto";
import { runDreamAnalysis } from "@/lib/dreamAnalysis";
import { lookupVerse, type VerseLookupResult } from "@/lib/bibleLookup";
import {
  AnalysisDepth,
  ReadingLevel,
  clampDepthToPlan,
  type SubscriptionPlan,
} from "@/schema/profile";
import { ImageAesthetic } from "@/schema/imageAesthetic";

const DEBUG = process.env.NODE_ENV === 'development';

// Extend Vercel function timeout to 60s (requires Pro plan; Hobby is capped at 10s).
// The OpenAI call alone takes 5–15s, so this is required for analysis to complete.
export const maxDuration = 60;

// Simple in-memory analysis cache (LRU-style with TTL)
const analysisCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL_MS = 3600000; // 1 hour
const MAX_CACHE_SIZE = 100;

function getAnalysisCacheKey(
  dreamText: string,
  readingLevel: string,
  analysisDepth: string,
): string {
  return crypto
    .createHash('sha256')
    .update(`${dreamText}:${readingLevel}:${analysisDepth}`)
    .digest('hex');
}

interface MatrixCombo {
  depth: AnalysisDepth;
  readingLevel: ReadingLevel;
  aesthetic: ImageAesthetic;
}

interface ProfileContext {
  is_admin: boolean;
  plan: SubscriptionPlan;
  analysis_depth: AnalysisDepth;
  reading_level: ReadingLevel;
  image_aesthetic: ImageAesthetic;
  test_mode_enabled: boolean;
  test_mode_depths: AnalysisDepth[];
  test_mode_reading_levels: ReadingLevel[];
  test_mode_aesthetics: ImageAesthetic[];
}

async function getProfileContext(userId: string): Promise<ProfileContext> {
  const admin = getAdminClient();

  const [{ data: profile }, { data: sub }] = await Promise.all([
    admin
      .from("profile")
      .select(
        "is_admin, analysis_depth, reading_level, image_aesthetic, test_mode_enabled, test_mode_depths, test_mode_reading_levels, test_mode_aesthetics",
      )
      .eq("user_id", userId)
      .single(),
    admin
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const p: any = profile ?? {};
  const s: any = sub ?? {};

  const plan: SubscriptionPlan =
    s?.plan === "visionary" || s?.plan === "prophet" ? s.plan : "free";

  return {
    is_admin: Boolean(p.is_admin),
    plan,
    analysis_depth:
      (p.analysis_depth as AnalysisDepth) ?? AnalysisDepth.SHALLOW,
    reading_level:
      (p.reading_level as ReadingLevel) ?? ReadingLevel.CELESTIAL_INSIGHT,
    image_aesthetic:
      (p.image_aesthetic as ImageAesthetic) ??
      ImageAesthetic.PHOTOREALISTIC_VISION,
    test_mode_enabled: Boolean(p.test_mode_enabled),
    test_mode_depths: (p.test_mode_depths ?? []) as AnalysisDepth[],
    test_mode_reading_levels: (p.test_mode_reading_levels ?? []) as ReadingLevel[],
    test_mode_aesthetics: (p.test_mode_aesthetics ?? []) as ImageAesthetic[],
  };
}

function buildTitleFromText(text: string): string {
  if (text.length <= 10) return `Dream: ${text}`;
  if (text.length <= 50) return text;
  const truncated = text.substring(0, 50);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 30
    ? truncated.substring(0, lastSpace) + "..."
    : truncated + "...";
}

interface AnalyzeOneArgs {
  adminSupabase: ReturnType<typeof getAdminClient>;
  userId: string;
  encryptedText: string;
  dreamText: string;
  baseTitle: string;
  combo: MatrixCombo;
  comparisonGroupId: string | null;
}

interface AnalyzeOneResult {
  id: string | null;
  analysis: any;
  combo: MatrixCombo;
}

async function analyzeOneCombo(args: AnalyzeOneArgs): Promise<AnalyzeOneResult> {
  const {
    adminSupabase,
    userId,
    encryptedText,
    dreamText,
    baseTitle,
    combo,
    comparisonGroupId,
  } = args;

  // 1. Insert the row up-front so the client can render an optimistic
  //    placeholder immediately, before analysis returns.
  const { data: dreamData, error: dreamInsertError } = await adminSupabase
    .from("dream_entries")
    .insert({
      user_id: userId,
      original_text_enc: encryptedText,
      title: baseTitle,
      analysis_depth: combo.depth,
      reading_level_used: combo.readingLevel,
      image_aesthetic_used: combo.aesthetic,
      comparison_group_id: comparisonGroupId,
    } as never)
    .select()
    .single();

  if (dreamInsertError || !dreamData?.id) {
    console.error("Error saving dream:", dreamInsertError);
    return { id: null, analysis: null, combo };
  }
  const dreamId: string = dreamData.id;

  // 2. Run the OpenAI analysis (cache-keyed by depth + reading level).
  // `runDreamAnalysis` now returns { analysis, usage }. We cache only the
  // analysis — token usage describes a specific API call, so a cache hit
  // should report zero tokens (no billable call happened).
  let analysisResult: any = null;
  let analysisUsage: { inputTokens: number | null; outputTokens: number | null } = {
    inputTokens: null,
    outputTokens: null,
  };
  try {
    const cacheKey = getAnalysisCacheKey(dreamText, combo.readingLevel, combo.depth);
    const cached = analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      if (DEBUG) console.log('✅ Analysis cache hit', { depth: combo.depth });
      analysisResult = cached.result;
      // Cache hit: no OpenAI call was made for this dream entry.
      analysisUsage = { inputTokens: 0, outputTokens: 0 };
    } else {
      // Call the shared analyzer directly. Going through the route handler
      // with a synthetic NextRequest broke under parallel fan-out because
      // multiple concurrent invocations corrupted each other's output.
      const { analysis: fresh, usage } = await runDreamAnalysis({
        dream: dreamText,
        topic: "dream interpretation",
        readingLevel: combo.readingLevel,
        analysisDepth: combo.depth,
      });
      analysisResult = fresh;
      analysisUsage = usage;

      if (analysisCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = analysisCache.keys().next().value;
        if (oldestKey) analysisCache.delete(oldestKey);
      }
      analysisCache.set(cacheKey, { result: analysisResult, timestamp: Date.now() });
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
      original: { citation?: string } | null;
      lookup: VerseLookupResult;
    }
    const hydratedRefs: HydratedRef[] = biblicalReferences.map(
      (ref: { citation?: string } | null, index: number) => ({
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
        `Citation lookup miss (depth=${combo.depth}, dream=${dreamId}, n=${lookupMisses.length}/${hydratedRefs.length}): ${lookupMisses
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
      tags: tags.length > 0 ? tags : ["spiritual insight", "dream analysis"],
      bible_refs: bibleRefs,
      raw_analysis_enc: encryptJson(analysisResult),
    };
    if (dreamTitle?.trim()) updateData.title = dreamTitle;

    // Only persist citation rows we could resolve against KJV. Hallucinated
    // citations (status === "not_found") are intentionally skipped here so
    // we never store known-bad verse text — they remain in bible_refs above
    // so the prose context survives, but the lookup route will fall through
    // to its placeholder for them.
    const citations = hydratedRefs
      .filter(({ lookup }: HydratedRef) => lookup.status !== "not_found")
      .map(({ index, lookup }: HydratedRef) => ({
        dream_entry_id: dreamId,
        bible_book: lookup.book,
        chapter: lookup.chapter,
        verse: lookup.verse,
        end_verse: lookup.endVerse,
        full_text: lookup.text,
        citation_order: index + 1,
      }));

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
          model: OPENAI_MODEL,
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
  } catch (analysisError) {
    console.error("Analysis failed for combo:", combo, analysisError);
    await adminSupabase
      .from("dream_entries")
      .update({
        dream_summary: "Analysis could not be completed at this time.",
      })
      .eq("id", dreamId);
  }

  return { id: dreamId, analysis: analysisResult, combo };
}

function buildMatrix(
  ctx: ProfileContext,
  requestedReadingLevel: ReadingLevel | undefined,
): MatrixCombo[] {
  // Default reading level falls back to the saved profile preference.
  const readingLevel = requestedReadingLevel ?? ctx.reading_level;

  // Non-admins or admins with test mode off: single combo, depth clamped to plan.
  if (!ctx.is_admin || !ctx.test_mode_enabled) {
    return [
      {
        depth: clampDepthToPlan(ctx.analysis_depth, ctx.plan),
        readingLevel,
        aesthetic: ctx.image_aesthetic,
      },
    ];
  }

  // Admin test mode: cartesian product of any non-empty dimension arrays.
  // Empty dimension → falls back to the single saved value (no fan-out on that axis).
  const depths = ctx.test_mode_depths.length
    ? ctx.test_mode_depths
    : [ctx.analysis_depth];
  const readingLevels = ctx.test_mode_reading_levels.length
    ? ctx.test_mode_reading_levels
    : [readingLevel];
  const aesthetics = ctx.test_mode_aesthetics.length
    ? ctx.test_mode_aesthetics
    : [ctx.image_aesthetic];

  const combos: MatrixCombo[] = [];
  for (const depth of depths) {
    for (const lvl of readingLevels) {
      for (const aesthetic of aesthetics) {
        combos.push({ depth, readingLevel: lvl, aesthetic });
      }
    }
  }
  return combos;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  
  try {
    // Get dream ID from URL
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: "Dream ID is required" },
        { status: 400 }
      );
    }
    
    // Get the dream entry
    const { data, error } = await supabase
      .from("dream_entries")
      .select("*")
      .eq("id", id);

    if (error) {
      console.error("Error fetching dream:", error);
      return NextResponse.json(
        { error: "Dream not found" },
        { status: 404 }
      );
    }

    const decrypted = (data || []).map((row) => decryptDreamRow({ ...row }));

    return NextResponse.json({ dreams: decrypted });
  } catch (error) {
    console.error("Error processing GET request:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized: You must be logged in to delete a dream" },
      { status: 401 }
    );
  }
  
  try {
    // Get dream ID from URL
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: "Dream ID is required" },
        { status: 400 }
      );
    }
    
    // Verify ownership before deleting
    const { data: dream, error: fetchError } = await supabase
      .from("dream_entries")
      .select("user_id")
      .eq("id", id)
      .single();
      
    if (fetchError) {
      console.error("Error fetching dream:", fetchError);
      return NextResponse.json(
        { error: "Dream not found" },
        { status: 404 }
      );
    }
    
    // Check if the user owns this dream
    if (dream.user_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized: You can only delete your own dreams" },
        { status: 403 }
      );
    }
    
    // Delete related records in parallel (independent of each other)
    await Promise.all([
      supabase.from("bible_citations").delete().eq("dream_entry_id", id),
      supabase.from("chatgpt_interactions").delete().eq("dream_entry_id", id),
    ]);

    // Then delete the dream entry (depends on above due to FK constraints)
    const { error: deleteError } = await supabase
      .from("dream_entries")
      .delete()
      .eq("id", id);
      
    if (deleteError) {
      console.error("Error deleting dream:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete dream" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Dream deleted successfully"
    });
  } catch (error) {
    console.error("Error processing delete request:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (DEBUG) console.log("API: Dream entry - POST request received");

  const supabase = await createClient();

  // Get current user with more detailed logging
  if (DEBUG) console.log("API: Dream entry - Checking authentication");
  const { data, error: authError } = await supabase.auth.getUser();
  const user = data?.user;

  if (DEBUG) console.log("API: Dream entry - Auth result:", user ? "User authenticated" : "No user found");
  if (DEBUG && user) {
    console.log("API: Dream entry - User ID:", user.id);
  }

  if (authError) {
    console.error("API: Dream entry - Auth error:", authError.message);
    return NextResponse.json(
      { error: `Unauthorized: Authentication error (${authError.message})` },
      { status: 401 }
    );
  }

  if (!user) {
    console.error("API: Dream entry - No user in session");

    return NextResponse.json(
      { error: "Unauthorized: You must be logged in to submit a dream" },
      { status: 401 }
    );
  }

  // Resolve the user's profile + plan up-front so we know whether to bypass
  // the rate limit (admins) and how to build the analysis matrix.
  const profileCtx = await getProfileContext(user.id);

  // Per-user daily rate limit — prevents a single signup from draining the
  // OpenAI/BFL budget by submitting dreams in a loop. Admins bypass it so
  // test-mode comparisons can fan out without locking themselves out.
  if (!profileCtx.is_admin) {
    const rl = await checkDreamSubmissionRateLimit(user.id);
    if (!rl.allowed) {
      if (DEBUG) {
        console.log(
          `API: Dream entry - rate limited user=${user.id} used=${rl.used}/${rl.limit}`
        );
      }
      return NextResponse.json(
        {
          error: `Daily dream submission limit reached (${rl.limit} per 24 hours). Please try again later.`,
          used: rl.used,
          limit: rl.limit,
        },
        {
          status: 429,
          headers: rl.retryAfterSeconds
            ? { "Retry-After": String(rl.retryAfterSeconds) }
            : undefined,
        }
      );
    }
  }

  try {
    // Parse and validate request body with Zod
    const body = await request.json();
    const parsed = dreamEntryCreateSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Invalid input";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { dream_text, reading_level } = parsed.data;

    // Build the matrix of (depth × reading-level × aesthetic) combinations.
    // 1 entry for normal users, N entries when an admin has test mode on.
    const matrix = buildMatrix(profileCtx, reading_level as ReadingLevel | undefined);
    const comparisonGroupId = matrix.length > 1 ? crypto.randomUUID() : null;
    if (DEBUG) {
      console.log(
        `Matrix size=${matrix.length}${comparisonGroupId ? ` group=${comparisonGroupId}` : ''}`,
      );
    }
    
    const baseTitle = buildTitleFromText(dream_text);

    // Admin client for all DB writes (bypasses RLS) — singleton.
    const adminSupabase = getAdminClient();
    const encryptedText = encrypt(dream_text);

    // Run each combo end-to-end in parallel: insert row → call OpenAI → update.
    // Bounded by the slowest call (~15s), well within the 60s function timeout.
    const entryResults = await Promise.all(
      matrix.map((combo) =>
        analyzeOneCombo({
          adminSupabase,
          userId: user.id,
          encryptedText,
          dreamText: dream_text,
          baseTitle,
          combo,
          comparisonGroupId,
        }),
      ),
    );

    // Filter out any combo that failed at the insert step (we still continue
    // with others). If the entire matrix failed, return 500.
    const successful = entryResults.filter((r) => r.id);
    if (successful.length === 0) {
      return NextResponse.json(
        { error: "Failed to save any dream entries" },
        { status: 500 },
      );
    }

    const primary = successful[0];
    return NextResponse.json({
      success: true,
      message:
        successful.length === matrix.length
          ? "Dream recorded and analyzed"
          : `Dream partially recorded (${successful.length}/${matrix.length} variants)`,
      // Legacy fields point at the first successful entry for client compatibility
      id: primary.id,
      analysis: primary.analysis,
      // Matrix metadata for clients that want to render comparison groups
      comparisonGroupId,
      entries: successful.map((r) => ({
        id: r.id,
        analysis: r.analysis,
        analysis_depth: r.combo.depth,
        reading_level_used: r.combo.readingLevel,
        image_aesthetic_used: r.combo.aesthetic,
      })),
    });

  } catch (error) {
    console.error("Error processing dream submission:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
