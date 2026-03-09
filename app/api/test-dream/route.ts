import { NextResponse } from "next/server";

const DEBUG = process.env.NODE_ENV === 'development';

export async function POST(request: Request) {
  try {
    if (DEBUG) console.log("🧪 Test dream API endpoint called");

    const body = await request.json();
    const { dream_text } = body;

    if (!dream_text) {
      return NextResponse.json({ error: "Dream text is required" }, { status: 400 });
    }

    if (DEBUG) console.log("🧪 Dream text received:", dream_text.substring(0, 50) + "...");

    // Test OpenAI call directly
    try {
      if (DEBUG) console.log("🧪 Testing OpenAI API call...");
      if (DEBUG) console.log("🧪 OpenAI API Key exists:", !!process.env.OPENAI_API_KEY);
      if (DEBUG) console.log("🧪 OpenAI API Key length:", process.env.OPENAI_API_KEY?.length || 0);
      
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a test assistant. Respond with 'API Working' and the word count of the input." },
            { role: "user", content: dream_text }
          ],
          temperature: 0.3,
          max_tokens: 50,
        }),
      });
      
      if (DEBUG) console.log("🧪 OpenAI response status:", response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error("🧪 OpenAI error:", errorData);
        return NextResponse.json({
          error: "OpenAI API error",
          status: response.status,
          details: errorData
        }, { status: 500 });
      }
      
      const data = await response.json();
      if (DEBUG) console.log("🧪 OpenAI response:", data);
      
      return NextResponse.json({
        success: true,
        message: "OpenAI API test successful",
        response: data.choices[0]?.message?.content || "No content",
        usage: data.usage
      });
      
    } catch (error) {
      console.error("🧪 OpenAI test error:", error);
      return NextResponse.json({
        error: "OpenAI test failed",
        message: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error("🧪 Test endpoint error:", error);
    return NextResponse.json({
      error: "Test endpoint failed",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}