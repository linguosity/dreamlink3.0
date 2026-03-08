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
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse, NextRequest, after } from "next/server";

// Extend Vercel function timeout to 60s (requires Pro plan; Hobby is capped at 10s).
// The OpenAI call alone takes 5–15s, so this is required for analysis to complete.
export const maxDuration = 60;

import { POST as openAiHandler } from "@/app/api/openai-analysis/route";
import { generateAndStoreDreamImage, buildImagePrompt } from "@/utils/imageGeneration";

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
    
    // Return the dream in the expected format for the client
    return NextResponse.json({
      dreams: data || []
    });
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
    
    // Delete related records first (foreign key constraints)
    // Delete bible citations
    await supabase
      .from("bible_citations")
      .delete()
      .eq("dream_entry_id", id);
      
    // Delete ChatGPT interactions  
    await supabase
      .from("chatgpt_interactions")
      .delete()
      .eq("dream_entry_id", id);
    
    // Delete the dream entry
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
  console.log("API: Dream entry - POST request received");
  
  const supabase = await createClient();
  
  // Get current user with more detailed logging
  console.log("API: Dream entry - Checking authentication");
  const { data, error: authError } = await supabase.auth.getUser();
  const user = data?.user;
  
  console.log("API: Dream entry - Auth result:", user ? "User authenticated" : "No user found");
  if (user) {
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
    
    // Also check session to see if there's more info
    const { data: sessionData } = await supabase.auth.getSession();
    console.log("API: Dream entry - Session check:", sessionData?.session ? "Has session" : "No session");
    
    return NextResponse.json(
      { error: "Unauthorized: You must be logged in to submit a dream" },
      { status: 401 }
    );
  }
  
  try {
    // Parse request body
    const body = await request.json();
    const { dream_text } = body;
    
    if (!dream_text || typeof dream_text !== "string" || dream_text.trim() === "") {
      return NextResponse.json(
        { error: "Dream text is required" },
        { status: 400 }
      );
    }
    
    // Generate a title - improve handling for short inputs
    let title: string;
    
    if (dream_text.length <= 10) {
      // For very short inputs, create a descriptive title
      title = `Dream: ${dream_text}`;
    } else if (dream_text.length <= 50) {
      // For medium length, use the full text as title
      title = dream_text;
    } else {
      // For long text, truncate at a word boundary if possible
      const truncated = dream_text.substring(0, 50);
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > 30) {
        title = truncated.substring(0, lastSpace) + "...";
      } else {
        title = truncated + "...";
      }
    }
    
    // Insert dream into database
    const { data: dreamData, error: dreamInsertError } = await supabase
      .from("dream_entries")
      .insert({
        user_id: user.id,
        original_text: dream_text,
        title
      })
      .select()
      .single();
    
    console.log("Dream insert response:", { data: dreamData, error: dreamInsertError });
    
    if (dreamInsertError) {
      console.error("Error saving dream:", dreamInsertError);
      
      // Return detailed error for debugging
      return NextResponse.json(
        { 
          error: "Failed to save dream entry", 
          details: dreamInsertError,
          request: {
            user_id: user.id,
            title: title,
            text_length: dream_text.length
          }
        },
        { status: 500 }
      );
    }

    // Begin analysis in background - ensure ID exists
    if (!dreamData || !dreamData.id) {
      console.error("Dream saved but no ID returned");
      return NextResponse.json(
        { error: "Dream saved but no ID was returned" },
        { status: 500 }
      );
    }
    
    const dreamId = dreamData.id;

    // ── Synchronous analysis ────────────────────────────────
    // Run the OpenAI analysis inline so the response includes
    // the full result.  This avoids the after() timeout problem
    // on Vercel Hobby (10 s cap).  A single OpenAI call typically
    // finishes in 3-8 s.
    // ────────────────────────────────────────────────────────

    // Admin client for DB writes (bypasses RLS)
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let analysisResult: any = null;

    try {
      // ── 1. Call OpenAI (single call) ──────────────────────
      const analysisRequest = new NextRequest(
        "http://internal-routing/api/openai-analysis",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dream: dream_text,
            topic: "dream interpretation",
          }),
        }
      );

      const analysisResponse = await openAiHandler(analysisRequest);

      if (!analysisResponse.ok) {
        throw new Error(`OpenAI returned ${analysisResponse.status}`);
      }

      analysisResult = JSON.parse(await analysisResponse.text());
      console.log("✅ Analysis complete:", Object.keys(analysisResult).join(", "));

      // ── 2. Build the DB update payload ────────────────────
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

      const bibleRefs = biblicalReferences
        .filter((r: any) => r?.citation)
        .map((r: any) => r.citation.trim());

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
        raw_analysis: analysisResult,
      };

      if (dreamTitle?.trim()) {
        updateData.title = dreamTitle;
      }

      // ── 3. Write analysis to DB ───────────────────────────
      const { error: updateError } = await adminSupabase
        .from("dream_entries")
        .update(updateData)
        .eq("id", dreamId);

      if (updateError) {
        console.error("Error updating dream with analysis:", updateError);
      }

      // ── 4. Store ChatGPT interaction ──────────────────────
      await adminSupabase.from("chatgpt_interactions").insert({
        dream_entry_id: dreamId,
        prompt: `Analyze dream: ${dream_text}`,
        response: JSON.stringify(analysisResult),
        model: "gpt-4o-mini",
        temperature: 0.7,
      });

      // ── 5. Store bible citations ──────────────────────────
      if (biblicalReferences.length > 0) {
        const citations = biblicalReferences
          .map((ref: any, index: number) => {
            if (!ref?.citation) return null;
            const parts = ref.citation
              .trim()
              .match(/([a-zA-Z\s]+)\s+(\d+):(\d+)/);
            if (!parts) return null;
            const [, book, chapter, verse] = parts;
            return {
              dream_entry_id: dreamId,
              bible_book: book.trim(),
              chapter: parseInt(chapter, 10),
              verse: parseInt(verse.split("-")[0], 10),
              full_text: ref.verseText || `Verse text not available`,
              citation_order: index + 1,
            };
          })
          .filter(Boolean);

        if (citations.length > 0) {
          const { error: bibleError } = await adminSupabase
            .from("bible_citations")
            .insert(citations);
          if (bibleError)
            console.error("Error saving Bible citations:", bibleError);
        }
      }

      // ── 6. Kick off image gen in background (non-critical) ─
      after(() => {
        (async () => {
          try {
            const imagePrompt = buildImagePrompt(
              dreamTitle,
              dreamSummary,
              topicSentence
            );
            const imageUrl = await generateAndStoreDreamImage(
              dreamId,
              imagePrompt
            );
            if (imageUrl) {
              await adminSupabase
                .from("dream_entries")
                .update({ image_url: imageUrl })
                .eq("id", dreamId);
              console.log(`🎨 Dream image saved: ${imageUrl}`);
            }
          } catch (imgErr) {
            console.error("🎨 Image generation failed (non-critical):", imgErr);
          }
        })();
      });
    } catch (analysisError) {
      console.error("Analysis failed:", analysisError);
      // Mark the dream so the UI knows analysis failed
      await adminSupabase
        .from("dream_entries")
        .update({
          dream_summary: "Analysis could not be completed at this time.",
        })
        .eq("id", dreamId);
    }

    // Return dream ID + analysis result so the client can render immediately
    return NextResponse.json({
      success: true,
      message: analysisResult
        ? "Dream recorded and analyzed"
        : "Dream recorded but analysis failed",
      id: dreamId,
      analysis: analysisResult,
    });
    
  } catch (error) {
    console.error("Error processing dream submission:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
