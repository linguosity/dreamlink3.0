import { createClient } from "@/utils/supabase/server";
import { NextResponse, NextRequest } from "next/server";
import { FeatureFlag, isFeatureEnabled } from "@/utils/feature-flags";
import { decryptDreamRow } from "@/lib/crypto";

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * API route for searching dream entries
 * This is a stub for future implementation of server-side search
 */
export async function GET(request: NextRequest) {
  // Get the Supabase client
  const supabase = await createClient();
  
  // Check if server search is enabled
  const isServerSearchEnabled = process.env.NEXT_PUBLIC_FEATURE_SERVER_SEARCH === 'true';
  
  if (!isServerSearchEnabled) {
    return NextResponse.json(
      { error: "Server-side search is not enabled" },
      { status: 404 }
    );
  }
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized: You must be logged in to search dreams" },
      { status: 401 }
    );
  }
  
  try {
    // Get search parameters
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const cursor = url.searchParams.get('cursor') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    // If no query, return an error
    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    // Attempt full-text search using the search_vector column
    let dreamQuery = supabase
      .from("dream_entries")
      .select("*")
      .eq("user_id", user.id)
      .textSearch('search_vector', query, { type: 'websearch', config: 'english' })
      .order('created_at', { ascending: false })
      .limit(limit);

    // Add cursor pagination if provided
    if (cursor) {
      dreamQuery = dreamQuery.gt('id', cursor);
    }

    // Execute the FTS query
    let { data: dreams, error } = await dreamQuery;

    // Handle errors
    if (error) {
      console.error("Error searching dreams with FTS:", error);
      return NextResponse.json(
        { error: "Failed to search dreams" },
        { status: 500 }
      );
    }

    // If FTS returns no results, fall back to ILIKE search over
    // the columns that are still plaintext (original_text is now encrypted
    // and not searchable via ILIKE).
    if (!dreams || dreams.length === 0) {
      let fallbackQuery = supabase
        .from("dream_entries")
        .select("*")
        .eq("user_id", user.id)
        .or(`title.ilike.%${query}%, dream_summary.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (cursor) {
        fallbackQuery = fallbackQuery.gt('id', cursor);
      }

      const fallbackResult = await fallbackQuery;
      dreams = fallbackResult.data;

      if (fallbackResult.error) {
        console.error("Error in fallback ILIKE search:", fallbackResult.error);
        return NextResponse.json(
          { error: "Failed to search dreams" },
          { status: 500 }
        );
      }
    }

    const decrypted = (dreams || []).map((row) => decryptDreamRow({ ...row }));

    return NextResponse.json({
      results: decrypted,
      nextCursor: decrypted.length === limit ? decrypted[decrypted.length - 1].id : null
    });
    
  } catch (error) {
    console.error("Error processing search request:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}