---
name: dreamlink-image-gen
description: Reliable dream image generation with retry logic, aesthetic-aware FLUX.2 prompt construction, tier-gated access, and production-grade dead-letter tracking. Triggers on dream image, visualization, dream art, aesthetic, FLUX, image generation, dream picture, image generation failed, retry queue.
---

# Dreamlink Image Generation Skill

## Purpose

This skill provides **reliable, production-grade dream image generation** replacing the current fire-and-forget approach. It orchestrates:

- **Aesthetic-aware prompt engineering**: Combines dream content with curated FLUX.2 presets
- **Tier-gated access**: Free users get SACRED_OIL_PAINTING only; visionary gets 5; prophet gets all 8
- **Exponential backoff retries**: Max 3 attempts with 5→15→60 minute scheduling
- **Dead-letter tracking**: Failed images logged for manual review
- **Subscription validation**: Enforces tier requirements before generation begins
- **Async polling**: Vercel-compatible with configurable timeout
- **Storage integration**: Automatic upload to Supabase dream-images bucket with public URL

---

## Architecture

### Complete Generation Workflow

#### Stage 1: Input Validation
```
Validate request parameters and dream data

Checks:
  ✓ dreamId exists and is valid UUID
  ✓ title/summary/topicSentence present (may be empty but not null)
  ✓ aesthetic (if provided) is valid preset ID
  ✓ dream_entries record exists in Supabase
  ✓ All fields sanitized (no SQL injection, XSS vectors)

Error handling:
  - Missing dreamId → 400 Bad Request
  - Invalid dream_entries lookup → 404 Not Found
  - Malformed UUID → 400 Bad Request
```

#### Stage 2: Subscription Tier Validation
```
Check user subscription against aesthetic tier requirements

Logic:
  1. Fetch user's subscription plan from profiles table
  2. Map plan to aesthetic tier: "prophet" → tier="prophet", etc.
  3. Validate requested aesthetic tier ≤ user tier
  4. If user requests unavailable tier, fall back to highest available

Tier hierarchy:
  Free tier:     Can use SACRED_OIL_PAINTING only
  Visionary:     Can use free + WATERCOLOR_DREAMSCAPE, CELESTIAL_COSMOS, RENAISSANCE_FRESCO
  Prophet:       Can use all 8 aesthetics

Error handling:
  - Profile missing → Use free tier (graceful degradation)
  - Aesthetic not available → Fall back to SACRED_OIL_PAINTING
  - No notification required (transparent to user)
```

#### Stage 3: FLUX Prompt Construction
```
Build aesthetic-aware prompt using dreamlink-image-gen skill

Input:
  - Dream content: { title, summary, topicSentence, symbols (optional) }
  - Aesthetic preset: { id, name, scene_prose_template, style_annotation, ... }
  - Max length: 500 chars

Process (see build-flux-prompt.js for details):
  1. Clean text: Remove trailing punctuation from dream fields
  2. Build subject: title + summary + key symbols
  3. Construct prompt: [Subject]. [Aesthetic Scene]. [Style Annotation]
  4. Enforce max length: Truncate gracefully at sentence or word boundary
  5. Build negative prompt: From aesthetic.negative_prompt_hints

Output:
  {
    prompt: "A sacred garden... Warm golden lighting... Classical oil painting...",
    negative_prompt: "modern, digital, bright colors, ...",
    width: 512,
    height: 512
  }

Key principles:
  - Prose format, not keyword lists (better for FLUX.2 [klein] 9B)
  - Subject first, then aesthetic context
  - Lighting, color, and mood described explicitly
  - Negative hints keep style consistent
  - Very short dreams (no summary) handled with generic fallback subject

Examples:
  Dream: "Walking through clouds"
  → "A figure walking through white clouds. Soft diffused morning light... Ethereal watercolor..."

  Dream: "Ancient temple, glowing symbols, divine presence"
  → "An ancient temple with glowing symbols of divine presence. Warm golden lighting... Classical oil painting..."
```

