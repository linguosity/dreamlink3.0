# Role and Goal
You are an expert full-stack developer specializing in Next.js 16, React 19, Supabase, and AI integrations. Your goal is to build a highly performant, secure, and accessible application tailored for dream analysis and biblical citation.

# Core Tech Stack
- **Frontend:** Next.js 16 (App Router only), React 19
- **Styling & UI:** Tailwind CSS 3.4 (using HSL variables), shadcn/ui (Radix primitives), Framer Motion, Geist font, Lucide icons, Sonner (toasts), next-themes (dark mode)
- **Backend/API:** Node.js serverless functions, Edge Runtime (specifically for OpenAI routes)
- **Database & Auth:** Supabase PostgreSQL (RLS strictly enforced), `@supabase/ssr` for cookie-based sessions
- **AI Services:** OpenAI `gpt-5-nano` (reasoning, structured JSON), `FLUX.2 klein 9B` (async image generation)
- **Testing:** Vitest, Testing Library, jsdom
- **Deployment:** Vercel (60s function timeout)

# Architecture & File Structure
- Adhere strictly to the `docs/full-stack-overview.md` architecture.
- **Frontend:** Use lowercase with kebab-case for directories and files. Group features together.
- **Backend:**
  - Use Server Actions for authentication flows.
  - Use Middleware for session refreshing and route protection.
  - APIs handling OpenAI must use the Edge Runtime.
- **State & UI:** Implement dark mode via `next-themes`. Trigger notifications using `Sonner`. Apply animations via `Framer Motion` without blocking the main thread.

# Next.js 16 & React 19 Best Practices
- **React Server Components (RSC):** Favor server components. Only use `'use client'` when hooks (`useState`, `useEffect`, React 19 hooks) or interactivity are strictly required.
- **Data Fetching:** Leverage Next.js caching.
- **Timeouts:** Account for Vercel's 60s function timeout. Any long-running tasks must be handled asynchronously or backgrounded.

# Supabase & Database Rules
- **CRITICAL:** Use `@supabase/ssr` exclusively. Never use deprecated auth helpers.
- **Client Tiers:** Strictly separate the three client tiers: browser, server, and admin. Use the correct client context for every database call.
- **Auth Flow:** Ensure the `profile` table is automatically populated/created upon user signup.
- **Schema Context:** The primary tables are `dream_entries`, `bible_citations`, `chatgpt_interactions`, `profile`, `subscriptions`, and `payments`.
- **Storage:** Handle dream images via Supabase Storage buckets securely.

# AI Integration Directives
- **OpenAI (`gpt-5-nano`):**
  - Must run on the Edge Runtime.
  - Always enforce and expect structured JSON output for dream analysis and biblical citations.
  - Handle reasoning model latencies gracefully in the UI.
- **Image Generation (`FLUX.2 klein 9B`):**
  - Image generation MUST be asynchronous and non-blocking.
  - Never hold up the main thread or exceed the 60s Vercel timeout waiting for an image. Use webhooks or polling if necessary.

# Testing Standards
- Write unit and integration tests using Vitest and Testing Library with a `jsdom` environment.
- Mock Supabase clients and OpenAI/FLUX API calls in tests to prevent network requests.

# Code Style & Quality
- Use TypeScript strictly. Define explicit interfaces for database rows and AI JSON payloads.
- Favor early returns (guard clauses) to avoid deep nesting.
- Leave no raw `console.log` statements in production code. Use proper logging mechanisms.

---

# Dev Logs

Detailed session-by-session logs live in `docs/devlog-*.md`. Read the latest one before starting work to understand current state, open bugs, and next steps.

- `docs/full-stack-overview.md` — Complete architecture, every layer from React to Postgres
- `docs/devlog-001-march-2026.md` — Profile query fixes, sync analysis rewrite, OpenAI reasoning model issues, pnpm-to-npm migration

# Common Commands

```bash
npm run dev             # Start development server
npm run build           # Build for production
npm run typecheck       # Check for TypeScript errors
npm run lint            # Run linting
npm run test            # Run tests
npm run test:watch      # Tests in watch mode
npm run test:coverage   # Tests with coverage
```

# Authentication Implementation

The Supabase SSR approach for Next.js 16 uses get/set/remove cookie methods (not getAll/setAll):

1. **Server client** (`utils/supabase/server.ts`): `createServerClient` with cookie adapter. Always `await createClient()`.
2. **Middleware** (`utils/supabase/middleware.ts`): Session refresh on every request, manages request/response cookies, protects `/protected/*` routes.
3. **Server actions** (`app/actions.ts`): Use server client for auth operations (signUp, signIn, etc.).
4. **Browser client** (`utils/supabase/client.ts`): Singleton `createBrowserClient` for `"use client"` components.
5. **Admin client**: Direct `createClient` from `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS for background writes.

Notes:
- `cookies()` can only be used in route handlers, server actions, and middleware.
- Browser client uses singleton pattern for performance.

# OpenAI Model Note

The app currently uses `gpt-5-nano-2025-08-07` which is a **reasoning model**. This means:
- No custom `temperature` (only default 1.0)
- Must use `max_completion_tokens` not `max_tokens`
- Some completion tokens go to internal reasoning before visible output
- Consider switching to `gpt-4.1-nano` or `gpt-4o-mini` for better fit (see devlog-001)

# Known Issues & Fixes

1. **404 errors for webpack static files:** Fixed with proper next.config.ts configuration.

2. **Auth session errors:** Added graceful fallbacks in server.ts, fixed error handling in middleware.ts, added proper delays for cookie processing.

3. **UserAvatar dropdown missing:** Fixed client-side session fetch logic and error handling.

4. **Profile/subscription query (March 2026):** UserAvatar.tsx queried non-existent `profile.subscription_tier` — fixed to query `subscriptions` table. `.eq('id', user.id)` was wrong — fixed to `.eq('user_id', user.id)`.

5. **Dream analysis pipeline (March 2026):** `after()` background analysis killed by Vercel timeout — made synchronous. Triple redundant OpenAI calls collapsed to single call. Fixed `max_tokens` → `max_completion_tokens` and removed unsupported `temperature` param. Reasoning model may return empty content if token budget too small — current limit: 4000.
