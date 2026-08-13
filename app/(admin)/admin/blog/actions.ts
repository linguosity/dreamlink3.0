"use server";

// Blog admin server actions. /admin/* is gated by middleware + layout, but
// each action re-verifies is_admin (defense in depth, matches app/admin/actions.ts).

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/blog";
import {
  isImportPlanMode,
  planAssignments,
  planStartError,
  type ImportPlan,
} from "./_lib/import-plan";
import { extractCoverScene } from "@/lib/blogCoverScene";
import { buildBlogCoverPrompt, seedFromSlug } from "@/schema/blogCover";
import { generateAndStoreBlogCover } from "@/utils/imageGeneration";

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
  /**
   * created = draft; published = live immediately; scheduled = has a go-live
   * time (from its own front-matter or the import plan); skipped = slug exists.
   */
  status: "created" | "published" | "scheduled" | "skipped" | "error";
  message: string;
  /** Set for created/scheduled (and skipped when the existing post is known) — links to /admin/blog/<id>. */
  id: string | null;
  scheduled_for: string | null;
}

/**
 * Import .md files (front-matter: title + slug required; excerpt, seo_title,
 * seo_description, tags, scheduled_for optional) under an optional publish
 * plan. No plan (or mode "draft") is today's behavior: rows are created as
 * draft, or scheduled when the file's front-matter has scheduled_for. Plan
 * modes: "publish" = status published + published_at now; "daily"/"weekly"
 * = status scheduled at times recomputed HERE from plan.startAt via the
 * shared planAssignments helper — client-computed dates are never trusted.
 * A file's own front-matter scheduled_for ALWAYS wins over the plan and
 * consumes no daily/weekly slot. NEVER overwrites an existing slug — those
 * files are skipped and reported.
 */