#### Stage 4: BFL API Submission
```
Submit prompt to FLUX.2 [klein] 9B via Black Forest Labs API

Configuration:
  Endpoint: https://api.bfl.ai/v1/flux-2-klein-9b
  Method: POST
  Auth: x-key header with BFL_API_KEY from .env

Request body:
  {
    "prompt": string (≤500 chars from Stage 3),
    "width": 512,
    "height": 512
  }

Response (if successful):
  {
    "id": "request-uuid",
    "polling_url": "https://api.bfl.ai/v1/get/...",
    "request_timestamp": "2026-03-19T15:30:00Z"
  }

Error handling:
  - Missing BFL_API_KEY → Log warning, return null (graceful disable)
  - API error (non-2xx) → Extract error message, throw with context
  - Malformed response (missing polling_url) → Throw error
  - Network timeout → Caught by outer try/catch, enters retry queue
```

#### Stage 5: Polling with Exponential Backoff
```
Poll BFL API until image is ready or timeout occurs

Timing strategy:
  Initial delay: 500ms (images usually ready in 3-5s)
  Backoff multiplier: 1.3x per poll
  Max delay: 4000ms (caps exponential growth)
  Timeout: 90 seconds (Vercel limit minus buffer)

Polling loop:
  while (Date.now() - startTime < 90_000):
    1. Wait currentDelay milliseconds
    2. GET polling_url with x-key header
    3. Parse response.status:
       - "Queued" or "Running" → Continue polling, increase delay
       - "Ready" → Extract response.result.sample (signed URL), go to Stage 6
       - "Error" or "Failed" → Throw error (will retry)
    4. currentDelay = min(currentDelay * 1.3, 4000)

Retry triggers (enter queue):
  - Timeout: 90s exceeded without "Ready" status
  - Poll error: HTTP error on polling request
  - Status "Error" or "Failed": BFL explicitly failed
  - Network timeout/abort

Log output:
  "🎨 BFL request ID: <uuid>"
  "🎨 BFL status: Queued" (repeat as needed)
  "🎨 BFL status: Ready" (when successful)
```

#### Stage 6: Image Download
```
Download generated image from signed URL provided by BFL

Process:
  1. Fetch signed URL returned from Stage 5
  2. Read response headers: content-type
  3. Convert response to Buffer (binary data)
  4. Detect file extension from content-type header
     - "image/png" → .png
     - "image/webp" → .webp
     - default → .jpg

Error handling:
  - Download HTTP error → Throw error (retry queue)
  - Stream interrupted → Throw error (retry queue)
  - Large file (>10MB) → Logged but continue (unlikely with FLUX.2)
```

#### Stage 7: Supabase Storage Upload
```
Upload downloaded image to Supabase Storage bucket

Bucket: dream-images
Path: {dreamId}/dream-image.{ext}

Configuration:
  - Use admin client (bypasses RLS)
  - Content-Type: Preserve from download response
  - upsert: true (overwrite if exists)

Example path: b3a2f1c9-8d7e-4c2e-9a5f-1d8e7c4a2b9f/dream-image.jpg

Error handling:
  - Storage unavailable → Throw error (retry queue)
  - Permission denied (RLS) → Use admin client (should not happen)
  - Bucket missing → Return error with guidance to create bucket
  - Quota exceeded → Log error (storage limit reached)
```

#### Stage 8: Database Update
```
Update dream_entries.image_url with public URL

Process:
  1. Get public URL from Supabase Storage API (no auth required to read)
  2. UPDATE dream_entries SET image_url = $1 WHERE id = $2
  3. Verify update succeeded

Error handling:
  - Update failed → Log error (non-blocking)
  - Dream entry deleted → Update still fails, handled gracefully
  - RLS violation → Use admin client
```

#### Stage 9: Completion
```
Success response

Returns:
  {
    "imageUrl": "https://...",
    "status": "complete"
  }

Client receives immediate response with image URL.
Dream card displays image immediately.
```

---

## Retry Strategy & Dead-Letter Queue

### Failure Scenario
When any stage fails (timeout, API error, network issue):
1. Catch exception
2. Extract error message
3. Create entry in `image_gen_queue` table
4. Schedule exponential backoff retry
5. Return 500 to client (polled separately, retries happen server-side)

### Retry Configuration

| Attempt | Backoff | When Triggered |
|---------|---------|----------------|
| 1       | Initial | Immediate retry (5 min) |
| 2       | 5 → 15 min | After attempt 1 fails |
| 3       | 15 → 60 min | After attempt 2 fails |
| Dead-letter | N/A | After attempt 3 fails |

