import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

// Schema for validating dream analysis response
const DreamAnalysisSchema = z.object({
  dreamSummary: z.string().min(1),
  topicSentence: z.string().min(1),
  supportingPoints: z.array(z.string()),
  conclusionSentence: z.string().min(1),
  analysisSummary: z.string().min(1),
  formattedAnalysis: z.string().min(1),
  biblicalReferences: z.array(z.string()),
  tags: z.array(z.string())
});

// Type for structured dream analysis response
type DreamAnalysis = z.infer<typeof DreamAnalysisSchema>;

// Function to analyze dream with OpenAI using our Edge Function
async function analyzeDream(dreamText: string): Promise<DreamAnalysis> {
  try {
    // Call our Edge Function API with absolute URL
    // In server-to-server communication, we need a full URL
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const apiUrl = new URL('/api/openai-analysis', baseUrl).toString();
    
    console.log(`🔍 Calling OpenAI Edge Function at: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dream: dreamText,
        topic: 'dream interpretation'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI Edge Function error:", errorData);
      throw new Error("Failed to analyze dream");
    }

    const analysisResponse = await response.json();
    
    // Edge function gives us:
    // analysis, topicSentence, supportingPoints, conclusionSentence
    const { analysis, topicSentence, supportingPoints, conclusionSentence } = analysisResponse;
    
    // Extract biblical references from supporting points
    const biblicalReferences = supportingPoints
      .map(point => {
        const citation = point.match(/\(([^)]+)\)/);
        return citation ? citation[1] : null;
      })
      .filter(Boolean);
    
    // Extract key themes for tags
    const rawTags = analysis
      .toLowerCase()
      .split(/\s+/)
      .filter(word => 
        word.length > 4 && 
        !['this', 'that', 'these', 'those', 'there', 'their', 'about', 'which'].includes(word)
      )
      .slice(0, 10);
    
    // Remove duplicates and limit to 5 tags
    const tags = [...new Set(rawTags)].slice(0, 5);
    
    // Construct the formatted analysis
    const formattedAnalysis = `${topicSentence}. ${supportingPoints.join('. ')}. ${conclusionSentence}.`;
    
    // Create dream summary from first part of analysis
    const dreamSummary = analysis.split('.').slice(0, 2).join('.') + '.';
    
    return {
      dreamSummary,
      topicSentence,
      supportingPoints,
      conclusionSentence,
      analysisSummary: analysis,
      formattedAnalysis,
      biblicalReferences,
      tags
    };
  } catch (error) {
    console.error("Error calling OpenAI Edge Function:", error);
    
    // Fallback to a basic structure if analysis fails
    return {
      dreamSummary: "Dream analysis could not be properly formatted.",
      topicSentence: "This dream may contain meaningful symbolic elements.",
      supportingPoints: [],
      conclusionSentence: "Consider the emotions and symbols in this dream for personal insight.",
      analysisSummary: "The analysis service encountered an error. Please try again later.",
      formattedAnalysis: "This dream may contain meaningful symbolic elements. Consider the emotions and symbols in this dream for personal insight.",
      biblicalReferences: [],
      tags: ["error", "analysis-failed"]
    };
  }
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
  const supabase = await createClient();
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
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
    
    // Generate a title from the first 50 characters
    const title = dream_text.substring(0, 50) + (dream_text.length > 50 ? "..." : "");
    
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
    
    // No await here to prevent blocking the response
    analyzeAndUpdateDream(supabase, dreamId, dream_text, user.id).catch(error => {
      console.error(`Background analysis failed for dream ${dreamId}:`, error);
    });
    
    // Return success with the created dream ID immediately
    return NextResponse.json({ 
      success: true,
      message: "Dream recorded successfully and analysis started",
      id: dreamId
    });
    
  } catch (error) {
    console.error("Error processing dream submission:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Background analysis function that updates the dream entry when complete
async function analyzeAndUpdateDream(supabase: any, dreamId: string, dreamText: string, userId: string) {
  try {
    // Call OpenAI to analyze the dream with structured JSON response
    const analysis = await analyzeDream(dreamText);
    const { 
      dreamSummary, 
      analysisSummary, 
      topicSentence,
      supportingPoints,
      conclusionSentence,
      formattedAnalysis, 
      biblicalReferences, 
      tags 
    } = analysis;
    
    // Update the dream entry with analysis
    const { error: updateError } = await supabase
      .from("dream_entries")
      .update({
        dream_summary: dreamSummary,
        analysis_summary: analysisSummary,
        topic_sentence: topicSentence,
        supporting_points: supportingPoints,
        conclusion_sentence: conclusionSentence,
        formatted_analysis: formattedAnalysis,
        tags: tags,
        bible_refs: biblicalReferences
      })
      .eq("id", dreamId);
      
    if (updateError) {
      console.error("Error updating dream with analysis:", updateError);
      throw updateError;
    }
    
    // Store the ChatGPT interaction
    const { error: chatGptError } = await supabase
      .from("chatgpt_interactions")
      .insert({
        dream_entry_id: dreamId,
        prompt: `Analyze dream: ${dreamText}`,
        response: JSON.stringify(analysis),
        model: "gpt-4o-mini-2024-07-18",
        temperature: 0.7
      });
      
    if (chatGptError) {
      console.error("Error saving ChatGPT interaction:", chatGptError);
    }
    
    // Store detailed bible citations if any
    if (biblicalReferences.length > 0) {
      // Process each reference and create structured data for bible_citations table
      const bibleReferences = biblicalReferences.map((ref, index) => {
        // Split reference into parts (e.g., "Genesis 1:1" -> ["Genesis", "1", "1"])
        const parts = ref.match(/([a-zA-Z\s]+)\s+(\d+):(\d+)/);
        if (!parts) return null;
        
        const [, book, chapter, verse] = parts;
        
        return {
          dream_entry_id: dreamId,
          bible_book: book.trim(),
          chapter: parseInt(chapter, 10),
          verse: parseInt(verse.split('-')[0], 10), // Handle verse ranges like 1-3 by taking the first number
          full_text: ref,
          citation_order: index + 1
        };
      }).filter(Boolean); // Remove any null entries
      
      if (bibleReferences.length > 0) {
        const { error: bibleError } = await supabase
          .from("bible_citations")
          .insert(bibleReferences);
          
        if (bibleError) {
          console.error("Error saving Bible citations:", bibleError);
        }
      }
    }
    
    console.log(`Successfully analyzed and updated dream ${dreamId}`);
  } catch (error) {
    console.error(`Analysis failed for dream ${dreamId}:`, error);
    
    // Update with error message
    await supabase
      .from("dream_entries")
      .update({
        dream_summary: "Analysis could not be completed at this time."
      })
      .eq("id", dreamId);
  }
}