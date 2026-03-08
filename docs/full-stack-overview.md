# Dreamlink 3.0 — Full Stack Overview

> Last updated: March 8, 2026

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js 16 App Router)                       │
│  React 19 · Tailwind CSS · shadcn/ui · Framer Motion    │
├─────────────────────────────────────────────────────────┤
│  MIDDLEWARE                                              │
│  Supabase session refresh · protected route guards       │
├──────────────────────┬──────────────────────────────────┤
│  API ROUTES          │  SERVER ACTIONS                   │
│  /api/dream-entries  │  signUpAction                     │
│  /api/openai-analysis│  signInAction                     │
│  /api/bible-verses   │  forgotPasswordAction             │
│  /api/auth/*         │  resetPasswordAction              │
├──────────────────────┴──────────────────────────────────┤
│  SERVICES                                                │
│  OpenAI (gpt-5-nano) · FLUX image gen · Supabase Auth    │
├─────────────────────────────────────────────────────────┤
│  DATABASE (Supabase / PostgreSQL)                        │
│  dream_entries · bible_citations · chatgpt_interactions   │
│  profile · subscriptions · payments                      │
│  RLS enabled on all tables                               │
├─────────────────────────────────────────────────────────┤
│  STORAGE                                                 │
│  Supabase Storage: dream-images bucket                   │
├─────────────────────────────────────────────────────────┤
│  DEPLOYMENT                                              │
│  Vercel (serverless + edge) · GitHub auto-deploy          │
└─────────────────────────────────────────────────────────┘
```

---

## Frontend

### Framework

Next.js 16.1.6 with App Router, React 19, TypeScript. Uses a mix of server components (pages, layouts) and client components (interactive UI marked with `"use client"`).

### Styling

Tailwind CSS 3.4 is the primary styling system, configured with HSL CSS variables for theming. The color palette centers on a blue primary (`hsl(210, 100%, 59%)` / #4A90E2) with a neutral base. Dark mode is handled by `next-themes` using class-based toggling (`.dark` on `<html>`), with system preference detection enabled by default.

### Component Library

21 shadcn/ui components built on Radix UI primitives, located in `components/ui/`. These include buttons, cards, dialogs, dropdowns, selects, tabs, toasts, tooltips, and more. Components use `class-variance-authority` (CVA) for typed variant props, and the `cn()` utility (clsx + tailwind-merge) for safe class merging.

### Typography

Geist (Google Fonts via `next/font`) as the main sans-serif. A custom "Blanka" font loaded from `/public/fonts/Blanka.otf` for display use.

### Animations

Framer Motion 12.4 powers the dream grid animations (`AnimatedDreamGrid.tsx`). Tailwind's animate plugin handles UI transitions (fade, slide, zoom). A custom `animate-fade-in` keyframe (1.2s ease-out) runs on main page content.

### Icons & Notifications

Lucide React for SVG icons. Sonner for toast notifications (also has Radix toast primitives available).

### Key Frontend Components

| Component | Purpose |
|-----------|---------|
| `CompactDreamInput.tsx` | Dream text submission form |
| `DreamCard.tsx` | Individual dream display with analysis, bible verses, image |
| `AnimatedDreamGrid.tsx` | Animated masonry-style dream gallery |
| `UserAvatar.tsx` | Profile avatar + subscription tier badge |
| `AuthDropdown.tsx` | Authenticated user menu |
| `header-auth.tsx` | Header with auth-aware navigation |

---

## Backend

### Next.js API Routes

| Route | Methods | Runtime | Purpose |
|-------|---------|---------|---------|
| `/api/dream-entries` | GET, POST, DELETE | Node.js (60s timeout) | Dream CRUD + synchronous AI analysis |
| `/api/dream-entries/search` | GET | Node.js | Full-text dream search (feature-flagged) |
| `/api/openai-analysis` | POST | **Edge** | Single OpenAI call with structured JSON schema |
| `/api/bible-verses` | GET | Node.js | Fetch verse text from DB + hardcoded fallbacks |
| `/api/bible-verses/lookup` | GET | Node.js | Expanded verse lookup for a dream |
| `/api/auth/signout` | GET | Node.js | Clear session cookies, redirect |
| `/api/auth/callback` | GET | Node.js | OAuth code exchange |
| `/api/seed` | GET | Node.js | Test data seeding |
| `/api/debug` | GET | Node.js | Environment variable check |
| `/api/debug-session` | GET | Node.js | Session state inspection |
| `/api/test-db` | GET | Node.js | Database connectivity test |
| `/api/test-dream` | GET | Node.js | Dream creation flow test |

### Server Actions (`app/actions.ts`)

Authentication flows using `"use server"` directive: `signUpAction`, `signInAction`, `forgotPasswordAction`, `resetPasswordAction`. Sign-up also creates a profile row via upsert.

### Middleware (`utils/supabase/middleware.ts`)

Runs on every request. Refreshes Supabase session, manages auth cookies (get/set/remove), redirects unauthenticated users away from `/protected/*` routes, adds `x-pathname` header. Gracefully handles transient network errors without logging users out.

---

## Database (Supabase / PostgreSQL)

### Tables

```
profile
  id          uuid PK (auto)
  user_id     uuid FK → auth.users (unique)
  language    text
  bible_version text
  reading_level text (default: 'celestial_insight')
  created_at  timestamp

subscriptions
  id          uuid PK (auto)
  user_id     uuid FK → auth.users
  stripe_subscription_id text
  status      text (active, canceled, etc.)
  plan        text
  credits     integer (default: 0)
  trial_end   timestamp
  current_period_end timestamp
  created_at  timestamp
  updated_at  timestamp

dream_entries
  id          uuid PK (auto)
  user_id     uuid FK → auth.users
  original_text text (NOT NULL)
  title       text
  dream_summary text
  analysis_summary text
  topic_sentence text
  supporting_points text[]
  conclusion_sentence text
  formatted_analysis text
  personalized_summary text
  gematria_interpretation text
  color_symbolism text
  image_url   text
  tags        text[]
  bible_refs  text[]
  raw_analysis jsonb
  created_at  timestamp

bible_citations
  id          uuid PK (auto)
  dream_entry_id uuid FK → dream_entries
  bible_book  text
  chapter     integer
  verse       integer
  full_text   text
  citation_order integer (default: 1)
  supporting_text text
  source      text
  created_at  timestamp

chatgpt_interactions
  id          uuid PK (auto)
  dream_entry_id uuid FK → dream_entries
  prompt      text (NOT NULL)
  response    text (NOT NULL)
  model       text
  temperature numeric
  created_at  timestamp
```

### Row-Level Security

RLS enabled on all public tables. Policies use `auth.uid() = user_id` to ensure users can only access their own data. Admin operations (background analysis writes, image uploads) use the service role client to bypass RLS.

### Supabase Client Patterns

Three client tiers:
- **Browser client** (`utils/supabase/client.ts`) — singleton `createBrowserClient` with anon key, used in `"use client"` components.
- **Server client** (`utils/supabase/server.ts`) — `createServerClient` with cookie adapter, used in server components, route handlers, and server actions. Respects RLS.
- **Admin client** — direct `createClient` from `@supabase/supabase-js` using `SUPABASE_SERVICE_ROLE_KEY`. Bypasses RLS for background writes (dream analysis results, image uploads).

### Storage

`dream-images` bucket in Supabase Storage. Stores AI-generated dream artwork. Public URLs returned for display. Uploads use the admin client.

---

## AI Services

### OpenAI — Dream Analysis

| Setting | Value |
|---------|-------|
| Model | `gpt-5-nano-2025-08-07` (reasoning model) |
| Runtime | Edge (zero cold start) |
| max_completion_tokens | 4000 |
| temperature | Default only (1.0 — model restriction) |
| Response format | `json_schema` (structured output) |

The structured schema requires: `topicSentence`, `supportingPoints` (array), `conclusionSentence`, `analysis`, `personalizedSummary`, `dreamTitle`, `biblicalReferences` (array of `{citation, verseText}`), `tags` (array).

Reading level customization adjusts the system prompt across four tiers: Radiant Clarity (3rd grade), Celestial Insight (8th grade, default), Prophetic Wisdom (12th grade), Divine Revelation (seminary level).

**Known issue:** `gpt-5-nano` is a reasoning model that burns tokens on internal chain-of-thought. Consider switching to `gpt-4.1-nano` or `gpt-4o-mini` for this use case. See `docs/devlog-001-march-2026.md`.

### FLUX — Dream Image Generation

| Setting | Value |
|---------|-------|
| Provider | Black Forest Labs |
| Model | FLUX.2 [klein] 9B |
| Endpoint | `https://api.bfl.ai/v1/flux-2-klein-9b` |
| Resolution | 1024×1024 |
| Timeout | 90s (polling at 1.5s intervals) |

Pipeline: submit prompt → poll for completion → download image → upload to Supabase Storage → save URL to dream entry. Runs in `after()` callback (non-blocking, non-critical). Prompt construction follows the pattern documented in `docs/flux-prompting-guide.md`.

Implementation: `utils/imageGeneration.ts` (`buildImagePrompt`, `generateAndStoreDreamImage`).

---

## Authentication Flow

1. User signs up via `signUpAction` → Supabase creates auth user → app upserts `profile` row → database trigger also creates profile (belt and suspenders).
2. User signs in via `signInAction` → Supabase issues JWT → stored in cookies via `@supabase/ssr`.
3. On every request, middleware refreshes the session and updates cookies.
4. Protected routes (`/protected/*`) redirect to `/sign-in` if no valid session.
5. Sign out clears cookies and redirects.

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable key |
| `SUPABASE_JWT_SECRET` | JWT verification |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin access (bypasses RLS) |
| `OPENAI_API_KEY` | OpenAI API authentication |
| `BFL_API_KEY` | Black Forest Labs FLUX API |
| `VERCEL_URL` | Auto-set by Vercel |
| `NEXT_PUBLIC_FEATURE_CLIENT_SEARCH` | Client-side search toggle (default: true) |
| `NEXT_PUBLIC_FEATURE_SERVER_SEARCH` | Server-side search toggle (default: false) |

---

## Testing

Vitest 2.1 with jsdom environment, `@testing-library/react` for component tests, coverage via `@vitest/coverage-v8`.

```bash
npm run test            # Run all tests
npm run test:watch      # Watch mode
npm run test:ui         # UI dashboard
npm run test:coverage   # Coverage report
```

Test files live in `tests/` organized by `components/`, `api/`, `utils/`.

---

## Deployment

Vercel with GitHub auto-deploy on push to `main`. Config in `vercel.json`:

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "devCommand": "next dev",
  "installCommand": "npm install"
}
```

TypeScript errors are ignored during build (`next.config.mjs: ignoreBuildErrors: true`). The OpenAI analysis endpoint runs on Edge Runtime. Dream entry processing has a 60s function timeout (`maxDuration = 60`).

---

## Feature Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `NEXT_PUBLIC_FEATURE_CLIENT_SEARCH` | `true` | Enable client-side dream search |
| `NEXT_PUBLIC_FEATURE_SERVER_SEARCH` | `false` | Enable server-side full-text search |

---

## File Structure (Key Paths)

```
app/
├── layout.tsx              ← Root layout (fonts, theme provider, toaster)
├── providers.tsx            ← ThemeProvider wrapper
├── globals.css              ← Tailwind + CSS variables + custom styles
├── page.tsx                 ← Main journal page
├── actions.ts               ← Server actions (auth flows)
├── api/
│   ├── dream-entries/
│   │   ├── route.ts         ← Dream CRUD + sync analysis (Node.js, 60s)
│   │   └── search/route.ts  ← Dream search
│   ├── openai-analysis/
│   │   └── route.ts         ← AI analysis (Edge Runtime)
│   ├── bible-verses/
│   │   ├── route.ts         ← Verse fetch
│   │   └── lookup/route.ts  ← Expanded verse lookup
│   └── auth/
│       ├── signout/route.ts
│       └── callback/route.ts
├── about/page.tsx
├── help/page.tsx
├── contact/page.tsx
├── privacy/page.tsx
├── settings/page.tsx
├── account/page.tsx
├── landing/page.tsx
├── pricing/page.tsx
├── sign-in/page.tsx
├── sign-up/page.tsx
├── forgot-password/page.tsx
├── protected/
│   └── reset-password/page.tsx
└── shared/dream/[id]/page.tsx

components/
├── ui/                      ← 21 shadcn components
├── CompactDreamInput.tsx
├── DreamCard.tsx
├── AnimatedDreamGrid.tsx
├── UserAvatar.tsx
├── AuthDropdown.tsx
└── header-auth.tsx

utils/
├── supabase/
│   ├── server.ts            ← Server Supabase client
│   ├── client.ts            ← Browser Supabase client (singleton)
│   └── middleware.ts         ← Session refresh + route protection
├── imageGeneration.ts       ← FLUX image pipeline
└── cn.ts                    ← Class name utility

schema/
└── profile.ts               ← ReadingLevel enum + Zod schemas

docs/
├── full-stack-overview.md   ← This file
├── devlog-001-march-2026.md ← Session dev log
└── flux-prompting-guide.md  ← Image prompt best practices
```
