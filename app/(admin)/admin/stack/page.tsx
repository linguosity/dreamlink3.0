// app/(admin)/admin/stack/page.tsx
//
// A plain-English map of what DreamRiver is built on — one row per category,
// the technical name beside a sentence anyone can follow.
//
// Versions are read from package.json at build time rather than typed in, so
// this page cannot quietly drift the way the "Core Tech Stack" block in
// CLAUDE.md did (it still claimed gpt-4.1-mini, Tailwind 3.4 and the Geist
// font long after all three had changed). If a row's version looks wrong, the
// dependency changed — the page didn't.
//
// The prose is the point. Anything here should make sense to Justin, or to
// anyone we hand the project to, without them opening the codebase.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import pkg from "@/package.json";

export const metadata = {
  title: "Stack · DreamRiver Admin",
  description: "What DreamRiver is built on, in technical and plain terms",
};

/** Version from package.json with the range prefix stripped. */
function v(name: string): string {
  const deps = pkg.dependencies as Record<string, string>;
  const dev = pkg.devDependencies as Record<string, string>;
  const raw = deps?.[name] ?? dev?.[name];
  return raw ? raw.replace(/^[\^~>=<\s]+/, "") : "—";
}

const nodeVersion =
  (pkg as { engines?: { node?: string } }).engines?.node ?? "—";

type Row = { category: string; tech: string; plain: string };

const PLATFORM: Row[] = [
  {
    category: "Framework",
    tech: `Next.js ${v("next")} (App Router) · React ${v("react")}`,
    plain:
      "The engine behind every page. Pages are assembled on the server before they reach the browser, which is why they arrive fast and read properly to search engines.",
  },
  {
    category: "Language",
    tech: `TypeScript ${v("typescript")}`,
    plain:
      "JavaScript with type checking, so a whole class of mistakes gets caught before anyone sees them.",
  },
  {
    category: "Hosting",
    tech: `Vercel · Node ${nodeVersion} · 60s function limit`,
    plain:
      "Where the site actually runs. Any single request has one minute to finish, which is why long jobs like image generation are pushed to the background.",
  },
  {
    category: "Scheduled jobs",
    tech: "Vercel Cron",
    plain:
      "Morning reminders daily at 13:00 UTC and the weekly digest on Sundays at 16:00 UTC.",
  },
];

const DATA: Row[] = [
  {
    category: "Database",
    tech: `Supabase Postgres · row-level security · @supabase/supabase-js ${v("@supabase/supabase-js")}`,
    plain:
      "Where dreams, accounts and billing records live. Every row is fenced to its owner by the database itself, not just by our code — so a bug in the app still can't show one person another's dream.",
  },
  {
    category: "Sign-in",
    tech: `Supabase Auth · @supabase/ssr ${v("@supabase/ssr")}`,
    plain:
      "Accounts, passwords and Google sign-in. Sessions live in cookies that quietly renew themselves, so people stay logged in without re-entering anything.",
  },
  {
    category: "File storage",
    tech: "Supabase Storage",
    plain:
      "Where the generated dream artwork is kept. Images are served through links that expire, so they can't be hotlinked or shared indefinitely.",
  },
];

const AI: Row[] = [
  {
    category: "Interpretation",
    tech: `OpenAI Responses API · openai ${v("openai")} · structured output via Zod ${v("zod")}`,
    plain:
      "The model that reads a dream and writes the interpretation. We ask for a fixed shape rather than free text, so every reading comes back as the same set of fields and nothing has to be parsed out of prose.",
  },
  {
    category: "AI fallback",
    tech: "OpenRouter",
    plain:
      "A second route to a different provider, used only when OpenAI fails. It means a provider outage slows interpretations down instead of stopping them.",
  },
  {
    category: "Dream images",
    tech: "Black Forest Labs — FLUX.2 [klein] 9B",
    plain:
      "Generates the artwork on each dream card. It runs after the interpretation is already on screen, so nobody waits on a picture to read their dream.",
  },
  {
    category: "Scripture",
    tech: "Local KJV text · bible_citations table",
    plain:
      "The full King James Bible ships inside the app. Verse lookups never leave the server, never cost a network call, and can't break because someone else's API is down.",
  },
];

