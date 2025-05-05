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
- Additionally, provide the full Bible verse text for each citation as shown in the example: Genesis 1:1 -> "In the beginning God created the heaven and the earth."
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
                  },
                  biblicalReferences: {
                    type: "array",
                    description: "Array of all biblical references extracted from the supporting points",
                    items: {
                      type: "object",
                      properties: {
                        citation: {
                          type: "string",
                          description: "The Bible citation (e.g., 'Genesis 1:1')"
                        },
                        verseText: {
                          type: "string", 
                          description: "The actual text of the Bible verse"
                        }
                      },
                      additionalProperties: false,
                      required: ["citation", "verseText"]
                    }
                  }
                },
                additionalProperties: false,
                required: ["topicSentence", "supportingPoints", "conclusionSentence", "analysis", "biblicalReferences"]
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
      
      const data = await response.json();
      console.log(`🔍 OpenAI API response received. Has choices: ${data.choices ? 'yes' : 'no'}`);
      
      if (!data.choices || !data.choices[0]?.message?.content) {
        console.error("❌ Invalid response format from OpenAI");
        return NextResponse.json({ error: "Invalid response from OpenAI" }, { status: 500 });
      }
      
      // Get the content from the message
      const content = data.choices[0].message.content;
      console.log(`🔍 Content type: ${typeof content}`);
      
      // Parse the content as JSON
      try {
        // Log a preview of the content for debugging
        if (typeof content === 'string') {
          console.log(`🔍 Content preview: ${content.substring(0, 100)}...`);
        }
        
        let parsedContent;
        
        // Try to parse the content safely
        try {
          parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
          console.log(`🔍 Successfully parsed content`);
        } catch (parseError) {
          console.error("❌ JSON parse error:", parseError);
          console.log("Attempting to sanitize and repair JSON...");
          
          // Try to repair common JSON issues
          if (typeof content === 'string') {
            // Try to clean up the JSON string before parsing
            const cleaned = content
              .replace(/[\u0000-\u001F]+/g, '') // Remove control characters
              .replace(/\\/g, '\\\\') // Escape backslashes
              .replace(/"\s+([^"]*)\s+"/g, '"$1"') // Fix spacing in strings
              .replace(/([^\\])\\([^\\"])/g, '$1\\\\$2') // Fix single backslashes
              .replace(/\\'/g, "'") // Replace escaped single quotes
              .replace(/(\r\n|\n|\r)/gm, ''); // Remove newlines
              
            try {
              parsedContent = JSON.parse(cleaned);
              console.log("Successfully parsed cleaned JSON");
            } catch (cleanError) {
              console.error("Failed to parse even after cleaning:", cleanError);
              throw new Error("Unable to parse OpenAI response JSON");
            }
          } else {
            throw new Error("Content is not a string and could not be parsed");
          }
        }
        
        // Extract the structured analysis parts from the parsed content
        topicSentence = parsedContent.topicSentence || "Your dream contains spiritual symbolism.";
        supportingPoints = parsedContent.supportingPoints || [];
        conclusionSentence = parsedContent.conclusionSentence || "Consider how these insights apply to your life.";
        analysis = parsedContent.analysis || `${topicSentence} ${supportingPoints.join(' ')} ${conclusionSentence}`;

        // Also extract biblical references with verse text if available
        const biblicalReferences = parsedContent.biblicalReferences || [];
        
        console.log(`🔍 Analysis structure: Topic sentence, ${supportingPoints.length} points, conclusion`);
        
        return NextResponse.json({
          topicSentence,
          supportingPoints,
          conclusionSentence,
          analysis,
          biblicalReferences
        });
      } catch (error) {
        console.error("❌ Error parsing content from OpenAI:", error);
        
        // Return a fallback response rather than an error to keep the app working
        return NextResponse.json({
          topicSentence: "Your dream contains spiritual symbolism.",
          supportingPoints: [
            "The imagery suggests a journey of faith (Psalm 23:4).",
            "The elements in your dream reflect divine guidance (Proverbs 3:5-6).",
            "There are signs of spiritual growth and renewal (2 Corinthians 5:17)."
          ],
          conclusionSentence: "Consider how these insights might apply to your current life circumstances.",
          analysis: "Your dream contains spiritual symbolism. The imagery suggests a journey of faith (Psalm 23:4). The elements in your dream reflect divine guidance (Proverbs 3:5-6). There are signs of spiritual growth and renewal (2 Corinthians 5:17). Consider how these insights might apply to your current life circumstances.",
          biblicalReferences: [
            {
              citation: "Psalm 23:4",
              verseText: "Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me."
            },
            {
              citation: "Proverbs 3:5-6",
              verseText: "Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight."
            },
            {
              citation: "2 Corinthians 5:17",
              verseText: "Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!"
            }
          ]
        });
      }
    } catch (error) {
      console.error("❌ Error calling OpenAI API:", error);
      return NextResponse.json({ error: "Failed to analyze dream" }, { status: 500 });
    }
  } catch (error) {
    console.error("❌ Unexpected error in OpenAI Edge Function:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}