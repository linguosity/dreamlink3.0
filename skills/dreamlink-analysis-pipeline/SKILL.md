---
name: dreamlink-analysis-pipeline
description: Orchestrates the complete dream analysis pipeline including validation, caching, OpenAI analysis, bible citation extraction, and persistent storage. Triggers on dream submission, analysis pipeline, dream interpretation, cached analysis, OpenAI analysis workflow, and dream processing pipeline.
---

# Dreamlink Analysis Pipeline Skill

## Purpose

This skill orchestrates the complete, production-grade dream analysis workflow used throughout Dreamlink. It replaces the monolithic POST handler logic with a modular, composable pipeline that:

- **Validates** dream text for length, format, and content appropriateness
- **Checks persistent cache** (Supabase-backed, 24-hour TTL, replacing in-memory LRU)
- **Profiles user preferences** including reading level and analysis configuration
- **Calls OpenAI** (gpt-5-nano reasoning model) with dynamically constructed prompts
- **Validates responses** against expected JSON schema with error recovery
- **Extracts and verifies** biblical citations with verse text
- **Persists results** across three tables: dream_entries, chatgpt_interactions, bible_citations
- **Triggers image generation** asynchronously via the dreamlink-image-gen skill
- **Monitors token usage** and handles reasoning model constraints

This skill is essential for handling dream submissions from the frontend and provides the foundation for dream analysis across the Dreamlink ecosystem.

---

## Architecture & Sequential Workflow

The pipeline executes the following stages with explicit error handling at each step:

### Stage 1: Input Validation
```
Validates dream_text and optional reading_level

- Check: dream_text is non-null string (400 Bad Request)
- Check: dream_text.trim().length >= MIN_DREAM_LENGTH (currently 10 chars)
- Check: dream_text.length <= MAX_DREAM_LENGTH (currently 10,000 chars)
- Check: no excessive whitespace/repetition (simple heuristic filter)
- Check: reading_level is valid enum if provided

Error handling:
  - Return 400 Bad Request with specific validation error
  - Log failed validation for security monitoring
  - No downstream processing if validation fails
```

### Stage 2: Cache Lookup
```
Checks persistent Supabase-backed analysis cache

- Generate cache key: SHA-256(dream_text + ':' + reading_level || 'default')
- Query analysis_cache table: SELECT * WHERE cache_key = key AND expires_at > NOW()
- Check TTL: if created_at + 24 hours < NOW(), skip cached result

Return handling:
  - Cache hit: Return cached analysis_data immediately (skip OpenAI)
  - Cache miss or expired: Continue to Stage 3
  - Cache error (RLS/auth): Log error, continue to OpenAI (graceful degradation)
```

### Stage 3: Profile Lookup
```
Fetches user profile to determine personalization settings

- Query profiles table: SELECT reading_level, preferences FROM profiles WHERE user_id = current_user_id
- Extract: reading_level (default CELESTIAL_INSIGHT), image_aesthetic, custom_preferences

Use for:
  - Reading level instructions in OpenAI prompt
  - Model selection heuristics (e.g., DIVINE_REVELATION → gpt-5-nano preferred)
  - Response customization (personalized_summary tone, spiritual depth)

Error handling:
  - Profile not found: Use defaults (reading_level = CELESTIAL_INSIGHT)
  - Profile query error: Log and continue with defaults
```

### Stage 4: OpenAI API Call
```
Submits dream to gpt-5-nano with structured JSON schema

Configuration:
  - Model: gpt-5-nano (reasoning model)
  - max_completion_tokens: 4000 (for internal reasoning)
  - temperature: NOT SET (reasoning models ignore this)
  - response_format: { type: "json_schema", ... } (enforces structured output)
  - Timeout: 45 seconds (Vercel's 60s limit minus buffer)

Prompt construction:
  - Base prompt: Dream interpretation instructions
  - Reading level instructions: Appended from dreamlink-domain-knowledge
  - Dream text: Inserted as safe variable (not string interpolation)
  - Analysis focus: Retrieved from profile preferences or defaults

Expected response:
  {
    "topicSentence": string,
    "supportingPoints": string[],
    "conclusionSentence": string,
    "analysis": string,
    "personalizedSummary": string,
    "dreamTitle": string,
    "biblicalReferences": [{
      "citation": "Book Chapter:Verse",
      "book": "Genesis",
      "chapter": 1,
      "verse": 1,
      "endVerse": null,
      "verseText": "In the beginning God created the heavens and the earth."
    }],
    "tags": string[]
  }

Error handling:
  - Response status non-2xx: Log error, return 500 (analysis failed)
  - Empty content (finish_reason="length"): Log warning, return error (increase max_completion_tokens)
  - Response timeout (>45s): Abort and return 500
  - Rate limited (429): Implement exponential backoff (see retry_config)
```