### Queue Table Schema
```sql
CREATE TABLE IF NOT EXISTS image_gen_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id UUID NOT NULL REFERENCES dream_entries(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  aesthetic TEXT NOT NULL,
  attempt INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  next_retry_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  CONSTRAINT attempt_range CHECK (attempt >= 1 AND attempt <= 3),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_image_gen_queue_status_retry
  ON image_gen_queue(status, next_retry_at)
  WHERE status IN ('pending', 'failed');
```

### Processing Loop (Server-Side Background)
A background job (cron or queue worker) periodically:
1. `getNextRetry()` → Gets oldest pending entry where next_retry_at ≤ NOW
2. `markProcessing(entryId)` → Updates status to 'processing'
3. Attempts generation using same Stage 4-8 workflow
4. On success: `markCompleted(entryId, imageUrl)` → Updates dream_entries.image_url
5. On failure: `markFailed(entryId, error)` → Reschedules or marks failed
6. Max 3 total attempts (including original request)

### Dead-Letter Review
After 3 failed attempts, entry moves to `status='failed'` and is logged for manual review:
- Dashboard: List all failed entries with error messages
- Admin endpoint: `/api/admin/retry-queue/failed` → Returns failed entries
- Manual action: Re-run specific entry, clear from queue, or debug

---

## Aesthetic Selection & Tier Gating

### 8 Curated Presets

Each preset includes:
- **id**: Kebab-case identifier (sacred_oil_painting, etc.)
- **display_name**: Human-readable name for UI
- **description**: One-sentence overview
- **tier**: free | visionary | prophet
- **scene_prose_template**: Setting/lighting/atmosphere prose
- **style_annotation**: Style + Mood for prompt appending
- **flux_parameters**: guidance_scale, steps (if applicable)
- **color_palette**: Array of hex colors (for design reference)
- **mood_keywords**: Array of mood words for consistency
- **example_prompt_fragment**: Sample usage in full prompt
- **negative_prompt_hints**: What to exclude (for negative prompt)

See `references/aesthetics.json` for full definitions.

### Tier Distribution

**Free (1 preset)**
- SACRED_OIL_PAINTING

**Visionary (5 presets total)**
- SACRED_OIL_PAINTING (carried over)
- STAINED_GLASS
- WATERCOLOR_DREAMSCAPE
- CELESTIAL_COSMOS
- RENAISSANCE_FRESCO

**Prophet (8 presets total)**
- All of Visionary plus:
- SURREAL_PROPHETIC
- ANIME_SACRED
- PHOTOREALISTIC_VISION

### Context-Aware Selection (Pattern 4)

The skill can implement context-aware aesthetic selection:
1. Analyze dream tags/summary for mood
2. Match to aesthetic mood_keywords
3. Return available aesthetics ranked by match quality
4. UI shows "Top 3 for your dream" based on tier

Example:
```
Dream analysis tags: ["sacred", "transformative", "light"]
Mood keywords match:
  ✓ CELESTIAL_COSMOS (transcendent, mystical) [visionary]
  ✓ PHOTOREALISTIC_VISION (intimate, transcendent) [prophet]
  ✓ RENAISSANCE_FRESCO (eternal, divine) [visionary]
→ UI: Show these 3 (user clicks to select)
```

---

## Prompt Construction Guidelines

### Formula
```
[Subject from dream content] + [Aesthetic scene prose] + [Style annotation]
```

### Subject Construction
1. **Title** (if present): Sets the scene
2. **Summary** (truncated to ~120 chars): Adds specific detail
3. **Topic sentence** (fallback): Generic starting point
4. **Key symbols** (up to 2): Visual richness
5. **Fallback**: "A sacred vision" if all empty

Examples:
```
Title: "The Golden Gate"
Summary: "I walked through a shimmering gate, feeling completely safe and supported"
→ Subject: "The Golden Gate. I walked through a shimmering gate, feeling compl..."

Title: (empty)
Summary: (empty)
Topic: "A conversation with an angel"
→ Subject: "A conversation with an angel"

Title: (empty)
Summary: (empty)
Topic: (empty)
→ Subject: "A sacred vision"
```

