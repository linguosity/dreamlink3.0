# Dreamlink Dev Log #001 — March 7-8, 2026

> **Session focus:** Debugging dream analysis pipeline, fixing profile queries, switching from pnpm to npm, creating missing pages.
>
> **Status at end of session:** Dream insert works. OpenAI call returns 200 but content parsing fails due to reasoning model behavior. Awaiting next deploy + test.

---

## What We Fixed

### 1. Profile / Subscription Query (FIXED — deployed)

**Symptom:** Console logged `"Profile data not found, using default tier"` on every page load. Supabase returned 400.

**Root cause:** Two separate bugs stacked on each other:

- `UserAvatar.tsx` queried `profile.subscription_tier` — but the `profile` table has no `subscription_tier` column. Subscriptions live in the `subscriptions` table.
- Both `UserAvatar.tsx` and `settings/page.tsx` used `.eq('id', user.id)` — but `id` is the profile table's own auto-generated PK. The correct foreign key column is `user_id`.

**Fix:** Changed `UserAvatar.tsx` to query `subscriptions` table with `.eq('user_id', data.user.id).eq('status', 'active').maybeSingle()`. Fixed `settings/page.tsx` in two places to use `.eq('user_id', user.id)`.

**Files changed:** `components/UserAvatar.tsx`, `app/settings/page.tsx`

### 2. Dream Analysis Architecture (FIXED — deployed)

**Symptom:** Infinite polling loop on the frontend. Vercel logs showed the `after()` callback getting killed mid-OpenAI-call. Dreams stuck permanently in "analyzing" state.

**Root cause:** The old architecture used Next.js `after()` to run analysis in a background callback after the HTTP response was sent. On Vercel Hobby plan (10s timeout for serverless functions), the callback was killed before OpenAI could respond. The function also made **three redundant OpenAI calls** (analyze, get verse texts, fallback verse lookup).

**Fix:** Restructured `dream-entries/route.ts` POST handler to run analysis **synchronously** — single OpenAI call inline, DB writes inline, returns full analysis in the response body. Only image generation remains in `after()` (non-critical). Removed ~540 lines of dead code from the old triple-call approach.

**Files changed:** `app/api/dream-entries/route.ts`, `components/CompactDreamInput.tsx`

### 3. OpenAI API Parameter Errors (FIXED — deployed)

**Symptom:** OpenAI returned 400 errors that were silently swallowed.

**Root cause:** `gpt-5-nano-2025-08-07` is a reasoning model with restricted parameters:
- `max_tokens` → must use `max_completion_tokens` instead
- `temperature: 0.7` → only default (1.0) is supported

**Fix:** Changed `max_tokens: 2000` to `max_completion_tokens: 4000` and removed the `temperature` parameter entirely.

**File changed:** `app/api/openai-analysis/route.ts`

### 4. Reasoning Model Empty Content (FIXED — deployed, awaiting test)

**Symptom:** OpenAI returns 200 with `choices[0].message.content: ""`. Our code checked `!content` which is truthy for empty string, so it rejected a technically valid response.

**Root cause:** `gpt-5-nano` is a reasoning model that allocates completion tokens to internal chain-of-thought first, then uses remaining tokens for visible content. With 2000 tokens, reasoning could consume everything.

**Fix:** Changed falsy check to `== null` (catches null/undefined but not empty string). Added separate empty-string check with descriptive error. Bumped `max_completion_tokens` to 4000. Added token usage logging (prompt / completion / reasoning breakdown).

**File changed:** `app/api/openai-analysis/route.ts`

### 5. Missing Pages — 404s (FIXED — deployed)

**Symptom:** Browser dev tools showed 404s for `/about`, `/help`, `/contact`, `/privacy`.

**Root cause:** These routes were linked from the footer (`app/page.tsx`, `app/landing/page.tsx`) and nav dropdowns (`components/header-auth.tsx`, `components/AuthDropdown.tsx`) but no page components existed.

**Fix:** Created all four pages as simple server components.

