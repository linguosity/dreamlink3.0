// /feed.xml — RSS 2.0 feed of the Journal. Feeds are still how aggregators
// and several AI crawlers discover fresh content; nearly free to serve.
// Request-rendered (Supabase read) with hourly CDN caching via headers.

import { getPublishedPosts, effectivePublishedAt, SITE_URL } from "@/lib/blog";

export const dynamic = "force-dynamic";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  let items = "";
  try {
    const posts = await getPublishedPosts();
    items = posts
      .map((p) => {
        const url = `${SITE_URL}/blog/${p.slug}`;
        const date = effectivePublishedAt(p);
        return [
          "    <item>",
          `      <title>${esc(p.title)}</title>`,
          `      <link>${url}</link>`,
          `      <guid isPermaLink="true">${url}</guid>`,
          p.excerpt ? `      <description>${esc(p.excerpt)}</description>` : "",
          date ? `      <pubDate>${new Date(date).toUTCString()}</pubDate>` : "",
          `      <author>hello@dreamriver.io (${esc(p.author_name)})</author>`,
          "    </item>",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n");
  } catch {
    // An empty (but valid) feed beats a 500 for crawlers.
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The DreamRiver Journal</title>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Biblical perspective on dreams and dream symbols — articles from DreamRiver.</description>
    <language>en-us</language>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
