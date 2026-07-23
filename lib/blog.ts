import { createClient } from "@/utils/supabase/server";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content_md: string;
  cover_image_url: string | null;
  author_name: string;
  tags: string[];
  status: "draft" | "scheduled" | "published";
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
}

/** Canonical site origin for SEO surfaces (sitemap, OG, JSON-LD). */
export const SITE_URL = "https://dreamriver.io";

/**
 * PostgREST `.or()` filter mirroring the blog_posts public-read RLS policy:
 *
 *   status = 'published' OR (status = 'scheduled' AND scheduled_for <= now())
 *
 * "Lazy publish": there is no cron flipping scheduled rows to published — a
 * scheduled post simply becomes publicly visible the moment now() passes its
 * scheduled_for. RLS enforces this for anon sessions; every public query also
 * applies this filter so admin sessions (whose RLS can read everything) see
 * the same public lists as everyone else.
 */
export function publicPostsOrFilter(now: Date = new Date()): string {
  return `status.eq.published,and(status.eq.scheduled,scheduled_for.lte.${now.toISOString()})`;
}

/**
 * Effective publish date for ordering + display:
 * COALESCE(published_at, scheduled_for). A lazily-published scheduled post
 * keeps published_at NULL, so its scheduled_for is its public date.
 */
export function effectivePublishedAt(
  post: Pick<BlogPost, "published_at" | "scheduled_for">
): string | null {
  return post.published_at ?? post.scheduled_for ?? null;
}

/** Newest-first by effective publish date (ISO strings compare lexically). */
function byEffectiveDateDesc(
  a: Pick<BlogPost, "published_at" | "scheduled_for">,
  b: Pick<BlogPost, "published_at" | "scheduled_for">
): number {
  return (effectivePublishedAt(b) ?? "").localeCompare(
    effectivePublishedAt(a) ?? ""
  );
}

export async function getPublishedPosts(): Promise<BlogPost[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .or(publicPostsOrFilter());
  return (((data as BlogPost[] | null) ?? []) as BlogPost[]).sort(
    byEffectiveDateDesc
  );
}

/** Lightweight preview shape for cross-surface post cards (no content_md). */
export type BlogPostPreview = Pick<
  BlogPost,
  "id" | "slug" | "title" | "excerpt" | "tags" | "published_at" | "scheduled_for"
>;

/**
 * Newest N publicly-visible posts with columns trimmed for preview cards
 * (components/RecentPosts on /landing and the dashboard). Same anon-safe
 * filter as getPublishedPosts (published OR scheduled-and-due), so logged-out
 * visitors get exactly what RLS already allows; drafts and not-yet-due
 * scheduled posts never surface here. Sorted in JS by the effective publish
 * date (COALESCE(published_at, scheduled_for)) since PostgREST can't order by
 * that expression — the blog is small, so fetching then slicing is fine.
 */
export async function getRecentPublishedPosts(
  limit = 3
): Promise<BlogPostPreview[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, tags, published_at, scheduled_for")
    .or(publicPostsOrFilter());
  return (((data as BlogPostPreview[] | null) ?? []) as BlogPostPreview[])
    .sort(byEffectiveDateDesc)
    .slice(0, limit);
}

export async function getPublishedPostBySlug(
  slug: string
): Promise<BlogPost | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .or(publicPostsOrFilter())
    .maybeSingle();
  return (data as BlogPost | null) ?? null;
}

/**
 * Admin-only fetch of a post in ANY status, used by /blog/[slug] to let
 * admins preview drafts at their future public URL. Returns null unless the
 * current session belongs to a profile with is_admin. RLS
 * ("blog_posts_admin_all") enforces the same rule at the DB layer, so the
 * explicit check here is defense in depth, not load-bearing.
 */
export async function getPostBySlugForAdmin(
  slug: string
): Promise<BlogPost | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profile")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();
  if (!profile?.is_admin) return null;
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as BlogPost | null) ?? null;
}

/** Turn a title into a URL slug: "God's Voice at Night" -> "gods-voice-at-night" */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Rough reading time from markdown (200 wpm). */
export function readingTimeMinutes(md: string): number {
  const words = md.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
