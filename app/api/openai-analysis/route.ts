import { NextResponse } from "next/server";
import { ReadingLevel } from "@/schema/profile";

const DEBUG = process.env.NODE_ENV === 'development';

export const runtime = "edge"; // Use Edge Runtime

// Helper function to get reading level instructions
function getReadingLevelInstructions(readingLevel: string): string {
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

export async function POST(request: Request) {
  try {
    if (DEBUG) console.log("🔍 OpenAI Edge Function: Request received");

    const { dream, topic, readingLevel } = await request.json();
    if (DEBUG) console.log(`🔍 Dream content received. Length: ${dream?.length || 0} chars`);
    if (DEBUG) console.log(`🔍 Analysis topic: ${topic || 'general spiritual meaning'}`);
    if (DEBUG) console.log(`🔍 Reading level: ${readingLevel || ReadingLevel.CELESTIAL_INSIGHT}`);

    if (!dream) {
      if (DEBUG) console.log("❌ Error: Dream content is missing");
      return NextResponse.json({ error: "Dream content is required" }, { status: 400 });
    }
    
    // Get reading level instructions
    const readingLevelInstructions = getReadingLevelInstructions(
      readingLevel || ReadingLevel.CELESTIAL_INSIGHT
    );
    
    const prompt = `
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
- Focus analysis on theme: ${topic || 'general spiritual meaning'}
- Keep each supporting point brief but insightful
- Include biblical references (one per supporting point)
- NEVER start with "This dream is about", "Your dream is about", "This dream symbolizes", or "This dream represents"
- Begin directly with the spiritual theme or insight without introductory phrases
- Ensure each supporting point has logical connection to the dream content
- Use parenthetical citations (Book Chapter:Verse)
- Make the concluding sentence actionable but gentle
- Personalize the one-sentence summary to speak directly to the dreamer about their spiritual journey
- Additionally, provide the full Bible verse text for each citation as shown in the example: Genesis 1:1 -> "In the beginning God created the heaven and the earth."

${readingLevelInstructions}
`;

    if (DEBUG) console.log("🔍 Preparing OpenAI API call");
    if (DEBUG) console.log(`🔍 API Key present: ${process.env.OPENAI_API_KEY ? 'Yes (masked)' : 'No'}`);
    
    // Initialize variables to be used across try-catch blocks
    let analysis = '';
    let topicSentence = '';
    let supportingPoints = [];
    let conclusionSentence = '';
    
    try {
      if (DEBUG) console.log("🔍 Sending request to OpenAI API");
      // Abort after 45s to stay within Vercel's 60s function timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45_000);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a biblical dream interpreter who provides concise analysis with scripture references." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "DreamAnalysis", // Add the required name property
              strict: true,
              schema: {
                type: "object",
                properties: {
                  topicSentence: {
                    type: "string"
                  },
                  supportingPoints: {
                    type: "array",
                    items: {
                      type: "string"
                    }
                  },
                  conclusionSentence: {
                    type: "string"
                  },
                  analysis: {
                    type: "string"
                  },
                  personalizedSummary: {
                    type: "string"
                  },
                  dreamTitle: {
                    type: "string"
                  },
                  biblicalReferences: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        citation: {
                          type: "string"
                        },
                        book: {
                          type: "string"
                        },
                        chapter: {
                          type: "integer"
                        },
                        verse: {
                          type: "integer"
                        },
                        endVerse: {
                          type: ["integer", "null"]
                        },
                        verseText: {
                          type: "string"
                        }
                      },
                      additionalProperties: false,
                      required: ["citation", "book", "chapter", "verse", "endVerse", "verseText"]
                    }
                  },
                  tags: {
                    type: "array",
                    items: {
                      type: "string"
                    },
                    minItems: 3,
                    maxItems: 5
                  }
                },
                additionalProperties: false,
                required: ["topicSentence", "supportingPoints", "conclusionSentence", "analysis", "personalizedSummary", "dreamTitle", "biblicalReferences", "tags"]
              }
            }
          }
        }),
      });

      clearTimeout(timeout);
      if (DEBUG) console.log(`🔍 OpenAI API response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ OpenAI API error:", JSON.stringify(errorData));
        return NextResponse.json({ error: "OpenAI API error", details: errorData }, { status: response.status });
      }
      
      const data = await response.json();
      if (DEBUG) console.log(`🔍 OpenAI API response received. Has choices: ${data.choices ? 'yes' : 'no'}`);

      // Log usage to understand reasoning vs completion token split
      if (data.usage && DEBUG) {
        console.log(`🔍 Token usage: prompt=${data.usage.prompt_tokens}, completion=${data.usage.completion_tokens}, reasoning=${data.usage.completion_tokens_details?.reasoning_tokens || 0}`);
      }

      const message = data.choices?.[0]?.message;
      if (DEBUG) console.log(`🔍 Message keys: ${message ? Object.keys(message).join(', ') : 'no message'}`);
      if (DEBUG) console.log(`🔍 Content type: ${typeof message?.content}, length: ${message?.content?.length ?? 'null'}, finish_reason: ${data.choices?.[0]?.finish_reason}`);

      if (!data.choices || message?.content == null) {
        console.error("❌ Invalid response format from OpenAI — content is null/undefined");
        console.error("❌ Full response:", JSON.stringify(data).substring(0, 500));
        return NextResponse.json({ error: "Invalid response from OpenAI" }, { status: 500 });
      }

      // If content is empty string, the model used all tokens for reasoning
      if (message.content === '') {
        console.error("❌ OpenAI returned empty content (reasoning used all tokens). finish_reason:", data.choices[0].finish_reason);
        return NextResponse.json({ error: "Model returned empty response — try increasing max_completion_tokens" }, { status: 500 });
      }

      // Get the content from the message
      const content = message.content;
      if (DEBUG) console.log(`🔍 Content type: ${typeof content}`);
      
      // Parse the content as JSON
      try {
        // Log full content for debugging
        if (typeof content === 'string') {
          if (DEBUG) {
            console.log(`🔍 Content length: ${content.length} characters`);
            console.log(`🔍 Content preview (first 200): ${content.substring(0, 200)}`);
            console.log(`🔍 Content preview (last 200): ${content.substring(content.length - 200)}`);

            // Check for common JSON issues
            const openBraces = (content.match(/{/g) || []).length;
            const closeBraces = (content.match(/}/g) || []).length;
            const openBrackets = (content.match(/\[/g) || []).length;
            const closeBrackets = (content.match(/]/g) || []).length;
            const quotes = (content.match(/"/g) || []).length;

            console.log(`🔍 JSON structure check:`);
            console.log(`   - Open braces: ${openBraces}, Close braces: ${closeBraces}`);
            console.log(`   - Open brackets: ${openBrackets}, Close brackets: ${closeBrackets}`);
            console.log(`   - Quote count: ${quotes} (should be even)`);

            // Log the area around position 2431 where the error occurs
            const errorPosition = 2431;
            const contextStart = Math.max(0, errorPosition - 50);
            const contextEnd = Math.min(content.length, errorPosition + 50);
            console.log(`🔍 Content around error position ${errorPosition}:`);
            console.log(`   "${content.substring(contextStart, contextEnd)}"`);
          }
        }

        let parsedContent;
        
        // Try to parse the content safely
        try {
          parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
          if (DEBUG) console.log(`🔍 Successfully parsed content`);
        } catch (parseError) {
          console.error("❌ JSON parse error:", parseError);
          if (DEBUG) console.log("Attempting to sanitize and repair JSON...");
          
          // Try to repair common JSON issues
          if (typeof content === 'string') {
            if (DEBUG) console.log("🔧 Attempting to repair JSON...");

            // First, try to find where the JSON might be truncated
            let cleaned = content;

            // Check if the JSON appears to be truncated
            const lastChar = cleaned[cleaned.length - 1];
            if (DEBUG) console.log(`🔧 Last character: "${lastChar}"`);

            // If it doesn't end with } or ], it's likely truncated
            if (lastChar !== '}' && lastChar !== ']') {
              if (DEBUG) console.log("🔧 JSON appears truncated. Attempting to close structures...");

              // Count open structures
              const openBraces = (cleaned.match(/{/g) || []).length;
              const closeBraces = (cleaned.match(/}/g) || []).length;
              const openBrackets = (cleaned.match(/\[/g) || []).length;
              const closeBrackets = (cleaned.match(/]/g) || []).length;

              // Try to close any open strings first
              if ((cleaned.match(/"/g) || []).length % 2 !== 0) {
                cleaned += '"';
                if (DEBUG) console.log("🔧 Added closing quote");
              }

              // Close arrays
              for (let i = 0; i < openBrackets - closeBrackets; i++) {
                cleaned += ']';
                if (DEBUG) console.log("🔧 Added closing bracket");
              }

              // Close objects
              for (let i = 0; i < openBraces - closeBraces; i++) {
                cleaned += '}';
                if (DEBUG) console.log("🔧 Added closing brace");
              }
            }

            // Now apply other cleaning
            cleaned = cleaned
              .replace(/[\u0000-\u001F]+/g, '') // Remove control characters
              .replace(/\\n/g, ' ') // Replace literal \n with space
              .replace(/\n/g, ' ') // Replace actual newlines with space
              .replace(/\r/g, '') // Remove carriage returns
              .replace(/\t/g, ' ') // Replace tabs with space
              .replace(/\s+/g, ' ') // Normalize whitespace
              .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
              .replace(/([^\\])\\([^\\"])/g, '$1\\\\$2'); // Fix single backslashes
              
            try {
              parsedContent = JSON.parse(cleaned);
              if (DEBUG) console.log("Successfully parsed cleaned JSON");
            } catch (cleanError) {
              console.error("Failed to parse even after cleaning:", cleanError);
              if (DEBUG) console.log("🔧 Cleaned content preview:", cleaned.substring(0, 500));
              if (DEBUG) console.log("🔧 Cleaned content end:", cleaned.substring(cleaned.length - 200));

              // As a last resort, try to extract what we can
              if (DEBUG) console.log("🔧 Attempting to extract partial data...");

              try {
                // Try to extract individual fields using regex
                const topicMatch = cleaned.match(/"topicSentence"\s*:\s*"([^"]*)"/);
                const topicSentence = topicMatch ? topicMatch[1] : "Your dream contains spiritual symbolism.";

                // Extract supporting points array
                const supportingMatch = cleaned.match(/"supportingPoints"\s*:\s*\[([^\]]*)\]/);
                let supportingPoints = [];
                if (supportingMatch) {
                  const pointsStr = supportingMatch[1];
                  const points = pointsStr.match(/"([^"]*)"/g);
                  supportingPoints = points ? points.map(p => p.replace(/"/g, '')) : [];
                }

                const conclusionMatch = cleaned.match(/"conclusionSentence"\s*:\s*"([^"]*)"/);
                const conclusionSentence = conclusionMatch ? conclusionMatch[1] : "Consider how these insights apply to your life.";

                if (DEBUG) console.log("🔧 Extracted partial data:", { topicSentence, supportingPoints, conclusionSentence });

                // Create a structured response from extracted data
                parsedContent = {
                  topicSentence,
                  supportingPoints: supportingPoints.length > 0 ? supportingPoints : [
                    "The imagery suggests a journey of faith (Psalm 23:4).",
                    "The elements in your dream reflect divine guidance (Proverbs 3:5-6).",
                    "There are signs of spiritual growth and renewal (2 Corinthians 5:17)."
                  ],
                  conclusionSentence,
                  analysis: `${topicSentence} ${supportingPoints.join(' ')} ${conclusionSentence}`,
                  personalizedSummary: "Your dream reveals important spiritual insights for your journey.",
                  dreamTitle: "Spiritual Insight Dream",
                  biblicalReferences: [],
                  tags: ["spiritual journey", "divine guidance", "faith"]
                };

                if (DEBUG) console.log("🔧 Successfully extracted partial data");
              } catch (extractError) {
                console.error("🔧 Failed to extract partial data:", extractError);
                throw new Error("Unable to parse OpenAI response JSON");
              }
            }
          } else {
            throw new Error("Content is not a string and could not be parsed");
          }
        }
        
        // Extract the structured analysis parts from the parsed content
        topicSentence = parsedContent.topicSentence || "Your dream contains spiritual symbolism.";
        supportingPoints = parsedContent.supportingPoints || [];
        conclusionSentence = parsedContent.conclusionSentence || "Consider how these insights apply to your life.";
        
        // Don't add extra periods - the AI already provides proper punctuation
        // Only use the analysis if it's provided, otherwise construct it from components
        analysis = parsedContent.analysis || `${topicSentence} ${supportingPoints.join(' ')} ${conclusionSentence}`;
        const personalizedSummary = parsedContent.personalizedSummary || "Your dream reveals important spiritual insights for your journey.";

        // Also extract biblical references with verse text if available
        const biblicalReferences = parsedContent.biblicalReferences || [];
        
        // Extract tags and dream title from the AI response
        const tags = parsedContent.tags || [];
        const dreamTitle = parsedContent.dreamTitle || "";
        
        if (DEBUG) console.log(`🔍 Analysis structure: Topic sentence, ${supportingPoints.length} points, conclusion, personalized summary, dream title: "${dreamTitle}", ${tags.length} tags`);
        
        return NextResponse.json({
          topicSentence,
          supportingPoints,
          conclusionSentence,
          analysis,
          personalizedSummary,
          dreamTitle,
          biblicalReferences,
          tags
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
          dreamTitle: "Sacred Journey Vision",
          biblicalReferences: [
            {
              citation: "Psalm 23:4",
              book: "Psalm",
              chapter: 23,
              verse: 4,
              endVerse: null,
              verseText: "Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me."
            },
            {
              citation: "Proverbs 3:5-6",
              book: "Proverbs",
              chapter: 3,
              verse: 5,
              endVerse: 6,
              verseText: "Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight."
            },
            {
              citation: "2 Corinthians 5:17",
              book: "2 Corinthians",
              chapter: 5,
              verse: 17,
              endVerse: null,
              verseText: "Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!"
            }
          ],
          tags: ["spiritual journey", "divine guidance", "faith", "transformation", "trust"]
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