### Stage 5: Response Validation & Repair
```
Validates OpenAI response against schema; attempts JSON repair if malformed

Validation checks:
  - All required fields present: topicSentence, supportingPoints (array), conclusionSentence,
    analysis, personalizedSummary, dreamTitle, biblicalReferences (array), tags (array)
  - topicSentence: non-empty string
  - supportingPoints: array of 1-5 strings, each with bible citation (regex: \([A-Za-z\d\s:]+\))
  - conclusionSentence: non-empty string
  - biblicalReferences: each has citation, book, chapter, verse, verseText
  - tags: 3-5 strings, each 1-3 words, lowercase with underscores
  - dreamTitle: 3-6 words, non-empty

JSON Repair (if validation fails):
  1. Strip markdown fences (``` json ... ```)
  2. Remove control characters (\x00-\x1F)
  3. Normalize whitespace and newlines
  4. Fix trailing commas in arrays/objects
  5. Close truncated structures (add missing } or ])
  6. Attempt JSON.parse() on repaired string
  7. If still invalid, extract partial data via regex fallback

Error handling:
  - Valid after repair: Log warning (repair occurred), use repaired data
  - Invalid even after repair: Log error, return fallback response
  - Fallback: Synthesized analysis with safe defaults (generic supportingPoints, tags)
```

### Stage 6: Bible Citation Extraction & Verification
```
Validates biblical references and prepares for storage

Extraction process:
  1. For each biblicalReference in response:
     - Validate book name (must match canonical names: Genesis, Exodus, Matthew, etc.)
     - Validate chapter/verse numbers (chapter >= 1, verse >= 1)
     - Verify verseText is non-empty (use lookup API if empty)
  2. Filter out references with invalid data
  3. Assign citation_order index

Verification (optional async fallback):
  - If verseText is empty or placeholder, call /api/bible-verses/lookup
  - Cache results to avoid repeated API calls
  - On lookup failure, store available data (citation + chapter:verse still valid)

Error handling:
  - Invalid book name: Log warning, exclude from citations
  - Invalid chapter/verse: Log warning, exclude from citations
  - Lookup API failure: Continue with empty verseText (non-blocking)
```

### Stage 7: Results Storage
```
Persists analysis across three Supabase tables in parallel

Table: dream_entries (UPDATE)
  - dream_summary: First 2 sentences of analysis
  - analysis_summary: Full analysis text
  - topic_sentence: topicSentence from response
  - supporting_points: JSONB array of supportingPoints
  - conclusion_sentence: conclusionSentence from response
  - formatted_analysis: Full formatted analysis text
  - personalized_summary: personalizedSummary from response
  - tags: Array of tags
  - bible_refs: Array of citation strings for quick lookup
  - raw_analysis: Full OpenAI response (JSONB) for debugging/audit
  - title: dreamTitle (if provided and non-empty)

Table: chatgpt_interactions (INSERT)
  - dream_entry_id: Foreign key to dream_entries
  - prompt: Sanitized prompt sent to OpenAI
  - response: Full JSON response from OpenAI (stringified)
  - model: "gpt-5-nano"
  - temperature: null (reasoning models don't use temperature)
  - finish_reason: Extracted from OpenAI response
  - total_tokens: Extracted from usage.total_tokens
  - reasoning_tokens: Extracted from usage.completion_tokens_details.reasoning_tokens

Table: bible_citations (INSERT, if citations exist)
  - dream_entry_id: Foreign key to dream_entries
  - bible_book: Canonical book name
  - chapter: Chapter number
  - verse: Verse number
  - end_verse: End verse (for ranges like "5:17-20"), nullable
  - full_text: Complete verse text
  - citation_order: Order of appearance in analysis

Error handling:
  - dream_entries UPDATE fails: Log error, attempt retry once
  - chatgpt_interactions INSERT fails: Log warning (non-critical, audit trail)
  - bible_citations INSERT fails: Log warning (analysis still valid without citations)
  - RLS violation on write: Use admin client (getAdminClient) to bypass restrictions
  - Partial failure: Record which operations succeeded; inform client of partial completion
```

