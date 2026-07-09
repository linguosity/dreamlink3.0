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
    const patch: Record<string, unknown> = { status };
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