export async function importPostsAction(
  files: { name: string; content: string }[],
  plan?: ImportPlan
): Promise<{ results: ImportFileResult[] } | { error: string }> {
  try {
    const { supabase } = await requireAdmin();
    if (!files.length) return { error: "No files to import." };
    if (files.length > 50) {
      return { error: "Import at most 50 files at a time." };
    }

    // Validate the plan before touching anything — a bad plan imports nothing.
    const effectivePlan: ImportPlan = plan ?? { mode: "draft" };
    if (!isImportPlanMode(effectivePlan.mode)) {
      return { error: "Unknown import plan mode." };
    }
    const planError = planStartError(effectivePlan);
    if (planError) return { error: planError };

    // Recompute every assignment server-side with the same shared helper the
    // client preview uses. "Has own schedule" comes from the authoritative
    // front-matter parse: any non-empty scheduled_for value claims the slot
    // exemption (even one that later fails to parse as a date — that file
    // errors out, but the other files' slots don't shift under them).
    const parsedFiles = files.map((f) => parseFrontMatter(f.content));
    const assignments = planAssignments(
      parsedFiles.map((p) => ({
        hasOwnSchedule:
          p !== null &&
          typeof p.meta.scheduled_for === "string" &&
          p.meta.scheduled_for.trim() !== "",
      })),
      effectivePlan
    );

    const results: ImportFileResult[] = [];
    const seenSlugs = new Set<string>();
    const publishedSlugs: string[] = [];
    let createdAny = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const assignment = assignments[i];
      const fail = (message: string, slug: string | null = null) =>
        results.push({
          file: file.name,
          slug,
          status: "error",
          message,
          id: null,
          scheduled_for: null,
        });

      const parsed = parsedFiles[i];
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

      // Apply the plan. The file's own front-matter scheduled_for (parsed
      // above) always wins, regardless of mode.
      let status: "draft" | "scheduled" | "published" = "draft";
      let rowScheduledFor: string | null = null;
      let publishedAt: string | null = null;
      if (scheduledFor) {
        status = "scheduled";
        rowScheduledFor = scheduledFor;
      } else if (assignment.kind === "publish") {
        status = "published";
        publishedAt = new Date().toISOString();
      } else if (assignment.kind === "scheduled") {
        status = "scheduled";
        rowScheduledFor = assignment.scheduledFor;
      }

      const row = {
        slug,
        title,
        excerpt:
          (typeof meta.excerpt === "string" && meta.excerpt.trim()) || null,
        content_md: body,
        tags,
        status,
        scheduled_for: rowScheduledFor,
        published_at: publishedAt,
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
      if (status === "published") publishedSlugs.push(slug);
      const pastDue =
        rowScheduledFor !== null &&
        new Date(rowScheduledFor).getTime() <= Date.now();
      const ownSchedule = scheduledFor !== null;
      let resultStatus: ImportFileResult["status"];
      let message: string;
      if (status === "published") {
        resultStatus = "published";
        message = "Published — live on dreamriver.io now.";
      } else if (status === "scheduled") {
        resultStatus = "scheduled";
        message = pastDue
          ? ownSchedule
            ? "The file's own scheduled_for is already past, so it is publicly visible now."
            : "Scheduled time is already past, so it is publicly visible now."
          : ownSchedule
            ? "Kept the file's own scheduled_for from its front-matter."
            : "Scheduled by your import plan.";
      } else {
        resultStatus = "created";
        message = "Created as a draft.";
      }
      results.push({
        file: file.name,
        slug,
        status: resultStatus,
        message,
        id: (inserted as { id: string }).id,
        scheduled_for: rowScheduledFor,
      });
    }

    if (createdAny) {
      revalidateBlog();
      // Published imports are live right now — drop their page caches too.
      for (const slug of publishedSlugs) revalidatePath(`/blog/${slug}`);
      revalidatePath("/admin/blog");
    }
    return { results };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ── Cover image generation ──────────────────────────────────────────
//
// Deliberately a separate action rather than part of savePostAction: a
// generation is a BFL submit plus polling, tens of seconds in the worst case,
// and nobody should be unable to save a typo fix because an image service is
// slow. It also means a cover can be regenerated without touching the post.

export interface GenerateCoverResult {
  ok: true;
  coverImageUrl: string;
  /** The visual scene the image was drawn from, surfaced so an odd-looking
   *  cover is diagnosable without reading server logs. */
  scene: string;
  /** True when scene extraction failed and the house fallback was used. */
  usedFallbackScene: boolean;
}

/**
 * Generates (or regenerates) the cover for one post and persists the URL.
 *
 * Seeded on the slug, so re-running this on an unedited post returns the same
 * image rather than silently reshuffling art on something already published.
 * Editing the article changes the extracted scene, which changes the prompt,
 * which produces something new — which is the behaviour you want.
 */
export async function generateCoverAction(
  postId: string
): Promise<GenerateCoverResult | { error: string }> {
  try {
    const { supabase } = await requireAdmin();

    const { data, error } = await supabase
      .from("blog_posts")
      .select("slug, title, excerpt, content_md")
      .eq("id", postId)
      .single();
    if (error) return { error: error.message };

    const post = data as {
      slug: string;
      title: string;
      excerpt: string | null;
      content_md: string | null;
    } | null;
    if (!post) return { error: "Post not found" };

    const { scene, fallback } = await extractCoverScene({
      title: post.title,
      excerpt: post.excerpt,
      contentMd: post.content_md,
    });

    const url = await generateAndStoreBlogCover(
      post.slug,
      buildBlogCoverPrompt(scene),
      seedFromSlug(post.slug)
    );
    if (!url) {
      // generateAndStoreBlogCover returns null (rather than throwing) when
      // BFL_API_KEY or the service-role key is missing — a configuration
      // problem, not a failure of this post.
      return {
        error:
          "Image generation is not configured on this environment (BFL_API_KEY or Supabase service role key missing).",
      };
    }

    const { error: saveError } = await supabase
      .from("blog_posts")
      .update({ cover_image_url: url })
      .eq("id", postId);
    if (saveError) return { error: saveError.message };

    revalidateBlog(post.slug);
    return { ok: true, coverImageUrl: url, scene, usedFallbackScene: fallback };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export interface BulkCoverResult {
  ok: true;
  generated: { id: string; slug: string; title: string }[];
  failed: { slug: string; title: string; reason: string }[];
  /** Posts left untouched because the run hit its cap — reported rather than
   *  silently dropped, so "done" never overstates what happened. */
  remaining: number;
}

/**
 * Generates covers for posts that do not have one.
 *
 * This is what an import run should be followed by. Generation is NOT done
 * inline during import on purpose: each image is a submit plus polling, so
 * eight articles in one request would sit far past any sensible server action
 * timeout, and a slow image service would take the whole import down with it.
 *
 * Capped per invocation for the same reason. The cap is a wall-clock budget,
 * not a judgement about how many posts deserve covers — run it again for the
 * rest, which `remaining` tells you about.
 *
 * The cap is 1, and that number is arithmetic rather than taste: the invoking
 * page allows maxDuration = 60 (the Vercel Hobby ceiling) and one image is
 * budgeted at TIMEOUT_MS = 50_000, so a second image cannot fit in the worst
 * case. The previous default of 5 could never complete — the function was
 * killed every time, which is why this feature appeared to do nothing.
 *
 * A typical generation finishes well under 50s, so 2 would *usually* work.
 * "Usually" is how you lose an evening to an intermittent bug, so it stays at
 * 1. Doing genuine batches needs a background job that survives the request,
 * not a bigger number here.
 */
export async function generateMissingCoversAction(
  limit = 1
): Promise<BulkCoverResult | { error: string }> {
  try {
    const { supabase } = await requireAdmin();

    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, slug, title")
      .is("cover_image_url", null)
      .order("created_at", { ascending: true });
    if (error) return { error: error.message };

    const missing = (data ?? []) as { id: string; slug: string; title: string }[];
    const batch = missing.slice(0, limit);

    const generated: BulkCoverResult["generated"] = [];
    const failed: BulkCoverResult["failed"] = [];

    // Sequential, not parallel: BFL is rate-limited per key, and a burst of
    // concurrent submits is the reliable way to get 429s on a run that would
    // have succeeded slowly.
    for (const post of batch) {
      const result = await generateCoverAction(post.id);
      if ("error" in result) {
        failed.push({ slug: post.slug, title: post.title, reason: result.error });
      } else {
        generated.push(post);
      }
    }

    return {
      ok: true,
      generated,
      failed,
      remaining: Math.max(0, missing.length - batch.length),
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}