### Stage 8: Cache Storage
```
Stores analysis in persistent cache for future hits

- Generate same cache key as Stage 2
- INSERT INTO analysis_cache (cache_key, analysis_data, created_at, expires_at)
  WHERE analysis_data = full response JSON
  AND expires_at = NOW() + INTERVAL '24 hours'

Handle cache insertion failure gracefully:
  - Cache storage is not critical to user experience
  - Log warning but continue; next request will re-analyze
```

### Stage 9: Image Generation Trigger (Async)
```
Delegates image generation to dreamlink-image-gen skill (non-blocking)

- Call /api/dream-image with dream_entry_id
- Client-side: Poll /api/dream-image/:id for completion status
- Server-side: Can also use Supabase webhooks or queue if available

Error handling:
  - Image generation failure does NOT block dream submission
  - User sees analysis immediately; image appears when ready
  - Log image generation errors separately for debugging
```

---

## Error Recovery Strategies

### When OpenAI Returns Empty Content
**Scenario**: finish_reason="length", content=""
- **Root cause**: max_completion_tokens too low for reasoning model output
- **Recovery**: Log error with token usage details; return 500 with message "Increase max_completion_tokens"
- **Prevention**: Monitor finish_reason across requests; escalate if >5% rate

### When JSON Parsing Fails
**Scenario**: Response is malformed (incomplete, escaped newlines, truncated)
- **Recovery**:
  1. Strip markdown fences (common LLM wrapper)
  2. Normalize whitespace and fix truncation
  3. Attempt regex extraction of critical fields
  4. Return fallback response if extraction fails
- **Log level**: WARN (recoverable, but data quality may suffer)

### When Supabase Writes Fail
**Scenario**: RLS violation, connection timeout, unique constraint error
- **Recovery**:
  1. If RLS error: Retry with admin client (getAdminClient)
  2. If timeout: Retry once after 1-second delay
  3. If constraint error: Log error, skip that operation
- **Non-critical operations**: Continue execution if non-critical DB ops fail
- **Critical operations**: Return 500 if dream_entries update fails

### When Cache Lookup Fails
**Scenario**: Supabase cache query times out or returns error
- **Recovery**: Treat as cache miss, proceed to OpenAI analysis
- **Rationale**: Cache is optimization, not requirement for correctness

### When Profile Lookup Fails
**Scenario**: Profile doesn't exist or query errors
- **Recovery**: Use hardcoded defaults (reading_level=CELESTIAL_INSIGHT)
- **Rationale**: Analysis is still valuable with generic profile

### When Bible Citation Lookup Fails
**Scenario**: Verse text API unavailable or returns 404
- **Recovery**: Store citation with empty/placeholder verseText
- **Rationale**: Citation itself (book:chapter:verse) is most critical data

---

## Cache Strategy

### Cache Key Generation
```javascript
// Input: dream_text (string), reading_level (string | undefined)
// Output: SHA-256 hex string

const key = crypto.createHash('sha256')
  .update(`${dreamText}:${readingLevel || 'default'}`)
  .digest('hex');
// Example: "a3f2c8d9e1f4b5c6a7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a"
```

### Cache Table Schema
```sql
CREATE TABLE IF NOT EXISTS analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  analysis_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Index for TTL-based cleanup
  CONSTRAINT analysis_cache_ttl CHECK (expires_at > created_at)
);

CREATE INDEX idx_analysis_cache_key_expires
  ON analysis_cache(cache_key, expires_at);

-- Cleanup function (run daily via cron)
-- DELETE FROM analysis_cache WHERE expires_at < NOW();
```

### Cache Hit Probability
- **Same user, repeated dream text**: 100% (exact match)
- **Different users, same dream**: 50-70% (depends on reading_level overlap)
- **Similar but different dreams**: 0% (SHA-256 requires exact match)

### TTL Justification (24 hours)
- **Pro**: Reduces OpenAI API costs; dreams are often processed immediately upon submission
- **Con**: If analysis rules change, old cached results won't reflect new rules
- **Recommendation**: Monitor cache hit rate; adjust TTL based on cost vs. staleness tradeoff

---

## Model Selection Guidance

### gpt-5-nano (Reasoning Model) — Current Choice
**Use cases**:
- Deep dream interpretation with theological nuance
- Complex biblical cross-referencing
- Recommended for PROPHETIC_WISDOM and DIVINE_REVELATION reading levels
- User explicitly requested reasoning/introspection

