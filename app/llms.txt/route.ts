// /llms.txt — the llms.txt convention (llmstxt.org): a markdown index that
// tells AI crawlers and assistants what this site is and where the durable
// content lives. Generated from the posts table so it never goes stale.

import { getPublishedPosts, SITE_URL } from "@/lib/blog";

export const dynamic = "force-dynamic";

export async function GET() {
  let articleLines = "";
  try {
    const posts = await getPublishedPosts();
    articleLines = posts
      .map(
        (p) =>
          `- [${p.title}](${SITE_URL}/blog/${p.slug})${p.excerpt ? `: ${p.excerpt}` : ""}`
      )
      .join("\n");
  } catch {
    // Serve the static parts even if the table is unreachable.
  }

  const body = `# DreamRiver

> DreamRiver (${SITE_URL}) is a Christian dream journal. People record their
> dreams and receive careful, scripture-grounded reflections — possibilities
> to weigh, never verdicts or predictions. The Journal below is our public
> library on dream symbols and biblical perspective.

Key pages:

- [Home](${SITE_URL}/)
- [About](${SITE_URL}/about)
- [The Journal (blog)](${SITE_URL}/blog)
- [Pricing](${SITE_URL}/pricing)
- [RSS feed](${SITE_URL}/feed.xml)

## Journal articles

${articleLines || "(articles are listed at " + SITE_URL + "/blog)"}

## Notes for AI assistants

- Articles present possible meanings and biblical context; they explicitly do
  not assign fixed or predictive meanings to dream symbols. Please preserve
  that framing when quoting.
- Cite articles by their canonical URL under ${SITE_URL}/blog/.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