const BUSINESS: Row[] = [
  {
    category: "Payments",
    tech: `Stripe ${v("stripe")}`,
    plain:
      "Checkout, the billing portal where people manage their own subscription, and the webhooks that keep our record of who's paid in step with Stripe's.",
  },
  {
    category: "Email",
    tech: `Resend ${v("resend")} · send.dreamriver.io`,
    plain:
      "Welcome notes, credit warnings and the weekly digest. Sent from our own verified domain so they land in inboxes rather than spam.",
  },
  {
    category: "Analytics",
    tech: `PostHog · posthog-js ${v("posthog-js")} · posthog-node ${v("posthog-node")}`,
    plain:
      "How the product is actually used. In the browser it only starts after someone accepts the cookie banner; on the server it records account and billing events regardless, because those are operational records rather than tracking.",
  },
  {
    category: "Error tracking",
    tech: `Sentry ${v("@sentry/nextjs")} — built in, not yet switched on`,
    plain:
      "Meant to collect crashes and stack traces. It is bundled into the app but never initialised, so errors currently go only to the server log. Worth finishing.",
  },
];

const INTERFACE: Row[] = [
  {
    category: "Styling & components",
    tech: `Tailwind CSS ${v("tailwindcss")} · shadcn/ui (Radix) · Framer Motion ${v("framer-motion")} · Lucide icons`,
    plain:
      "The look and feel. Radix supplies the fiddly interactive pieces — dialogs, menus, tooltips — already keyboard- and screen-reader-friendly, so we don't rebuild accessibility by hand.",
  },
  {
    category: "Typefaces",
    tech: "Jost · Newsreader · Quicksand",
    plain:
      "Jost for interface text, Newsreader for dreams and interpretations because it's built for long reading, and Quicksand for the DreamRiver wordmark and nothing else.",
  },
  {
    category: "Testing",
    tech: `Vitest ${v("vitest")} · Playwright ${v("@playwright/test")}`,
    plain:
      "Vitest checks individual pieces of logic. Playwright drives a real browser through the site on every pull request, so a change that breaks sign-up gets caught before it ships.",
  },
];

function StackTable({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-3 px-2 font-medium w-[16%] min-w-[9rem]">
                  Category
                </th>
                <th className="text-left py-3 px-2 font-medium w-[30%] min-w-[13rem]">
                  What we use
                </th>
                <th className="text-left py-3 px-2 font-medium">
                  In plain English
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.category}
                  className="border-b last:border-0 align-top"
                >
                  <td className="py-3 px-2 font-medium">{row.category}</td>
                  <td className="py-3 px-2 font-mono text-[12.5px] leading-relaxed text-muted-foreground">
                    {row.tech}
                  </td>
                  <td className="py-3 px-2 leading-relaxed">{row.plain}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StackPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stack</h1>
        <p className="text-muted-foreground mt-1">
          What DreamRiver is built on — the technical name, and what it
          actually does.
        </p>
      </div>

      <StackTable title="Platform" rows={PLATFORM} />
      <StackTable title="Data &amp; identity" rows={DATA} />
      <StackTable title="AI &amp; scripture" rows={AI} />
      <StackTable title="Money &amp; messages" rows={BUSINESS} />
      <StackTable title="Interface &amp; quality" rows={INTERFACE} />

      <p className="text-xs text-muted-foreground">
        Version numbers are read from <code className="font-mono">package.json</code>{" "}
        when the site is built, so this page updates itself when a dependency
        does. The descriptions are written by hand and should be revisited when
        a service is added or dropped.
      </p>
    </div>
  );
}