### Style Annotation Strategy
Each aesthetic provides a full style annotation:
```
"Style: Classical oil painting with layered glazes, visible brushwork...
Mood: Sacred, contemplative, timeless."
```

This is appended verbatim to ensure consistent aesthetic rendering.

### Negative Prompt Strategy
Opposite of the aesthetic:
```
Sacred Oil Painting negative:
  "modern, digital, bright colors, cartoon, anime, photorealistic"

Watercolor Dreamscape negative:
  "photorealistic, realistic, dark, oil painting, watercolor, grayscale"
```

Prevents FLUX from rendering in unintended styles.

### Length Constraint
- Max prompt: 500 characters
- FLUX.2 [klein] 9B responds well to concise, prose-style prompts
- Truncate gracefully at sentence boundary if needed

---

## Error Handling

### Scenario: BFL API Timeout (90s)
```
Occur: Polling loop exhausts 90s timeout
Action: Throw error with message "BFL image generation timed out"
Recovery: Entry added to image_gen_queue with status='pending', next_retry in 5 min
Client: Returns 500 with "Image generation in progress, will complete soon"
```

### Scenario: BFL API Returns Error Status
```
Occur: Polling returns status='Error' or 'Failed'
Action: Throw error with full BFL response for debugging
Recovery: Same as timeout—queue entry created
Difference: Error message includes BFL's error details
```

### Scenario: Supabase Storage Unavailable
```
Occur: Storage upload fails (bucket missing, quota exceeded)
Action: Throw error with context ("Storage upload failed: {reason}")
Recovery: Queue entry created; retry will attempt upload again
Debug: Check Supabase dashboard for storage status
```

### Scenario: Dream Entry Deleted
```
Occur: dream_entries record deleted between request and write
Action: image_entries.image_url update fails silently (non-critical)
Recovery: Logged as warning; image URL stored in queue entry
Rationale: Dream deletion is rare; image persists in queue if user revives
```

### Scenario: User Lacks Tier for Aesthetic
```
Occur: Free user requests CELESTIAL_COSMOS (visionary)
Action: Fall back to SACRED_OIL_PAINTING silently
Recovery: No error thrown; image generated with available aesthetic
Notification: (Optional) Toast: "Using Sacred Oil Painting for your tier"
```

---

## Composition & Dependencies

### Loads from: dreamlink-domain-knowledge
This skill references:
- **Aesthetic metadata**: mood_keywords for context-aware selection
- **Symbol taxonomy**: (optional) To enhance visual descriptions of dream symbols

### Uses: build-flux-prompt.js
Located in `scripts/build-flux-prompt.js`:
- Prompt construction logic
- Aesthetic loading
- Text cleaning and truncation
- CLI testing mode

### Uses: retry-queue.js
Located in `scripts/retry-queue.js`:
- Queue entry creation/management
- Retry scheduling (exponential backoff)
- Dead-letter tracking
- Stats/monitoring

### Triggered by: dreamlink-analysis-pipeline
After dream analysis completes:
```typescript
// In dreamlink-analysis-pipeline SKILL.md
POST /api/dream-image
{
  dreamId: string,
  title: string,
  summary: string,
  topicSentence: string,
  aesthetic?: string  // optional user preference
}
```

---

## API Integration

### POST /api/dream-image

#### Request
```typescript
{
  dreamId: string (UUID),           // Required
  title?: string,                   // Optional
  summary?: string,                 // Optional
  topicSentence?: string,           // Optional
  aesthetic?: string,               // Optional (valid preset ID)
}
```

#### Response (Success)
```json
{
  "imageUrl": "https://...",
  "status": "complete"
}
```

#### Response (Error)
```json
{
  "error": "Image generation failed",
  "status": "error"
}
```

#### Response (Async Retry)
```json
{
  "queued": true,
  "message": "Image generation queued, will retry automatically"
}
```

---

## Configuration & Tuning

### BFL API Parameters
```typescript
const INITIAL_POLL_DELAY_MS = 500;      // Start delay
const BACKOFF_MULTIPLIER = 1.3;         // Exponential factor
const MAX_POLL_DELAY_MS = 4000;         // Cap per poll
const TIMEOUT_MS = 90_000;              // Total timeout (90s)
```

