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
import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";

// Import the handler directly
import { POST as openAiHandler } from "@/app/api/openai-analysis/route";

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
    // In Vercel production environment, we need to use internal routing
    // Rather than external URLs which can cause issues with authentication
    // and CORS
    let apiUrl;
    
    // In production, just use the API route path directly
    // This should work in Vercel's serverless environment
    // as all functions share the same runtime
    apiUrl = '/api/openai-analysis';
    
    // Log all environment variables to help debug
    console.log('🔎 Environment variables:');
    console.log(`  VERCEL: ${process.env.VERCEL || 'not set'}`);
    console.log(`  VERCEL_ENV: ${process.env.VERCEL_ENV || 'not set'}`);
    console.log(`  VERCEL_URL: ${process.env.VERCEL_URL || 'not set'}`);
    console.log(`  VERCEL_REGION: ${process.env.VERCEL_REGION || 'not set'}`);
    console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`  NEXT_PUBLIC_URL: ${process.env.NEXT_PUBLIC_URL || 'not set'}`);
    
    console.log(`🔍 Calling OpenAI Edge Function at: ${apiUrl}`);
    
    // Define variables outside the try-catch block for accessibility
    let response;
    let rawResponseText;
    let parsedResponse;
    
    try {
      console.log(`🔍 Making fetch request to: ${apiUrl}`);
      console.log(`🔍 Request payload: ${JSON.stringify({
        dream: dreamText.substring(0, 50) + '...',
        topic: 'dream interpretation'
      })}`);
      
      // Create a NextRequest object to pass to the handler directly
      // This completely bypasses the network and directly calls the handler function
      // No URL required, since we're directly calling the function
      const requestBody = JSON.stringify({
        dream: dreamText,
        topic: 'dream interpretation'
      });
      
      // Create a NextRequest object
      // We're using internal API routing here, bypassing external calls entirely
      const nextRequest = new NextRequest('http://internal-routing/api/openai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: requestBody
      });
      
      console.log(`🔍 Calling openAiHandler directly with NextRequest`);
      
      // Call the handler directly
      response = await openAiHandler(nextRequest);
      
      console.log(`🔍 Response status: ${response.status}`);
      console.log(`🔍 Response headers: ${JSON.stringify(Object.fromEntries([...response.headers]))}`);
      
      rawResponseText = await response.text();
      console.log(`🔍 Raw response (first 500 chars): ${rawResponseText.substring(0, 500)}`);
      
      if (!response.ok) {
        console.error(`❌ OpenAI Edge Function error: Status ${response.status}, Raw response: ${rawResponseText}`);
        throw new Error(`Failed to analyze dream: ${response.status} - ${rawResponseText.substring(0, 100)}`);
      }
      
      // Parse the JSON response
      try {
        parsedResponse = JSON.parse(rawResponseText);
        console.log(`✅ Successfully parsed JSON response`);
      } catch (error: unknown) {
        const parseError = error instanceof Error ? error : new Error(String(error));
        console.error(`❌ Failed to parse response as JSON: ${parseError.message}`);
        console.error(`❌ Raw response that failed parsing: ${rawResponseText}`);
        throw new Error(`Failed to parse analysis response: ${parseError.message}`);
      }
    } catch (error: unknown) {
      const fetchError = error instanceof Error ? error : new Error(String(error));
      console.error(`❌ Fetch error:`, fetchError);
      throw fetchError;
    }
    
    // Make sure we have a valid response object to work with
    if (!parsedResponse) {
      throw new Error("No valid response was parsed from the API call");
    }
    
    // Edge function gives us:
    // analysis, topicSentence, supportingPoints, conclusionSentence
    console.log(`✅ Analysis response keys: ${Object.keys(parsedResponse).join(', ')}`);
    
    // Make sure all required properties exist
    if (!parsedResponse.analysis || !parsedResponse.topicSentence || 
        !parsedResponse.supportingPoints || !parsedResponse.conclusionSentence) {
      console.error(`❌ Missing required properties in response:`, parsedResponse);
      throw new Error(`Analysis response missing required properties`);
    }
    
    // Store the response in our local variable
    const analysisResponse = parsedResponse;
    
    // Extract the properties we need
    const { analysis, topicSentence, supportingPoints, conclusionSentence } = analysisResponse;
    
    // Extract biblical references from supporting points
    let biblicalReferences = supportingPoints
      .map((point: string) => {
        const citation = point.match(/\(([^)]+)\)/);
        return citation ? citation[1] : null;
      })
      .filter(Boolean);
    
    // Extract key themes for tags
    const rawTags = analysis
      .toLowerCase()
      .split(/\s+/)
      .filter((word: string) => 
        word.length > 4 && 
        !['this', 'that', 'these', 'those', 'there', 'their', 'about', 'which'].includes(word)
      )
      .slice(0, 10);
    
    // Remove duplicates and limit to 5 tags
    const uniqueTags = Array.from<string>(new Set(rawTags));
    const tags: string[] = uniqueTags.slice(0, 5);
    
    // Construct the formatted analysis - use the analysis directly if available
    // Otherwise construct it from components (which should already have periods)
    const formattedAnalysis = analysis || `${topicSentence} ${supportingPoints.join(' ')} ${conclusionSentence}`;
    
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
    
    // Access the raw OpenAI response directly from analyzeDream's result
    console.log("Checking for biblical references in the raw response...");
    
    // We'll use this to store our verse text lookup
    const openAIRawResponse = { biblicalReferences: [] };
    
    // Try to extract verses from the JSON response - this is our primary method
    try {
      // Make a direct call to our own API with Next.js SDK
      const { POST } = require("@/app/api/openai-analysis/route");
      
      // Create a request with the dream text
      const reqBody = JSON.stringify({
        dream: dreamText,
        topic: "dream interpretation",
      });
      
      // Create a Request object
      const req = new Request("http://internal/api/openai-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: reqBody,
      });
      
      // Call the handler directly
      const response = await POST(req);
      
      // Parse the response
      if (response.ok) {
        const responseText = await response.text();
        const responseData = JSON.parse(responseText);
        
        console.log("OpenAI response keys:", Object.keys(responseData));
        
        // Check if we have biblicalReferences
        if (responseData.biblicalReferences && Array.isArray(responseData.biblicalReferences)) {
          console.log(`Found ${responseData.biblicalReferences.length} Bible verses in structured response`);
          
          // Log each reference for debugging
          responseData.biblicalReferences.forEach((ref: any, idx: number) => {
            console.log(`Ref ${idx+1}:`, ref);
            
            if (ref && typeof ref === 'object' && ref.citation && ref.verseText) {
              openAIRawResponse.biblicalReferences.push({
                citation: ref.citation,
                verseText: ref.verseText
              });
            }
          });
        } else {
          console.log("No structured biblicalReferences found");
        }
      }
    } catch (err) {
      console.log("Error calling internal OpenAI handler:", err);
    }
    
    // If we still don't have verses, try a different approach
    if (openAIRawResponse.biblicalReferences.length === 0) {
      try {
        console.log("Attempting direct OpenAI call to get verse text...");
        
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini-2024-07-18",
            messages: [
              { 
                role: "system", 
                content: "You are a biblical dream interpreter with deep knowledge of Bible verses." 
              },
              { 
                role: "user", 
                content: `
                  Given the Bible references in this dream analysis, provide the full text of each verse:
                  
                  ${biblicalReferences.join(", ")}
                  
                  Return ONLY the verses in this EXACT format for each reference:
                  
                  REFERENCE: [Bible reference]
                  TEXT: [Full verse text]
                `
              }
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0]?.message?.content;
          
          console.log("Direct verse lookup response:", content.substring(0, 100) + "...");
          
          // Parse lines looking for the format "REFERENCE: ... TEXT: ..."
          const lines = content.split('\n');
          let currentRef = '';
          let currentText = '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (trimmedLine.startsWith('REFERENCE:')) {
              // If we already have a reference and text, save it
              if (currentRef && currentText) {
                openAIRawResponse.biblicalReferences.push({
                  citation: currentRef,
                  verseText: currentText
                });
              }
              
              // Start new reference
              currentRef = trimmedLine.replace('REFERENCE:', '').trim();
              currentText = '';
            } else if (trimmedLine.startsWith('TEXT:')) {
              currentText = trimmedLine.replace('TEXT:', '').trim();
            }
          }
          
          // Don't forget the last one
          if (currentRef && currentText) {
            openAIRawResponse.biblicalReferences.push({
              citation: currentRef,
              verseText: currentText
            });
          }
          
          console.log(`Found ${openAIRawResponse.biblicalReferences.length} Bible verses from direct lookup`);
        }
      } catch (err) {
        console.log("Error retrieving Bible verses directly from OpenAI:", err);
      }
    }
    
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
    
    // Update the dream entry with analysis - including raw analysis JSONB
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
        bible_refs: biblicalReferences,
        raw_analysis: analysis // Store the complete analysis response as JSONB
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
    
    // Helper function to expand verse ranges into individual verses
    function expandVerseRange(reference: string): string[] {
      // Match patterns like "Book XX:YY-ZZ" where YY and ZZ are verse numbers
      const rangeMatch = reference.match(/^([a-zA-Z\s]+\s+\d+):(\d+)-(\d+)$/);
      
      if (!rangeMatch) {
        // Not a range, return as is
        return [reference.trim()];
      }
      
      const [, bookChapter, startVerse, endVerse] = rangeMatch;
      const start = parseInt(startVerse, 10);
      const end = parseInt(endVerse, 10);
      
      // Check if it's a valid range
      if (isNaN(start) || isNaN(end) || start > end) {
        console.log(`⚠️ Invalid verse range: ${reference}`);
        return [reference.trim()];
      }
      
      // Expand the range
      const expandedRefs: string[] = [];
      for (let verse = start; verse <= end; verse++) {
        expandedRefs.push(`${bookChapter}:${verse}`);
      }
      
      console.log(`Expanded verse range ${reference} into ${expandedRefs.length} individual verses: ${expandedRefs.join(', ')}`);
      return expandedRefs;
    }
    
    // Store detailed bible citations if any
    if (biblicalReferences.length > 0 || openAIRawResponse.biblicalReferences.length > 0) {
      try {
        // Log what we found from OpenAI
        console.log("Bible refs from supporting points extraction:", biblicalReferences);
        
        // Extract references from the structured biblicalReferences response
        // This is the source of truth that we should use consistently
        const structuredReferences = openAIRawResponse.biblicalReferences
          .filter((ref: any) => ref && ref.citation)
          .map((ref: any) => ref.citation.trim());
        
        console.log("Bible refs from structured response:", structuredReferences);
        
            // We'll create a copy of biblicalReferences that we can freely modify
        // This avoids reassigning to biblicalReferences which might be const
        let updatedBiblicalReferences = [...biblicalReferences];
        
        // If we have structured references, use those instead of the extracted ones
        let referencesToUse = structuredReferences.length > 0 
          ? structuredReferences 
          : updatedBiblicalReferences;
        
        // Save the ranged references for storage in the dream entry
        const rangedReferencesToStore = [...referencesToUse];
        
        // But expand ranges for citation lookup (we'll save them separately)
        let expandedReferences: string[] = [];
        referencesToUse.forEach(ref => {
          const expanded = expandVerseRange(ref);
          expandedReferences = [...expandedReferences, ...expanded];
        });
        
        console.log("Original references:", referencesToUse);
        console.log("Expanded references for citation storage:", expandedReferences);
        
        // Update the dream entry with the correct references if they differ
        if (JSON.stringify(rangedReferencesToStore) !== JSON.stringify(updatedBiblicalReferences)) {
          console.log("Updating dream_entries bible_refs to match structured response");
          
          const { error: updateRefsError } = await supabase
            .from("dream_entries")
            .update({
              bible_refs: rangedReferencesToStore,
            })
            .eq("id", dreamId);
            
          if (updateRefsError) {
            console.error("Error updating bible_refs:", updateRefsError);
          }
          
          // Update our local copy instead of reassigning biblicalReferences
          updatedBiblicalReferences = [...rangedReferencesToStore];
        }
        
        // Also keep track of the expanded references that we'll use for citation DB entries
        const expandedReferenceMapping: Record<string, string[]> = {};
        
        // Create a mapping from original ranged refs to their expanded versions
        referencesToUse.forEach(ref => {
          expandedReferenceMapping[ref] = expandVerseRange(ref);
        });
        
        console.log("Reference expansion mapping:", expandedReferenceMapping);
        
        // Check if we got biblical references with text from our direct calls
        let hasVerseTexts = false;
        
        // Create a map of citation to verse text for easy lookup
        const verseTextMap: Record<string, string> = {};
        
        // Only process if we got valid data from our direct OpenAI calls
        if (openAIRawResponse.biblicalReferences.length > 0) {
          // Log the entire array for debugging
          console.log("Bible references with text:", 
            JSON.stringify(openAIRawResponse.biblicalReferences, null, 2));
          
          // Process each reference
          openAIRawResponse.biblicalReferences.forEach((ref: any) => {
            if (ref && typeof ref === 'object' && ref.citation && ref.verseText) {
              const citation = ref.citation.trim();
              console.log(`Processing verse text for ${citation}: ${ref.verseText.substring(0, 30)}...`);
              
              // Check if this is a verse range
              const isRange = citation.match(/^([a-zA-Z\s]+\s+\d+):(\d+)-(\d+)$/);
              
              if (isRange) {
                // For ranges, store both the full range and each individual verse
                // Store the original range
                verseTextMap[citation] = ref.verseText;
                
                // Also expand the range and store the text for each individual verse
                const expandedRefs = expandVerseRange(citation);
                expandedRefs.forEach(expandedRef => {
                  // For now, each individual verse gets the same text
                  // Ideally we'd get the specific verse text for each, but this is better than nothing
                  verseTextMap[expandedRef] = ref.verseText;
                  console.log(`Added expanded verse text for ${expandedRef}: ${ref.verseText.substring(0, 30)}...`);
                });
              } else {
                // Simple single verse reference
                verseTextMap[citation] = ref.verseText;
              }
              
              hasVerseTexts = true;
            }
          });
          
          // Log the complete verse text map for debugging
          console.log("Complete verse text map keys:", Object.keys(verseTextMap));
        }
        
        if (!hasVerseTexts) {
          console.log("No verse texts found, using fallback lookup");
        }
        
        // Helper function to normalize references consistently
        const normalizeReference = (ref: string): string => {
          return ref.trim().replace(/\s+/g, ' ');
        };
        
        // Create a map of reference to verse text from structured response
        // This is our source of truth
        const structuredVerseMap: Record<string, string> = {};
        
        // Process and normalize all structured references first
        openAIRawResponse.biblicalReferences.forEach((ref: any) => {
          if (ref && ref.citation && ref.verseText) {
            const normalizedRef = normalizeReference(ref.citation);
            structuredVerseMap[normalizedRef] = ref.verseText;
            console.log(`Added structured verse: ${normalizedRef} -> ${ref.verseText.substring(0, 30)}...`);
          }
        });
        
        // Process each reference and create structured data for bible_citations table
        const bibleReferences = updatedBiblicalReferences.map((ref, index) => {
          // Normalize the reference
          const normalizedRef = normalizeReference(ref);
          
          // Split reference into parts (e.g., "Genesis 1:1" -> ["Genesis", "1", "1"])
          const parts = normalizedRef.match(/([a-zA-Z\s]+)\s+(\d+):(\d+)/);
          if (!parts) {
            console.error(`Invalid reference format: ${normalizedRef}`);
            return null;
          }
          
          const [, book, chapter, verse] = parts;
          
          // Try to get verse text from our structured map first (source of truth)
          let verseText = structuredVerseMap[normalizedRef];
          let sourceDesc = "";
          
          if (verseText) {
            sourceDesc = "structured";
            console.log(`✅ Found verse text in structured map for ${normalizedRef}`);
          }
          // Then try the verse text map from other extraction methods
          else if (verseTextMap && verseTextMap[normalizedRef]) {
            verseText = verseTextMap[normalizedRef];
            sourceDesc = "verseTextMap";
            console.log(`✅ Found verse text in verseTextMap for ${normalizedRef}`);
          } 
          // If no match found in our maps, look directly in raw biblicalReferences array
          else if (openAIRawResponse.biblicalReferences.length > 0) {
            // Try a more flexible match - normalize both and compare
            const foundRef = openAIRawResponse.biblicalReferences.find((refObj: any) => {
              if (!refObj?.citation) return false;
              
              // Try various normalization methods
              const refCitation = refObj.citation.trim();
              const normalizedApiRef = refCitation.replace(/\s+/g, ' ');
              const noSpaceApiRef = refCitation.replace(/\s+/g, '');
              
              return normalizedApiRef === normalizedRef || 
                     noSpaceApiRef === normalizedRef.replace(/\s+/g, '') ||
                     normalizedApiRef.includes(normalizedRef) ||
                     normalizedRef.includes(normalizedApiRef);
            });
            
            if (foundRef) {
              console.log(`✅ Found verse text with flexible matching for ${normalizedRef}`);
              verseText = foundRef.verseText;
              sourceDesc = "flexible";
            } else {
              console.log(`❌ Could not find verse text for ${normalizedRef} in OpenAI response`);
            }
          }
          
          // If not found, fall back to our lookup table
          if (!verseText) {
            // Extended fallback lookup table - added all references we've seen
            const BIBLE_VERSES: Record<string, string> = {
              "Genesis 1:1": "In the beginning God created the heaven and the earth.",
              "Psalm 23:1": "The Lord is my shepherd; I shall not want.",
              "Psalm 23:2": "He maketh me to lie down in green pastures: he leadeth me beside the still waters.",
              "Matthew 5:3": "Blessed are the poor in spirit: for theirs is the kingdom of heaven.",
              "John 3:16": "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
              "John 8:12": "Then spake Jesus again unto them, saying, I am the light of the world: he that followeth me shall not walk in darkness, but shall have the light of life.",
              "Exodus 14:21": "And Moses stretched out his hand over the sea; and the LORD caused the sea to go back by a strong east wind all that night, and made the sea dry land, and the waters were divided.",
              "1 Kings 6:19": "And the oracle he prepared in the house within, to set there the ark of the covenant of the LORD.",
              "Isaiah 45:3": "And I will give thee the treasures of darkness, and hidden riches of secret places, that thou mayest know that I, the LORD, which call thee by thy name, am the God of Israel.",
              "Philippians 4:19": "But my God shall supply all your need according to his riches in glory by Christ Jesus.",
              "Galatians 6:7": "Be not deceived; God is not mocked: for whatsoever a man soweth, that shall he also reap.",
              "Deuteronomy 8:10": "When thou hast eaten and art full, then thou shalt bless the LORD thy God for the good land which he hath given thee.",
              // Common verses often in dreams
              "Isaiah 40:31": "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.",
              "Isaiah 40:29": "He giveth power to the faint; and to them that have no might he increaseth strength.",
              "Matthew 11:28": "Come unto me, all ye that labour and are heavy laden, and I will give you rest.",
              "1 Peter 5:7": "Casting all your care upon him; for he careth for you.",
              "Philippians 4:13": "I can do all things through Christ which strengtheneth me.",
              "Jeremiah 29:11": "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end."
            };
            
            // Try exact match first, then normalized
            verseText = BIBLE_VERSES[ref] || BIBLE_VERSES[normalizedRef];
            
            if (verseText) {
              sourceDesc = "fallback";
              console.log(`⚠️ Using fallback verse text for ${normalizedRef}`);
            } else {
              // Final attempt - try with a fuzzy match on the reference
              const fallbackKeys = Object.keys(BIBLE_VERSES);
              const similarKey = fallbackKeys.find(key => 
                key.toLowerCase().includes(normalizedRef.toLowerCase()) || 
                normalizedRef.toLowerCase().includes(key.toLowerCase())
              );
              
              if (similarKey) {
                verseText = BIBLE_VERSES[similarKey];
                sourceDesc = "fallback-fuzzy";
                console.log(`⚠️ Using fuzzy fallback ${similarKey} for ${normalizedRef}`);
              } else {
                console.log(`❌ No verse text available for ${normalizedRef} - using placeholder`);
                verseText = `Verse text not available for ${normalizedRef}`;
                sourceDesc = "missing";
              }
            }
          }
          
          // Log source for debugging
          console.log(`Bible verse for ${normalizedRef}: source=${sourceDesc}, text=${verseText.substring(0, 30)}...`);
          
          // Basic object without the source field (which might not exist yet in the database)
          const citationObject: any = {
            dream_entry_id: dreamId,
            bible_book: book.trim(),
            chapter: parseInt(chapter, 10),
            verse: parseInt(verse.split('-')[0], 10), // Handle verse ranges like 1-3 by taking the first number
            full_text: verseText, // Store the actual verse text
            citation_order: index + 1
          };
          
          // Only add the source field if we're in development mode - indicating this is a special
          // debugging feature that won't cause errors if the column doesn't exist yet
          if (process.env.NODE_ENV === 'development') {
            // We'll log the source rather than trying to store it until the migration runs
            console.log(`Citation source for ${book} ${chapter}:${verse}: ${sourceDesc}`);
          }
          
          return citationObject;
        }).filter(Boolean); // Remove any null entries
        
        if (bibleReferences.length > 0) {
          const { error: bibleError } = await supabase
            .from("bible_citations")
            .insert(bibleReferences);
            
          if (bibleError) {
            console.error("Error saving Bible citations:", bibleError);
          } else {
            console.log("Successfully saved Bible citations with text:", 
              bibleReferences.map(ref => `${ref.bible_book} ${ref.chapter}:${ref.verse} => ${ref.full_text.substring(0, 30)}...`));
          }
        }
      } catch (error) {
        console.error("Error processing biblical references:", error);
        // Continue execution - this is a non-critical error
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