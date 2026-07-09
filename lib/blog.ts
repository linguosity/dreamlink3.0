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
  status: "draft" | "published";
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Canonical site origin for SEO surfaces (sitemap, OG, JSON-LD). */
export const SITE_URL = "https://dreamriver.io";

export async function getPublishedPosts(): Promise<BlogPost[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return (data as BlogPost[] | null) ?? [];
}

/** Lightweight preview shape for cross-surface post cards (no content_md). */
export type BlogPostPreview = Pick<
  BlogPost,
  "id" | "slug" | "title" | "excerpt" | "tags" | "published_at"
>;

/**
 * Newest N published posts with columns trimmed for preview cards
 * (components/RecentPosts on /landing and the dashboard). Same anon-safe
 * status=published filter as getPublishedPosts, so logged-out visitors get
 * exactly what RLS already allows; drafts never surface here.
 */
export async function getRecentPublishedPosts(
  limit = 3
): Promise<BlogPostPreview[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, tags, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data as BlogPostPreview[] | null) ?? [];
}

export async function getPublishedPostBySlug(
  slug: string
): Promise<BlogPost | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("status", "published")
    .eq("slug", slug)
    .single();
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