**When to adjust:**
- If images typically ready in <2s: Reduce TIMEOUT_MS to 30s (saves time)
- If timeout too frequent: Increase TIMEOUT_MS to 120s
- If polling too aggressive: Increase INITIAL_POLL_DELAY_MS to 1000
- If polling too passive: Decrease MAX_POLL_DELAY_MS to 2000

### Image Dimensions
```typescript
const IMAGE_WIDTH = 512;
const IMAGE_HEIGHT = 512;
```

**Rationale**: 512×512 is optimal for dream card grid (DreamCard component) and BFL performance. 1024×1024 takes 2-3x longer.

### Retry Backoff Schedule
```javascript
// In retry-queue.js
1: 5 * 60 * 1000,       // Attempt 1 → 5 min
2: 15 * 60 * 1000,      // Attempt 2 → 15 min
3: 60 * 60 * 1000,      // Attempt 3 → 60 min
```

**When to adjust:**
- If network issues rare: Reduce to 1 min, 5 min, 15 min
- If BFL overloaded: Increase to 10 min, 30 min, 120 min
- Monitor dead-letter rate; adjust if >10% failures

---

## Monitoring & Observability

### Log Points
```
🎨 Submitting dream image generation to FLUX.2 [klein] 9B...
🎨 Full prompt: {prompt}
🎨 BFL request ID: {uuid}
🎨 BFL status: {status}
🎨 Downloading generated image...
🎨 Uploading to Supabase Storage: {path}
🎨 Dream image stored successfully: {url}

❌ BFL submit failed ({status}): {error}
❌ BFL generation failed: {error_response}
❌ Image generation timed out after 90 seconds
❌ Storage upload failed: {error}
❌ Failed to update dream image_url: {error}
```

### Queue Stats
```typescript
// Call getQueueStats(supabaseClient) for:
{
  pending: 15,           // Waiting to retry
  processing: 2,         // Currently generating
  completed: 1203,       // Successfully generated
  failed: 8,             // Dead-lettered
  avgWaitTimeMs: 180000  // Avg wait for next retry
}
```

### Alerts to Set
- Failed entries > 5% of completions → Investigate BFL API
- Avg queue wait > 30 min → Increase backoff schedule or parallel workers
- Timeout rate > 10% → Increase TIMEOUT_MS or check BFL status

---

## Testing Checklist

- [ ] Valid dream ID: Image generates and stores successfully
- [ ] Missing dream ID: 400 Bad Request
- [ ] Timeout: Entry created in queue with status='pending'
- [ ] Network error during submission: Queue entry created
- [ ] Storage upload fails: Image still in queue, retry attempts upload
- [ ] Tier gating: Free user requesting visionary aesthetic → Falls back to SACRED_OIL_PAINTING
- [ ] Very short dream: Fallback subject "A sacred vision" works
- [ ] Prompt truncation: 600-char prompt truncates to 500 chars gracefully
- [ ] Negative prompt: Included in FLUX request (verify via BFL API logging)
- [ ] Database update: dream_entries.image_url reflects generated URL
- [ ] Retry after 5 min: Manual cron or background job re-attempts generation
- [ ] Dead-letter review: Failed entries visible in admin panel after 3 attempts
- [ ] Concurrent requests: Multiple dreams queued simultaneously work correctly

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Successful generation | <20 seconds | BFL API + polling + upload |
| Timeout recovery | <5 minutes | First retry, exponential backoff |
| Queue processing | Real-time | Background job checks every 30s |
| Retry success rate | >80% | After backoff, BFL usually ready |
| Dead-letter rate | <5% | Indicates BFL/network issues |
| Storage upload | <1 second | Local operation, fast |
| Database update | <500ms | Simple UPDATE query |

---

## References

- **BFL API**: https://api.bfl.ai/docs/flux.2-klein-9b
- **Supabase Storage**: https://supabase.com/docs/guides/storage
- **FLUX.2 [klein] 9B**: 9B lightweight model, ~3-8s generation at 512×512
- **Aesthetic Presets**: See `references/aesthetics.json`
- **Prompt Builder**: See `scripts/build-flux-prompt.js` for CLI usage
- **Retry Queue**: See `scripts/retry-queue.js` for queue management
- **Image Generation Util**: See `utils/imageGeneration.ts` for current implementation
- **Dream Entry Schema**: See `schema/dream_entries.sql`