**Files created:** `app/about/page.tsx`, `app/help/page.tsx`, `app/contact/page.tsx`, `app/privacy/page.tsx`

### 6. Build System — pnpm to npm (FIXED — deployed)

**Symptom:** Vercel build failed with `ERR_INVALID_THIS` on every npm registry request because it was running `pnpm install`.

**Root cause:** `vercel.json` had `"installCommand": "pnpm install"` and the repo contained a `pnpm-lock.yaml`. We deleted the lockfile earlier but never generated `package-lock.json` or updated `vercel.json`.

**Fix:** Changed `vercel.json` to `"installCommand": "npm install"`, generated and committed `package-lock.json`. Also bumped `@testing-library/react` to `^16.1.0` (React 19 compatible) along with vitest/jsdom.

**Files changed:** `vercel.json`, `package.json`, `package-lock.json` (new), `pnpm-lock.yaml` (deleted)

### 7. Profile Auto-Creation on Signup (ADDED — needs migration applied)

**Symptom:** New users have no `profile` row, causing settings page to fail.

**Fix:** Added profile upsert in `signUpAction` in `app/actions.ts`. Created a Supabase migration with a database trigger (`on_auth_user_created`) to auto-insert a profile row.

**Files changed:** `app/actions.ts`, `supabase/migrations/20260308000001_auto_create_profile_on_signup.sql` (new)

**Action needed:** Apply the migration in Supabase dashboard or via CLI. For existing user, run:
```sql
INSERT INTO profile (user_id) VALUES ('56fa38e0-e606-452b-805b-52d2dc46160a') ON CONFLICT (user_id) DO NOTHING;
```

---

## Current State of the App

| Feature | Status | Notes |
|---------|--------|-------|
| Auth (sign in/up/out) | Working | All Supabase auth logs return 200 |
| Dream submission (insert) | Working | Dreams save to DB correctly |
| Dream analysis (OpenAI) | Partially working | API call succeeds (200) but response parsing may fail — see debugging section |
| Dream image generation | Untested | Runs in `after()` — may still hit Hobby timeout |
| Profile fetch | Fixed locally | Deployed but needs verification |
| Settings page | Fixed locally | Deployed but needs verification |
| Subscription tier display | Fixed locally | Queries `subscriptions` table now |
| Static pages | Working | /about, /help, /contact, /privacy |

---

## Immediate Debugging — Next Session

### Priority 1: Verify OpenAI response parsing

After deploying the latest fixes (empty content check + 4000 token limit), test another dream submission and check Vercel logs for:

```
🔍 Token usage: prompt=X, completion=Y, reasoning=Z
🔍 Content type: string, length: N, finish_reason: stop
```

If `finish_reason` is `length`, we need even more tokens. If content is still empty, the model may not support `json_schema` response format properly.

### Priority 2: Consider switching models

`gpt-5-nano` is a reasoning model — overkill for structured text generation. Better options:

| Model | Pros | Cons |
|-------|------|------|
| `gpt-4.1-nano` | Fast, cheap, supports temperature + max_tokens + json_schema | Newer, less battle-tested |
| `gpt-4o-mini` | Well-tested, great at structured output, cheap | Slightly older |
| `gpt-4.1-mini` | Good balance of quality/speed/cost | Slightly more expensive than nano |

To check available models:
```bash
source .env && curl -s https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | python3 -c "
import sys,json
models = json.load(sys.stdin)['data']
for m in sorted(models, key=lambda x: x['id']):
    if any(k in m['id'] for k in ['gpt-4o','gpt-4.1','gpt-3.5']):
        print(m['id'])
"
```

### Priority 3: Verify profile fix in production

After deploy, check browser console for:
- No more `"Profile data not found, using default tier"` message
- No more 400 from `rest/v1/profile?select=subscription_tier`

### Priority 4: Apply Supabase migration

Run the migration for auto-creating profile rows, or at minimum insert a profile row for the existing user.

---

## Future Improvements & Fine-Tuning Ideas

