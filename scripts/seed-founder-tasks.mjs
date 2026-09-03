// scripts/seed-founder-tasks.mjs
//
// Parses a Monday brief (briefs/YYYY-MM-DD-monday-brief.md) and syncs its
// "This week's 3 priorities" and "Waiting on" sections into founder_tasks,
// which powers the "This week" checklist card on /admin.
//
// Sync rules:
//   - Upsert on (week, title); NEVER touches done_at/done_by — dashboard
//     check-offs are the source of truth for completion.
//   - Un-done rows for the same week that are no longer in the brief are
//     deleted (re-runs converge). Done rows are always kept.
//
// Usage: node scripts/seed-founder-tasks.mjs [path-to-brief.md]
//   With no arg, picks the newest *-monday-brief.md in ../briefs
//   (relative to the repo root, i.e. Dreamlink/briefs).
// Reads SUPABASE URL + SERVICE ROLE KEY from .env in the repo root,
// same as seed-blog-posts.mjs. Requires migration 20260720000001.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const out = {};
  for (const line of readFileSync(join(root, ".env"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

function latestBrief() {
  const dir = join(root, "..", "briefs");
  const files = readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}-monday-brief\.md$/.test(f))
    .sort();
  if (files.length === 0) throw new Error(`no monday-brief files in ${dir}`);
  return join(dir, files[files.length - 1]);
}

function section(md, heading) {
  // Lines between "## <heading>" and the next "## " (or end of file).
  // No /m flag: with it, the lazy body would stop at the first line-end
  // because $ matches every line boundary.
  const re = new RegExp(`(?:^|\\n)## ${heading}[^\\n]*\\n([\\s\\S]*?)(?=\\n## |$)`);
  const m = md.match(re);
  return m ? m[1] : "";
}

function normalizeOwner(raw) {
  const o = raw.trim().toUpperCase();
  if (o === "B" || o === "J") return o;
  return "BJ"; // "B/J", "Either", "B+J"
}

function stripMd(s) {
  return s.replace(/\*\*/g, "").replace(/`/g, "").trim();
}

export function parseBrief(md, week) {
  const tasks = [];

  // Priorities: `1. **B — Title** detail...` (em- or hyphen-dash)
  let sort = 0;
  for (const line of section(md, "This week's 3 priorities").split("\n")) {
    const m = line.match(/^\d+\.\s+\*\*(B\/J|B\+J|Either|B|J)\s*[—-]\s*(.+?)\*\*\s*(.*)$/);
    if (!m) continue;
    tasks.push({
      week,
      owner: normalizeOwner(m[1]),
      kind: "priority",
      title: stripMd(m[2]).replace(/[.。]\s*$/, ""),
      detail: stripMd(m[3]) || null,
      sort: sort++,
    });
  }

  // Waiting on: `- B: item · item · item`
  sort = 0;
  for (const line of section(md, "Waiting on").split("\n")) {
    // Briefs write the owner bold ("- **B:** …"); tolerate optional ** around
    // it — without this, every Waiting-on line silently failed to parse.
    const m = line.match(/^-\s+\**(B\/J|B\+J|Either|B|J)\s*:?\**\s*:?\s*(.+)$/);
    if (!m) continue;
    const owner = normalizeOwner(m[1]);
    for (const item of m[2].split("·")) {
      const title = stripMd(item);
      if (title) {
        tasks.push({ week, owner, kind: "waiting_on", title, detail: null, sort: sort++ });
      }
    }
  }

  return tasks;
}

async function main() {
  const briefPath = process.argv[2] ?? latestBrief();
  const dateMatch = basename(briefPath).match(/^(\d{4}-\d{2}-\d{2})/);
  if (!dateMatch) throw new Error(`can't extract date from filename: ${briefPath}`);
  const week = dateMatch[1];

  const tasks = parseBrief(readFileSync(briefPath, "utf8"), week);
  if (tasks.length === 0) throw new Error("parsed 0 tasks — brief format changed?");

  const env = loadEnv();
  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY,
  );

  // Upsert without touching done state
  const { error: upsertErr } = await sb
    .from("founder_tasks")
    .upsert(tasks, { onConflict: "week,title", ignoreDuplicates: false });
  if (upsertErr) throw new Error(`upsert failed: ${upsertErr.message}`);

  // Converge: drop un-done rows for this week that left the brief
  const titles = tasks.map((t) => t.title);
  const { data: existing, error: readErr } = await sb
    .from("founder_tasks")
    .select("id, title, done_at")
    .eq("week", week);
  if (readErr) throw new Error(`read-back failed: ${readErr.message}`);
  const stale = (existing ?? []).filter((r) => !r.done_at && !titles.includes(r.title));
  if (stale.length > 0) {
    const { error: delErr } = await sb
      .from("founder_tasks")
      .delete()
      .in("id", stale.map((r) => r.id));
    if (delErr) throw new Error(`prune failed: ${delErr.message}`);
  }

  console.log(
    `synced week ${week}: ${tasks.length} tasks (${tasks.filter((t) => t.kind === "priority").length} priorities, ${tasks.filter((t) => t.kind === "waiting_on").length} waiting-on), pruned ${stale.length}`,
  );
}

// Only run when executed directly (parseBrief is exported for tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
