"use server";

// Blog admin server actions. /admin/* is gated by middleware + layout, but
// each action re-verifies is_admin (defense in depth, matches app/admin/actions.ts).

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/blog";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase
    .from("profile")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) {
    throw new Error("Forbidden");
  }
  return { supabase, user };
}

export interface BlogPostInput {
  id?: string;
  title: string;
  slug?: string;
  excerpt: string;
  content_md: string;
  cover_image_url: string;
  author_name: string;
  tags: string[];
  seo_title: string;
  seo_description: string;
}

function revalidateBlog(slug?: string) {
  revalidatePath("/blog");
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");
}

export async function savePostAction(
  input: BlogPostInput
): Promise<{ ok: true; id: string; slug: string } | { error: string }> {
  try {
    const { supabase } = await requireAdmin();
    if (!input.title.trim()) return { error: "Title is required" };

    const slug = slugify(input.slug?.trim() || input.title);
    if (!slug) return { error: "Could not derive a URL slug from the title" };

    const row = {
      title: input.title.trim(),
      slug,
      excerpt: input.excerpt.trim() || null,
      content_md: input.content_md,
      cover_image_url: input.cover_image_url.trim() || null,
      author_name: input.author_name.trim() || "DreamRiver Team",
      tags: input.tags.map((t) => t.trim()).filter(Boolean),
      seo_title: input.seo_title.trim() || null,
      seo_description: input.seo_description.trim() || null,
    };

    if (input.id) {
      const { error } = await supabase
        .from("blog_posts")
        .update(row)
        .eq("id", input.id);
      if (error) {
        if (error.code === "23505")
          return { error: `A post with the slug "${slug}" already exists.` };
        return { error: error.message };
      }
      revalidateBlog(slug);
      return { ok: true, id: input.id, slug };
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .insert(row)
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505")
        return { error: `A post with the slug "${slug}" already exists.` };
      return { error: error.message };
    }
    revalidateBlog(slug);
    return { ok: true, id: (data as { id: string }).id, slug };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function setPostStatusAction(
  id: string,
  status: "draft" | "published"
): Promise<{ ok: true } | { error: string }> {
  try {
    const { supabase } = await requireAdmin();
    const { data } = await supabase
      .from("blog_posts")
      .select("published_at, slug")
      .eq("id", id)
      .single();
    const existing = data as
      | { published_at: string | null; slug: string }
      | null;
    // Publishing now (or dropping back to draft) always cancels a pending
    // schedule — 'scheduled' state only exists via schedulePostAction.
    const patch: Record<string, unknown> = { status, scheduled_for: null };
    // Only set published_at the first time so re-publishing keeps its date.
    if (status === "published" && !existing?.published_at) {
      patch.published_at = new Date().toISOString();
    }
    const { error } = await supabase.from("blog_posts").update(patch).eq("id", id);
    if (error) return { error: error.message };
    // Revalidate the post's own URL too, so unpublishing drops the cached
    // page and publishing makes it live immediately.
    revalidateBlog(existing?.slug);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Schedule a post: status='scheduled' + scheduled_for. No cron flips it
 * later — the public-read RLS policy (and every public query) treats a
 * scheduled post with scheduled_for <= now() as live, so it appears on
 * /blog by itself the moment the time passes ("lazy publish").
 */
export async function schedulePostAction(
  id: string,
  scheduledForIso: string
): Promise<{ ok: true } | { error: string }> {
  try {
    const { supabase } = await requireAdmin();
    const when = new Date(scheduledForIso);
    if (Number.isNaN(when.getTime())) {
      return { error: "Pick a valid date and time to schedule." };
    }
    if (when.getTime() <= Date.now()) {
      return {
        error: "That time is already past — use Publish to go live now.",
      };
    }
    const { data } = await supabase
      .from("blog_posts")
      .select("slug")
      .eq("id", id)
      .maybeSingle();
    const { error } = await supabase
      .from("blog_posts")
      .update({ status: "scheduled", scheduled_for: when.toISOString() })
      .eq("id", id);
    if (error) return { error: error.message };
    revalidateBlog((data as { slug: string } | null)?.slug);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function deletePostAction(
  id: string
): Promise<{ ok: true } | { error: string }> {
  try {
    const { supabase } = await requireAdmin();
    const { data } = await supabase
      .from("blog_posts")
      .select("slug")
      .eq("id", id)
      .maybeSingle();
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) return { error: error.message };
    revalidateBlog((data as { slug: string } | null)?.slug);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ---------------------------------------------------------------------------
// Batch import — multiple .md files with YAML-ish front-matter
// ---------------------------------------------------------------------------

/**
 * Hand-rolled front-matter parse, same shape as scripts/seed-blog-posts.mjs
 * (no YAML dependency): a `---` block of `key: value` lines, then the
 * Markdown body. `[a, b]` values become arrays; surrounding quotes are
 * stripped. CRLF and BOM are normalized so files exported from Word/Windows
 * still parse.
 */
function parseFrontMatter(
  raw: string
): { meta: Record<string, string | string[]>; body: string } | null {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return null;
  const meta: Record<string, string | string[]> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const v = kv[2].trim().replace(/^["']|["']$/g, "");
    meta[kv[1]] = v.startsWith("[")
      ? v
          .replace(/^\[/, "")
          .replace(/\]$/, "")
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean)
      : v;
  }
  return { meta, body: m[2].trim() };
}

/**
 * Accepts full ISO (with Z or offset) or "YYYY-MM-DD HH:mm" / "YYYY-MM-DDTHH:mm"
 * — times without a timezone are treated as UTC so imports behave the same
 * everywhere. Returns a normalized ISO string, or null when unreadable.
 */
function parseScheduledFor(raw: string): string | null {
  const s = raw.trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?$/);
  const candidate = m ? `${m[1]}T${m[2]}:${m[3] ?? "00"}Z` : s;
  const d = new Date(candidate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export interface ImportFileResult {
  file: string;
  slug: string | null;
  /** created = draft; scheduled = draft-with-go-live-time; skipped = slug exists. */
  status: "created" | "scheduled" | "skipped" | "error";
  message: string;
  /** Set for created/scheduled (and skipped when the existing post is known) — links to /admin/blog/<id>. */
  id: string | null;
  scheduled_for: string | null;
}

/**
 * Import .md files (front-matter: title + slug required; excerpt, seo_title,
 * seo_description, tags, scheduled_for optional). Rows are created as draft,
 * or scheduled when scheduled_for is given. NEVER overwrites an existing
 * slug — those files are skipped and reported.
 */
export async function importPostsAction(
  files: { name: string; content: string }[]
): Promise<{ results: ImportFileResult[] } | { error: string }> {
  try {
    const { supabase } = await requireAdmin();
    if (!files.length) return { error: "No files to import." };
    if (files.length > 50) {
      return { error: "Import at most 50 files at a time." };
    }

    const results: ImportFileResult[] = [];
    const seenSlugs = new Set<string>();
    let createdAny = false;

    for (const file of files) {
      const fail = (message: string, slug: string | null = null) =>
        results.push({
          file: file.name,
          slug,
          status: "error",
          message,
          id: null,
          scheduled_for: null,
        });

      const parsed = parseFrontMatter(file.content);
      if (!parsed) {
        fail(
          'No front-matter found — the file must start with a "---" block (see format help).'
        );
        continue;
      }
      const { meta, body } = parsed;

      const title = typeof meta.title === "string" ? meta.title.trim() : "";
      const slug = slugify(
        typeof meta.slug === "string" ? meta.slug.trim() : ""
      );
      if (!title || !slug) {
        fail("Front-matter must include both title and slug.");
        continue;
      }
      if (seenSlugs.has(slug)) {
        results.push({
          file: file.name,
          slug,
          status: "skipped",
          message: `Another file in this import already used the slug "${slug}".`,
          id: null,
          scheduled_for: null,
        });
        continue;
      }
      seenSlugs.add(slug);

      let scheduledFor: string | null = null;
      const rawWhen =
        typeof meta.scheduled_for === "string" ? meta.scheduled_for.trim() : "";
      if (rawWhen) {
        scheduledFor = parseScheduledFor(rawWhen);
        if (!scheduledFor) {
          fail(
            `Could not read scheduled_for "${rawWhen}" — use "YYYY-MM-DD HH:mm" (UTC) or full ISO like 2026-08-01T09:00:00Z.`,
            slug
          );
          continue;
        }
      }

      // NEVER overwrite an existing slug — skip and report instead.
      const { data: existing, error: readErr } = await supabase
        .from("blog_posts")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (readErr) {
        fail(readErr.message, slug);
        continue;
      }
      if (existing) {
        results.push({
          file: file.name,
          slug,
          status: "skipped",
          message: `A post with the slug "${slug}" already exists — left untouched.`,
          id: (existing as { id: string }).id,
          scheduled_for: null,
        });
        continue;
      }

      const tags = Array.isArray(meta.tags)
        ? meta.tags
        : typeof meta.tags === "string" && meta.tags
          ? meta.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [];

      const row = {
        slug,
        title,
        excerpt:
          (typeof meta.excerpt === "string" && meta.excerpt.trim()) || null,
        content_md: body,
        tags,
        status: scheduledFor ? "scheduled" : "draft",
        scheduled_for: scheduledFor,
        seo_title:
          (typeof meta.seo_title === "string" && meta.seo_title.trim()) || null,
        seo_description:
          (typeof meta.seo_description === "string" &&
            meta.seo_description.trim()) ||
          null,
        author_name: "Justin Brewer",
      };

      const { data: inserted, error: insertErr } = await supabase
        .from("blog_posts")
        .insert(row)
        .select("id")
        .single();
      if (insertErr) {
        if (insertErr.code === "23505") {
          results.push({
            file: file.name,
            slug,
            status: "skipped",
            message: `A post with the slug "${slug}" already exists — left untouched.`,
            id: null,
            scheduled_for: null,
          });
        } else {
          fail(insertErr.message, slug);
        }
        continue;
      }

      createdAny = true;
      const pastDue =
        scheduledFor !== null && new Date(scheduledFor).getTime() <= Date.now();
      results.push({
        file: file.name,
        slug,
        status: scheduledFor ? "scheduled" : "created",
        message: scheduledFor
          ? pastDue
            ? "Scheduled time is already past, so it is publicly visible now."
            : "Scheduled — goes live on its own at the time below."
          : "Created as a draft.",
        id: (inserted as { id: string }).id,
        scheduled_for: scheduledFor,
      });
    }

    if (createdAny) {
      revalidateBlog();
      revalidatePath("/admin/blog");
    }
    return { results };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}
