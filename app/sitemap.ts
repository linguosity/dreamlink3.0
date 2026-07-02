import { MetadataRoute } from "next";
import { createClient } from "@/utils/supabase/server";
import { SITE_URL } from "@/lib/blog";

// NOTE: VERCEL_URL is the *deployment* host (…vercel.app), not the custom
// domain — using it here made sitemap URLs point away from dreamriver.io.
// Always emit the canonical origin in production.
const baseUrl =
  process.env.NODE_ENV === "production" ? SITE_URL : "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/landing`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/help`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/sign-in`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/sign-up`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  // Published blog posts. Sitemap generation must never crash the route,
  // so fall back to static pages when the table isn't reachable.
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("blog_posts")
      .select("slug, updated_at")
      .eq("status", "published");

    const posts: MetadataRoute.Sitemap = (data ?? []).map(
      (p: { slug: string; updated_at: string }) => ({
        url: `${baseUrl}/blog/${p.slug}`,
        lastModified: new Date(p.updated_at),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })
    );
    return [...staticPages, ...posts];
  } catch {
    return staticPages;
  }
}