### Performance
- **Streaming analysis:** Instead of waiting for the full OpenAI response, stream it to the client so the user sees analysis appearing in real-time. Would require switching from `response_format: json_schema` to streaming with manual parsing.
- **Edge function for analysis:** The OpenAI analysis endpoint already runs on Edge Runtime, but the dream-entries POST handler runs on Node.js serverless. Consider whether this matters for latency.
- **Caching:** Cache bible verse texts locally (in a DB table or edge cache) instead of relying on OpenAI to generate them every time.

### Quality
- **Prompt engineering:** The current prompt is good but could be refined. Consider A/B testing different system prompts and measuring user engagement with the analysis.
- **Reading level calibration:** Test that each reading level (`radiant_clarity` through `divine_revelation`) actually produces noticeably different output.
- **Verse accuracy:** OpenAI sometimes hallucinates or paraphrases verse text. Consider validating citations against a real Bible API (e.g., API.Bible, ESV API) as a post-processing step.
- **Dream image quality:** Review the FLUX image generation prompts in `docs/flux-prompting-guide.md` and tune for more consistent, beautiful results.

### Features
- **Dream streaks / journal insights:** Show users patterns in their dreams over time (recurring themes, most-referenced books of the Bible, emotional arcs).
- **Share dreams:** The `/shared/dream/[id]` route exists but may need polish. Consider social sharing with OG images generated from dream art.
- **Favorites / bookmarks:** Let users star particularly meaningful dreams.
- **Re-analyze:** Button to re-run analysis with a different reading level or focus topic.
- **Offline support:** PWA with service worker for journaling without internet.

### Infrastructure
- **Error monitoring:** Add Sentry or similar for production error tracking instead of relying on Vercel logs.
- **Rate limiting:** Protect the OpenAI endpoint from abuse (per-user rate limits).
- **Cost tracking:** Log OpenAI token usage per dream to monitor API costs.
- **Database indexes:** As the dream_entries table grows, ensure indexes on `user_id` and `created_at` for query performance.

---

## Database Schema Reference (verified March 8, 2026)

```
profile:        id (PK), user_id (FK unique), language, bible_version, created_at, reading_level
subscriptions:  id (PK), user_id (FK), stripe_subscription_id, status, plan, credits, trial_end, current_period_end, created_at, updated_at
dream_entries:  id (PK), user_id (FK), original_text, title, dream_summary, analysis_summary, topic_sentence, gematria_interpretation, color_symbolism, image_url, tags[], bible_refs[], created_at, conclusion_sentence, supporting_points[], formatted_analysis, raw_analysis (jsonb), personalized_summary
bible_citations: id (PK), dream_entry_id (FK), bible_book, chapter, verse, full_text, citation_order, created_at, supporting_text, source
chatgpt_interactions: id (PK), dream_entry_id (FK), prompt, response, model, temperature, created_at
```

RLS is enabled on all public tables. Policies use `auth.uid() = user_id`.

---

## File Map — Key Files

```
app/
├── api/
│   ├── dream-entries/route.ts    ← POST (insert + sync analysis), GET, DELETE
│   └── openai-analysis/route.ts  ← Edge function, single OpenAI call, structured JSON
├── actions.ts                    ← Server actions (signUp, signIn, signOut, forgotPassword)
├── page.tsx                      ← Main journal page (dream list + input)
├── settings/page.tsx             ← User settings (profile preferences)
├── about/page.tsx                ← About page (new)
├── help/page.tsx                 ← Help center (new)
├── contact/page.tsx              ← Contact page (new)
└── privacy/page.tsx              ← Privacy policy (new)
components/
├── CompactDreamInput.tsx         ← Dream submission form
├── DreamCard.tsx                 ← Individual dream display + analysis
├── UserAvatar.tsx                ← Profile avatar + subscription tier
└── AnimatedDreamGrid.tsx         ← Dream gallery layout
utils/
├── supabase/server.ts            ← Server-side Supabase client
├── supabase/client.ts            ← Browser-side Supabase client
└── imageGeneration.ts            ← FLUX image generation
```

---

*This is devlog #001. Future logs should be named `devlog-002-*.md`, `devlog-003-*.md`, etc.*
