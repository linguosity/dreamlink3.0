# DreamRiver Release Audit — 2026-06-09

Method: 5 parallel domain audits (auth/Supabase, API surface, Stripe, AI pipeline, frontend) followed by an adversarial verification pass that re-read every Critical/High citation. Every finding below survived verification; one Phase-1 claim was corrected (the pricing page exists — its CTA is just not wired). Audit only; no files were modified.

## Critical

**C1. `/api/openai-analysis` is an unauthenticated, unlimited OpenAI proxy** — `app/api/openai-analysis/route.ts:14-36`. No `getUser()`, no rate limit; middleware deliberately exempts `/api/*`. Anyone can POST `{dream, analysisDepth: "profound"}` (8,000 max output tokens, `lib/dreamAnalysis.ts:197`) in a loop and drain the OpenAI budget. Fix: require auth + plan clamp + rate limit, or delete the route and keep analysis inside the authenticated `dream-entries` flow.

**C2. `/api/dream-image` — unauthenticated paid image generation + cross-user IDOR** — `app/api/dream-image/route.ts:20-49,65`. No auth; attacker-controlled `title/summary` go straight into the FLUX prompt, and the result is written via the service-role client with `.eq("id", dreamId)` and no `user_id` filter — any guessable/leaked dream id (share API exposes `id`) gets its `image_url` overwritten. Fix: auth + verify the caller owns `dreamId` + rate limit.

**C3. `/api/backfill-images` — unauthenticated batch generation, service-role, no env guard** — `app/api/backfill-images/route.ts:19-31`. Unlike the debug routes it has no `NODE_ENV` 404 guard; `DEBUG` env check gates logging only. Anonymous POSTs generate up to 3 paid images per call across all users' data and leak the `remaining` count. Fix: delete it, or admin-gate like `api/admin/prompts`.

