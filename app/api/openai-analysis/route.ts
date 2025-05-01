import { NextResponse } from "next/server";

export const runtime = "edge"; // Use Edge Runtime

export async function POST(request: Request) {
  try {
    console.log("🔍 OpenAI Edge Function: Request received");
    
    const { dream, topic } = await request.json();
    console.log(`🔍 Dream content received. Length: ${dream?.length || 0} chars`);
    console.log(`🔍 Analysis topic: ${topic || 'general spiritual meaning'}`);
    
    if (!dream) {
      console.log("❌ Error: Dream content is missing");
      return NextResponse.json({ error: "Dream content is required" }, { status: 400 });
    }
    
    const prompt = `
You are a dream interpreter specializing in Christian biblical interpretation.

Analyze the following dream, connecting it to biblical themes, symbols, and scriptures:
"${dream}"

Format your analysis using this exact structure:
1. Start with a topic sentence that captures the main spiritual theme of the dream.
2. Provide exactly 3 supporting points. Each point should include a direct Bible citation in parentheses.
3. End with a concluding sentence that provides guidance based on the dream's meaning.

Example format:
"This dream reflects God's promise of provision in times of uncertainty. The water symbolizes God's spirit bringing renewal (Isaiah 44:3), while the mountain represents the challenges you're facing (Zechariah 4:7), and the light breaking through suggests divine intervention (John 1:5). Consider how God might be preparing you for upcoming changes that require faith and trust."

Additional instruction:
- Focus analysis on theme: ${topic || 'general spiritual meaning'}
- Keep each supporting point brief but insightful
- Include exactly 3 biblical references (one per supporting point)
- Ensure each supporting point has logical connection to the dream content
- Use parenthetical citations (Book Chapter:Verse)
- Make the concluding sentence actionable but gentle
- Total response should be 4 sentences total: topic, 3 supports with citations, conclusion
`;

    console.log("🔍 Preparing OpenAI API call");
    console.log(`🔍 API Key present: ${process.env.OPENAI_API_KEY ? 'Yes (masked)' : 'No'}`);
    
    // Initialize variables to be used across try-catch blocks
    let analysis = '';
    let topicSentence = '';
    let supportingPoints = [];
    let conclusionSentence = '';
    
    try {
      console.log("🔍 Sending request to OpenAI API");
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-2024-07-18", // Latest model
          messages: [
            { role: "system", content: "You are a biblical dream interpreter who provides concise analysis with scripture references." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 500,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "DreamAnalysis", // Add the required name property
              strict: true,
              schema: {
                type: "object",
                properties: {
                  topicSentence: {
                    type: "string",
                    description: "A single sentence that captures the main spiritual theme of the dream"
                  },
                  supportingPoints: {
                    type: "array",
                    items: {
                      type: "string",
                      description: "A supporting point with a biblical citation in parentheses"
                    },
                    description: "Exactly three supporting points with biblical citations"
                  },
                  conclusionSentence: {
                    type: "string",
                    description: "A concluding sentence that provides guidance based on the dream's meaning"
                  },
                  analysis: {
                    type: "string",
                    description: "The complete analysis text combining all elements"
                  }
                },
                additionalProperties: false,
                required: ["topicSentence", "supportingPoints", "conclusionSentence", "analysis"]
              }
            }
          }
        }),
      });

      console.log(`🔍 OpenAI API response status: ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ OpenAI API error:", JSON.stringify(errorData));
        return NextResponse.json({ error: "OpenAI API error", details: errorData }, { status: response.status });
      }

      console.log("✅ OpenAI API response received successfully");
      const data = await response.json();
      console.log("✅ OpenAI API response parsed:", JSON.stringify(data).substring(0, 100) + "...");
      
      // With JSON schema response format, we might need to parse the JSON content
      let structuredResponse;
      
      try {
        // First check if content is already a parsed object (newer API versions)
        if (typeof data.choices[0].message.content === 'object') {
          structuredResponse = data.choices[0].message.content;
        } else {
          // Otherwise try to parse it as JSON string (older API versions)
          const messageContent = data.choices[0].message.content;
          structuredResponse = JSON.parse(messageContent);
        }
        console.log("✅ Structured JSON response processed:", JSON.stringify(structuredResponse).substring(0, 100) + "...");
      } catch (parseError) {
        console.error("❌ Error parsing structured response:", parseError);
        // Instead of throwing, provide a fallback response
        structuredResponse = {
          analysis: "Unable to process dream analysis due to formatting error.",
          topicSentence: "Your dream contains meaningful symbolic elements.",
          supportingPoints: [
            "Dreams often reflect our inner thoughts (Proverbs 23:7)",
            "Symbols in dreams can have personal significance (Genesis 41:25)",
            "Biblical wisdom can help interpret dream meanings (Daniel 2:28)"
          ],
          conclusionSentence: "Consider journaling about this dream to explore its personal meaning."
        };
      }
      
      // Extract the structured fields directly (with safer assignment)
      analysis = structuredResponse.analysis || '';
      topicSentence = structuredResponse.topicSentence || '';
      supportingPoints = structuredResponse.supportingPoints || [];
      conclusionSentence = structuredResponse.conclusionSentence || '';
      
      console.log(`✅ Topic sentence: ${topicSentence}`);
      console.log(`✅ Supporting points: ${supportingPoints.length} received`);
      console.log(`✅ Conclusion: ${conclusionSentence}`);
      console.log(`✅ Analysis length: ${analysis?.length || 0} chars`);
      
    } catch (error: unknown) {
      const fetchError = error instanceof Error ? error : new Error(String(error));
      console.error("❌ Error during OpenAI API fetch:", fetchError);
      return NextResponse.json({ 
        error: "Failed to call OpenAI API", 
        details: fetchError.message 
      }, { status: 500 });
    }
    
    console.log("✅ Preparing response");
    
    // Since we're using JSON schema response, everything is already structured correctly
    const response = {
      analysis,
      topicSentence,
      supportingPoints,
      conclusionSentence,
      formatted: true
    };
    
    console.log("✅ Response ready to send");
    
    return NextResponse.json(response);

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('❌ OpenAI API error:', err);
    return NextResponse.json(
      { error: 'Failed to analyze dream', details: err.message },
      { status: 500 }
    );
  }
}