**Constraints**:
- No custom temperature parameter
- Requires max_completion_tokens (for reasoning budget)
- Tokens consumed for internal reasoning (user doesn't see this)
- Slower than non-reasoning models (5-15s typical)
- Higher cost per token (2x+ vs gpt-4o-mini)

**Configuration**:
```json
{
  "model": "gpt-5-nano",
  "max_completion_tokens": 4000,
  "temperature": null,
  "response_format": { "type": "json_schema", ... }
}
```

### Alternative: gpt-4o-mini (Fast, Budget-Conscious)
**Use cases**:
- RADIANT_CLARITY and CELESTIAL_INSIGHT (simpler analysis)
- High-volume submissions (prioritize throughput)
- Cost-sensitive deployments

**Configuration**:
```json
{
  "model": "gpt-4o-mini",
  "max_tokens": 2000,
  "temperature": 0.7,
  "response_format": { "type": "json_schema", ... }
}
```

**Cost comparison** (rough estimates):
- gpt-5-nano: $0.30 per request (reasoning overhead)
- gpt-4o-mini: $0.08 per request

### Model Routing Logic (Future Expansion)
```typescript
function selectModel(readingLevel: string, costSensitive: boolean): string {
  if (costSensitive) return "gpt-4o-mini";

  switch (readingLevel) {
    case "divine_revelation":
    case "prophetic_wisdom":
      return "gpt-5-nano"; // Deeper reasoning needed
    default:
      return "gpt-4o-mini"; // Fast path for general analysis
  }
}
```

---

## Token Budget & Monitoring

### Max Completion Tokens: 4000
- **Rationale**: Accommodates reasoning overhead + structured output
- **Breakdown** (rough):
  - Internal reasoning: 2000-3000 tokens (user doesn't see)
  - Output (JSON): 500-1000 tokens (actual response)
- **Risk**: If internal reasoning is inefficient, output may be truncated
  - **Signal**: finish_reason="length"
  - **Action**: Increase max_completion_tokens or simplify prompt

### Monitoring Checklist
- **Token usage per request**: Log `usage.prompt_tokens`, `usage.completion_tokens`, `usage.completion_tokens_details.reasoning_tokens`
- **finish_reason distribution**: Alert if >5% of requests have finish_reason="length"
- **Average analysis time**: Target 5-10 seconds per request; log outliers >15s
- **Cache hit rate**: Monitor daily; flag if <20% (possible cache invalidation bug)

---

## Composition & Dependencies

### Loads from: dreamlink-domain-knowledge
This skill composes the domain-knowledge skill to access:
- **Reading level instructions**: Appended to OpenAI prompt to tailor analysis
- **Dream symbol taxonomy**: Referenced in prompt construction
- **Biblical theme mapping**: Used to validate and categorize biblicalReferences

Example usage:
```javascript
// In SKILL.md or referenced knowledge:
// Import reading level instructions based on profile.reading_level
// "Use scholarly theological language for DIVINE_REVELATION..."

// Or in dynamic prompt construction:
// Append domain knowledge facts about key dream symbols detected
```

### Triggers: dreamlink-image-gen
After successful analysis storage (Stage 8), this skill:
1. Extracts key themes from analysis and tags
2. Calls `/api/dream-image` with dream_entry_id, themes, aesthetic preference
3. Generates and caches image asynchronously
4. Returns image URL to client when ready

**Interface contract**:
```typescript
// Request to dreamlink-image-gen
POST /api/dream-image
{
  dream_entry_id: string (UUID),
  analysis: { tags: string[], personalizedSummary: string, dreamTitle: string },
  aesthetic_preference: string // from user profile
}

// Response (async, polling via GET /api/dream-image/:id)
{ image_url: string, status: "pending" | "complete" | "failed" }
```

---

## Usage Example

### Frontend (Next.js Component)
```typescript
// In app/components/DreamForm.tsx
const submitDream = async (dreamText: string) => {
  const res = await fetch('/api/dream-entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dream_text: dreamText,
      reading_level: userProfile.reading_level
    })
  });

  const result = await res.json();

  if (result.success) {
    // Analysis is already complete (synchronous)
    displayDreamAnalysis(result.analysis);

    // Image generation happens client-side asynchronously
    pollImageGeneration(result.id);
  }
};
```

### Backend (This Skill in Action)
```typescript
// In app/api/dream-entries/route.ts (leveraging this skill's pipeline)
export async function POST(request: NextRequest) {
  // Stage 1: Validate input
  const { dream_text, reading_level } = await validateInput(request);

  // Stage 2-3: Check cache and profile
  const cachedAnalysis = await checkCache(dream_text, reading_level);
  if (cachedAnalysis) return cachedAnalysis;

  const profile = await fetchUserProfile();

  // Stage 4-5: Call OpenAI and validate response
  const analysisResult = await callOpenAI(dream_text, profile.reading_level);
  const validated = validateAndRepairAnalysis(analysisResult);

  // Stage 6-7: Extract citations and store results
  const citations = extractBibleCitations(validated.biblicalReferences);
  await storeResults(dream_entry_id, validated, citations);

  // Stage 8-9: Cache and trigger image generation
  await cacheAnalysis(cache_key, validated);
  triggerImageGeneration(dream_entry_id); // Fire and forget

  return { success: true, analysis: validated };
}
```

---

## Configuration & Tuning

### When to Adjust Parameters

**Increase max_completion_tokens if**:
- finish_reason="length" appearing in logs
- Analysis output truncated or incomplete
- User feedback: "Analysis feels rushed or incomplete"
- Trade-off: Slower response time, higher cost

**Decrease max_completion_tokens if**:
- Average request time >15 seconds consistently
- Token usage analysis shows 70%+ reasoning, <30% output
- Need to optimize for speed
- Trade-off: Risk of truncation if analysis is complex

**Adjust cache TTL if**:
- Cache hit rate <20%: Analysis rules probably change frequently; reduce TTL or add invalidation logic
- Cache hit rate >80%: Dream repetition is common in your user base; consider increasing TTL
- Monthly cost reduction goal: Increase TTL to maximize cache reuse

**Model selection**:
- If 60%+ of submissions are RADIANT_CLARITY/CELESTIAL_INSIGHT: Switch to gpt-4o-mini by default, reserve gpt-5-nano for higher levels
- If user feedback indicates analysis is too simple: Switch to gpt-5-nano; measure cost impact

---

## Debugging & Troubleshooting

### Enable Debug Logging
```typescript
// Set in .env.local during development
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('🔍 Dream entry - POST request received');
  console.log('✅ Analysis cache hit');
  console.log('❌ OpenAI API error:', errorData);
}
```

### Common Issues

**Issue**: "Analysis could not be completed at this time"
- **Check**: OpenAI API key valid and quota available
- **Check**: Network connectivity to api.openai.com
- **Check**: max_completion_tokens sufficient (log finish_reason)
- **Check**: Dream text not exceeding OpenAI model's input limits (~8k tokens)

**Issue**: Cache not working (analysis re-run even for same dream)
- **Check**: analysis_cache table exists and has correct schema
- **Check**: Cache key generation matches (SHA-256 of dream_text + reading_level)
- **Check**: TTL logic correct (expires_at comparison)
- **Check**: RLS policies not blocking cache reads

**Issue**: Bible citations missing or incorrect
- **Check**: biblicalReferences validation not too strict (e.g., exact book name matching)
- **Check**: Verse text API (/api/bible-verses/lookup) responding
- **Check**: Citation extraction regex correctly parsing OpenAI output

**Issue**: Image generation not triggering
- **Check**: /api/dream-image endpoint accessible
- **Check**: dream_entry_id passed correctly
- **Check**: dreamlink-image-gen skill is available
- **Check**: Client polling /api/dream-image/:id regularly

---

## Testing Checklist

- [ ] Validate input: Test with empty string, >10k chars, null reading_level
- [ ] Cache hit: Submit same dream twice; verify second is <100ms
- [ ] Cache miss: Modify dream text slightly; verify OpenAI called again
- [ ] OpenAI call: Verify prompt includes reading level instructions
- [ ] Response validation: Verify required fields enforced; optional fields gracefully handled
- [ ] JSON repair: Inject malformed JSON; verify repair attempts before fallback
- [ ] Bible citation extraction: Verify citations extracted and stored correctly
- [ ] Storage: Query dream_entries, chatgpt_interactions, bible_citations; verify data integrity
- [ ] Error handling: Simulate OpenAI timeout; verify graceful error response
- [ ] Image generation: Verify /api/dream-image called; image appears after completion

---

## Performance Targets

- **Cache hit request**: <100ms end-to-end
- **Cache miss (OpenAI call)**: 5-15 seconds (5-8s typical for gpt-5-nano)
- **Total pipeline (including DB writes)**: <20 seconds (P95)
- **Token usage per request**: 500-1000 completion tokens (output only, not internal reasoning)
- **Cache hit rate**: 30-50% (depends on user behavior)

---

## References

- **Supabase RLS & Admin Client**: See getAdminClient() in utils/supabase/admin.ts
- **OpenAI API**: https://platform.openai.com/docs/guides/structured-outputs
- **Dream Entry Schema**: See schema/dream_entries.sql
- **Reading Levels**: See dreamlink-domain-knowledge skill for definitions
- **Image Generation**: See dreamlink-image-gen skill
