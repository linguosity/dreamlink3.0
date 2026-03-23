# Composio Toolkit Integration Analysis for Dreamlink 3.0

**Date:** March 23, 2026
**Scope:** Mapping Composio's 1000+ toolkits against Dreamlink's current state, gaps, and growth opportunities

---

## Executive Summary

Dreamlink 3.0 has a strong production-ready core — authentication, dream journaling, OpenAI analysis, FLUX image generation, and a polished UI. However, several critical systems are incomplete (payments, monitoring, email, analytics) and the developer experience could be significantly improved. Composio's toolkit ecosystem can address many of these gaps by providing pre-built, auth-managed integrations that plug directly into your existing Next.js + Supabase stack via their Vercel AI SDK or MCP integrations.

Below, recommendations are organized by priority tier, with each entry mapping a Composio toolkit to a specific Dreamlink need.

---

## Tier 1: Critical — Directly Addresses Missing Features

### 1. Stripe Toolkit → Payment & Subscription System

**Current state:** `subscriptions` and `payments` tables exist in your DB with RLS policies, but there's no Stripe integration, no payment UI, and subscription enforcement is stubbed out.

**What Composio's Stripe toolkit offers:**
- Create customers, generate invoices, manage subscriptions, issue refunds — all via structured API actions
- Managed OAuth/auth so you don't have to handle Stripe webhook signature verification manually
- Actions: `STRIPE_CREATE_CUSTOMER`, `STRIPE_CREATE_SUBSCRIPTION`, `STRIPE_CANCEL_SUBSCRIPTION`, `STRIPE_CREATE_INVOICE`, `STRIPE_ISSUE_REFUND`

