// scripts/seed-blog-posts.mjs
//
// Seeds markdown drafts (with YAML-ish front-matter) into blog_posts as
// status='draft'. Idempotent: upserts on slug, so re-running is safe and
// NEVER touches a post that has been published (published rows are skipped).
//
// Usage: node scripts/seed-blog-posts.mjs <path-to-drafts-folder>
// Reads SUPABASE URL + SERVICE ROLE KEY from .env in the repo root.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
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

function parseFrontMatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error("no front-matter block");
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim().replace(/^["']|["']$/g, "");
    if (v.startsWith("[")) {
      v = v.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    }
    meta[kv[1]] = v;
  }
  return { meta, body: m[2].trim() };
}

const dir = process.argv[2];
if (!dir) { console.error("usage: node scripts/seed-blog-posts.mjs <drafts-folder>"); process.exit(1); }

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env"); process.exit(1); }

const supabase = createClient(url, key, { auth: { persistSession: false } });

const files = readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "INDEX.md");
let seeded = 0, skipped = 0, failed = 0;

for (const file of files) {
  const { meta, body } = parseFrontMatter(readFileSync(join(dir, file), "utf8"));
  if (!meta.slug || !meta.title) { console.error(`✗ ${file}: missing slug/title`); failed++; continue; }

  // Never overwrite a published post.
  const { data: existing, error: readErr } = await supabase
    .from("blog_posts").select("id,status").eq("slug", meta.slug).maybeSingle();
  if (readErr) {
    const hint = readErr.code === "42P01" ? " — blog_posts table missing: apply migration 20260701000001 first" : "";
    console.error(`✗ ${file}: ${readErr.message}${hint}`); failed++; continue;
  }
  if (existing?.status === "published") { console.log(`↷ ${meta.slug}: already published, skipped`); skipped++; continue; }

  const row = {
    slug: meta.slug,
    title: meta.title,
    excerpt: meta.excerpt ?? null,
    content_md: body,
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    status: "draft",
    seo_title: meta.seo_title ?? null,
    seo_description: meta.excerpt ?? null,
    author_name: "Justin Brewer",
    updated_at: new Date().toISOString(),
  };
  const { error } = existing
    ? await supabase.from("blog_posts").update(row).eq("id", existing.id)
    : await supabase.from("blog_posts").insert(row);
  if (error) { console.error(`✗ ${meta.slug}: ${error.message}`); failed++; }
  else { console.log(`✓ ${meta.slug} (${existing ? "updated" : "created"} draft)`); seeded++; }
}

console.log(`\nDone: ${seeded} seeded, ${skipped} skipped (published), ${failed} failed.`);
process.exit(failed ? 1 : 0);