**C4. Stripe webhook never persists subscriptions — paying customers stay on free, silently** — `app/api/stripe/webhook/route.ts:85-96` upserts with `onConflict: "user_id"`, but no UNIQUE constraint exists on `subscriptions.user_id` (verified across all 28 migrations; `create_tables.sql:59`). Postgres rejects with 42P10, supabase-js returns the error (doesn't throw), the result is discarded, and the handler returns 200 so Stripe never retries. Fix: `ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id)`, destructure and handle the upsert error, return 500 on failure so Stripe retries.

**C5. Payments inserts reference a nonexistent column** — `webhook/route.ts:148,162` inserts `stripe_invoice_id`; the column is `stripe_payment_id` (`create_tables.sql:77`). Every payment insert fails silently (same discarded-error pattern). Also `user_id: null` is never resolved, so even fixed rows are invisible to the user's RLS SELECT. Fix: correct column name, resolve `user_id` from the subscription, check errors.

## High

**H1. Billing is unreachable from the UI** — `app/pricing/page.tsx:158-171`: the upgrade Button has no onClick/href/action; repo-wide grep finds zero UI references to `/api/stripe/checkout` or `/api/stripe/portal`. Nobody can pay. Fix: wire CTA → checkout; surface portal in settings (`plan-section.tsx`).

**H2. Checkout allows duplicate subscriptions and fragments Stripe customers** — `checkout/route.ts:42-58`: existing-subscription lookup result is never used; session uses `customer_email` only (new Stripe customer per checkout), no active-subscription guard.

**H3. Image generation can't finish inside its own function limit** — `utils/imageGeneration.ts:17` polls up to 90s, but `dream-image/route.ts:18` sets `maxDuration = 60`. Vercel kills the function first: FLUX spend incurred, image possibly never stored, caller gets a 504.

**H4. Image pipeline is fire-and-forget with no reconciliation** — `components/CompactDreamInput.tsx:157-169` fires `fetch(..., {keepalive: true}).catch(console.error)`; no queue/retry. Dropped requests leave dreams imageless; the only reconciler is the unauthenticated backfill route (C3).

**H5. Any authenticated user can overwrite/delete any user's stored dream image** — `supabase/migrations/20260417000001:42-51`: UPDATE/DELETE policies on the `dream-images` bucket filter only on `bucket_id`; the migration's own comment flags it. Bucket is also public-read (`20260307000002:10`), so all dream images are world-readable by URL. Fix: scope policies to `auth.uid() = owner`; decide deliberately whether public-read is intended.

**H6. Open redirect on signout** — `app/api/auth/signout/route.ts:23-25`: `new URL(redirect_to, origin)` lets absolute/`//host` URLs override the base → phishing-grade logout-and-redirect. The callback route already has `safeRedirectPath` — reuse it.

**H7. Core journal page performance is self-inflicted** — `app/page.tsx:75` unconditional 100ms sleep on every authenticated load (500ms on logged-out path before redirect, line 63-70); `page.tsx:104-108` fetches and decrypts ALL of a user's dreams (`select("*")`, no limit) then renders 12 (`AnimatedDreamGrid.tsx:288`); the grid itself is `ssr: false` so server data renders as skeletons until hydration (`AnimatedDreamGrid.tsx:24-27`); cards paint full-resolution Supabase originals as raw CSS `background-image` (`DreamCard.tsx:1160`), bypassing next/image entirely.

**H8. Broken label-input association on 3 of 4 auth forms** — sign-up, forgot-password, reset-password: `<Label htmlFor>` with no matching `id` on the Input (sign-up:99-110, forgot-password:38-39, reset-password:17-25). Screen readers announce unlabeled fields. Sign-in does it correctly — copy that pattern.

**H9. Dead 3D stack in dependencies** — `three` + `@react-three/fiber` are never imported anywhere (verified repo-wide). Remove; also move `@types/three`, `prettier` out of `dependencies`.

## Medium

- **M1. No webhook idempotency** — no processed-event-ID dedupe; Stripe retries will double-insert payments once C5 is fixed (`webhook/route.ts:67-174`).
- **M2. `/api/subscribe` unthrottled service-role insert** — bot spam into `newsletter_signups` (`subscribe/route.ts:32-37`).
- **M3. `dream-entries` GET relies solely on RLS** — no `getUser()`, `select("*")`, decrypted output; any future RLS loosening becomes an IDOR (`dream-entries/route.ts:387-426`). DELETE does it right — mirror it.
- **M4. Rate limiter fails open and covers one route only** — `lib/rateLimit.ts:71-77`; the spend-heavy routes (C1/C2) have none.
- **M5. Polling storm + full reload** — each recent DreamCard runs 2s and 5s `setInterval` loops and calls `window.location.reload()` on completion (`DreamCard.tsx:652-737,722`).
- **M6. `require()`-based imports defeat tree-shaking** — framer-motion via CJS `require` with a broken fallback (`AnimatedDreamGrid.tsx:13-21`); ~215 lines of shadcn `require` fallbacks in `DreamCard.tsx:35-250`.
- **M7. `typescript.ignoreBuildErrors: true`** — type errors ship silently (`next.config.mjs:5-8`).
- **M8. AI pipeline errors never reach Sentry** — OpenAI/FLUX/parse failures are `console.error` only; production AI failures are invisible (`lib/dreamAnalysis.ts:386-396`).
- **M9. Auth-page contrast + validation mismatch** — white footer text on cream background (`layout.tsx:204-208`); password `minLength={6}` vs helper text demanding 8+ (`sign-up:114,133`).
- **M10. Client pages re-fetch what the server already has** — account/settings/onboarding are whole-page client components; Navbar, UserAvatar, CompactDreamInput each independently call `getUser()` + profile select per page view.

## Low

Search query interpolated into PostgREST `.or()` filter (escape it; clamp `limit`); share tokens never expire and are reused after revoke+re-share; no `chatgpt_interactions` UPDATE/DELETE policies (asymmetric but harmless); 63 `console.*` calls in DreamCard render paths; `/version.json` polled every 30s from root layout; decorative `role="tablist"` ARIA on filter pills; missing `autoComplete` on auth inputs; `api/seed` safe behind its env guard but should be deleted pre-launch.

## Verified good

`getAll`/`setAll` everywhere (zero deprecated cookie methods); clean browser/server/admin client-tier separation (admin client never in client code); admin routes triple-gated (middleware + layout + `requireAdmin`); RLS policies present for all six core tables (in migration `20260307000001` — confirm `rowsecurity = true` on prod before launch, since `schema.sql` alone contains none); profile auto-creation trigger works; Stripe signature verification and server-side price mapping correct; debug/test/seed routes 404 in production; Responses API + `zodTextFormat` with parse-failure fallback; model from env var; `auth/callback` redirect whitelist; Radix dialogs with real focus management; skip link present; no `dangerouslySetInnerHTML`; no secret keys in client bundle.

## Fix before launch (priority order)

1. Auth + ownership + rate limit on `/api/dream-image`; auth + rate limit on `/api/openai-analysis` (C1, C2)
2. Delete or admin-gate `/api/backfill-images` (C3)
3. UNIQUE constraint on `subscriptions.user_id` + handle webhook errors, return non-200 on failure (C4)
4. Fix `payments` column name + `user_id` resolution (C5)
5. Wire pricing CTA → checkout; portal in settings (H1)
6. Owner-scope the dream-images storage policies (H5)
7. Whitelist `redirect_to` on signout (H6)
8. Reuse Stripe customer + block duplicate subscriptions (H2)
9. Drop the artificial delays, add `.limit(12)` to the journal query, fix the 90s/60s timeout mismatch (H3, H7)
10. Auth-form `id` attributes + remove dead three.js deps (H8, H9)