**Recommended integration:**
- Use Composio's Stripe toolkit in your server actions to handle subscription creation on signup
- Wire subscription status checks into your existing middleware for route protection
- Build a `/settings/billing` page that calls Composio Stripe actions for plan changes
- Use Stripe webhooks (or Composio's trigger system) to sync subscription status back to your `subscriptions` table

**Impact:** Unlocks monetization — the single biggest blocker to launch.

---

### 2. Sentry Toolkit → Error Monitoring & Alerting

**Current state:** No error monitoring. API failures in OpenAI and FLUX silently fallback or log to console. `console.log` debug statements scattered through production code. No visibility into production errors.

**What Composio's Sentry toolkit offers:**
- Create and manage Sentry projects, dashboards, and alert rules programmatically
- Track error rates, set up critical exception alerts
- Actions: `SENTRY_CREATE_PROJECT`, `SENTRY_LIST_ISSUES`, `SENTRY_RESOLVE_ISSUE`, `SENTRY_CREATE_ALERT_RULE`

**Recommended integration:**
- Install `@sentry/nextjs` directly for runtime error capture (Composio complements this for management)
- Use Composio's Sentry toolkit to build an admin dashboard action that checks error trends
- Set up alert rules for: OpenAI API failures, FLUX timeout spikes, auth errors, and Supabase connection issues
- Replace all raw `console.log` with structured Sentry breadcrumbs

**Impact:** Visibility into production health — essential before scaling users.

---

### 3. Gmail / Resend → Transactional Email

**Current state:** No email system. No welcome emails, no dream digest notifications, no password reset custom templates. Supabase handles auth emails with default templates.

**What Composio's Gmail toolkit offers:**
- Send emails, manage drafts, read inbox — all with managed Google OAuth
- Actions: `GMAIL_SEND_EMAIL`, `GMAIL_CREATE_DRAFT`, `GMAIL_LIST_EMAILS`

**Recommended integration (two paths):**

*Path A — Composio Gmail (simpler, for notifications from a team account):*
- Use for sending weekly dream digest summaries to users
- Use for admin notifications (new signups, payment events, error spikes)

*Path B — Resend/SendGrid directly (better for transactional at scale):*
- Custom welcome emails on signup
- Dream analysis completion notifications
- Subscription renewal reminders
- Password reset with branded templates

**Impact:** User engagement and retention. Weekly dream digests alone could significantly boost return visits.

---

## Tier 2: High Value — Improves Developer Experience & App Quality

### 4. GitHub Toolkit → CI/CD & Issue Management

**Current state:** Auto-deploy on push to main, but no lint enforcement in CI, no test gating, TypeScript errors ignored in build (`ignoreBuildErrors: true`). No automated issue tracking.

**What Composio's GitHub toolkit offers:**
- Manage issues, PRs, labels, collaborators programmatically
- Actions: `GITHUB_CREATE_ISSUE`, `GITHUB_ADD_LABELS`, `GITHUB_CREATE_PR`, `GITHUB_LIST_ISSUES`

**Recommended integration:**
- Build an AI agent that auto-creates GitHub issues from Sentry error spikes
- Auto-label issues by severity based on error frequency
- Create a scheduled agent that reviews open PRs and summarizes changes
- Eventually: gate deployments on test passage (fix `ignoreBuildErrors` first)

**Impact:** Moves from "push and pray" to structured development workflow.

---

### 5. Supabase Toolkit → Database Operations & Admin

**Current state:** You're already on Supabase, but admin operations (backfilling images, seeding data, running migrations) are done through one-off API routes (`/api/backfill-images`, `/api/seed`, etc.).

**What Composio's Supabase toolkit offers:**
- Query, insert, update, and manage database operations through a unified action layer
- Actions: `SUPABASE_QUERY`, `SUPABASE_INSERT`, `SUPABASE_UPDATE`, `SUPABASE_DELETE`

**Recommended integration:**
- Build an admin AI agent that can run common database queries (user counts, dream stats, subscription status)
- Replace one-off admin API routes with Composio-powered admin actions
- Create a scheduled agent for database health checks (orphaned records, missing profiles)

**Impact:** Reduces custom admin tooling code; makes database ops accessible through natural language.

---

### 6. Vercel Toolkit → Deployment Monitoring

**Current state:** Deployed on Vercel with 60s function timeout. No deployment monitoring beyond Vercel's built-in dashboard.

**What Composio's Vercel toolkit offers:**
- Monitor deployments, check build status, manage environment variables
- Integrates with Vercel AI SDK (which you're already close to — Next.js + Edge Runtime)

**Recommended integration:**
- Build alerts for failed deployments
- Monitor Edge Runtime cold start times for your OpenAI analysis route
- Track function execution duration (critical given your 60s timeout constraint)

**Impact:** Proactive deployment health monitoring without leaving your workflow.

---

## Tier 3: Growth Features — New Capabilities for Users

### 7. Google Analytics Toolkit → User Behavior Analytics

**Current state:** No analytics. You have no visibility into which features users engage with, where they drop off, or how often they return.

**What Composio offers:**
- Access GA data, analyze traffic and user behavior, create reports programmatically

**Recommended integration:**
- Add GA4 to Dreamlink for page views, dream submissions, analysis completions, image generation usage
- Use Composio's toolkit to build an admin AI agent that summarizes weekly user engagement
- Track key funnels: signup → first dream → first analysis → subscription conversion

**Impact:** Data-driven product decisions. Essential for knowing what to build next.

---

### 8. Notion / Airtable Toolkit → Content Management & Knowledge Base

**Current state:** Bible verse coverage is limited — OpenAI generates verse text during analysis with a small hardcoded fallback list. No integration with a dedicated Bible API. Help/About pages are static.

**What Composio offers:**
- Notion: Manage pages, databases, content blocks
- Airtable: Spreadsheet/database hybrid for structured content

**Recommended integration:**
- Store biblical reference data in Airtable as a structured, queryable knowledge base
- Use Notion for managing app content (help docs, FAQ, changelog) that non-developers can update
- Build a validation pipeline: OpenAI generates citation → lookup against Airtable Bible database → verify accuracy

**Impact:** Dramatically improves biblical citation accuracy — a core differentiator for your app.

---

### 9. Slack Toolkit → Team Communication & Alerts

**Current state:** No team alerting system. As you scale, you'll need real-time visibility into app events.

**What Composio's Slack toolkit offers:**
- Send messages, create channels, manage threads
- Actions: `SLACK_SEND_MESSAGE`, `SLACK_CREATE_CHANNEL`, `SLACK_LIST_MESSAGES`

**Recommended integration:**
- Create a `#dreamlink-alerts` channel for: new signups, payment events, error spikes, deployment status
- Build a daily digest bot: "Yesterday: 47 dreams analyzed, 3 subscriptions, 0 errors"
- Forward Sentry critical alerts to Slack for immediate response

**Impact:** Real-time team awareness without constantly checking dashboards.

---

### 10. Calendly / Google Calendar Toolkit → Scheduling (Future)

**Relevance:** If you plan to offer dream interpretation sessions, coaching, or community events.

**What Composio offers:**
- Calendly: Automate meeting invitations, availability checks, reminders
- Google Calendar: Full calendar management

**Recommended integration (future):**
- Premium tier feature: book a live dream interpretation session with a counselor
- Community events: group dream analysis workshops

**Impact:** Premium monetization path beyond subscriptions.

---

## Tier 4: Technical Debt & Quality Improvements (Not Composio-specific)

These aren't Composio integrations but were identified during the codebase review and should be addressed alongside any new integrations:

| Issue | Severity | Fix |
|-------|----------|-----|
| `ignoreBuildErrors: true` in next.config | High | Fix TypeScript errors, remove flag |
| DreamCard.tsx is 74KB | Medium | Split into sub-components |
| Duplicate files (e.g., `SearchFeatureToggle 2.tsx`) | Low | Clean up |
| Server-side search commented out | Medium | Finish full-text search implementation |
| Test coverage gaps (no E2E, minimal integration) | High | Add Playwright E2E, expand Vitest |
| Using `gpt-4o-mini` vs `gpt-5-nano` per CLAUDE.md | Low | Evaluate cost/quality tradeoff |
| Feature flags undocumented | Low | Document in REFERENCE.md |

---

## Recommended Implementation Order

```
Phase 1 (Pre-Launch):
  ├── Stripe integration (payments/subscriptions)
  ├── Sentry integration (error monitoring)
  └── Fix TypeScript build errors

Phase 2 (Launch):
  ├── Transactional email (welcome, digests)
  ├── Google Analytics (user behavior)
  └── Finish full-text search

Phase 3 (Growth):
  ├── Slack alerts for team
  ├── GitHub CI/CD improvements
  ├── Bible reference validation (Airtable)
  └── Admin AI agent (Supabase + Composio)

Phase 4 (Scale):
  ├── Vercel monitoring
  ├── Scheduling features (Calendly)
  └── Advanced analytics & AI agents
```

---

## How to Get Started with Composio

1. **Install:** `npm install composio-core` (TypeScript SDK)
2. **Auth:** Create a Composio account, get API key
3. **Connect tools:** Use Composio's managed auth to connect Stripe, Sentry, etc.
4. **Use in Next.js:** Composio works with Vercel AI SDK — integrates naturally with your Edge Runtime setup
5. **MCP option:** Composio also offers MCP server integrations if you want to use their tool router

```typescript
// Example: Stripe subscription creation via Composio
import { Composio } from "composio-core";

const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });

// Get Stripe tools
const tools = await composio.getTools({
  toolkits: ["stripe"],
  actions: ["STRIPE_CREATE_SUBSCRIPTION"]
});
```

---

## Sources

- [Composio Toolkits Directory](https://composio.dev/toolkits)
- [Composio Stripe MCP Integration](https://composio.dev/toolkits/stripe/framework/ai-sdk)
- [Composio Sentry Toolkit](https://docs.composio.dev/toolkits/sentry)
- [Composio Supabase Toolkit](https://docs.composio.dev/toolkits/supabase)
- [Composio GitHub Toolkit](https://docs.composio.dev/toolkits/github)
- [Composio Vercel AI SDK Integration](https://docs.composio.dev/javascript/vercel)
- [Composio GitHub Repository](https://github.com/ComposioHQ/composio)
