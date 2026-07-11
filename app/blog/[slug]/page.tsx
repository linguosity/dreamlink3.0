// app/blog/[slug]/page.tsx — single Journal article (public, SEO)
// Server-rendered markdown with per-post metadata, OG tags, and JSON-LD.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SiteHeader from "@/components/SiteHeader";
import {
  getPostBySlugForAdmin,
  getPublishedPostBySlug,
  readingTimeMinutes,
  SITE_URL,
} from "@/lib/blog";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) {
    // Admins can preview drafts at their future URL (see below) — make sure
    // those pages are never indexed, even if a crawler somehow had a session.
    const draft = await getPostBySlugForAdmin(slug);
    if (draft) {
      return {
        title: `[Draft] ${draft.seo_title || draft.title} — The DreamRiver Journal`,
        robots: { index: false, follow: false },
      };
    }
    return { title: "Article not found — DreamRiver" };
  }

  const title = post.seo_title || post.title;
  const description =
    post.seo_description || post.excerpt || post.content_md.slice(0, 155);
  const url = `${SITE_URL}/blog/${post.slug}`;

  return {
    title: `${title} — The DreamRiver Journal`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: post.published_at ?? undefined,
      authors: [post.author_name],
      images: post.cover_image_url ? [{ url: post.cover_image_url }] : undefined,
    },
    twitter: {
      card: post.cover_image_url ? "summary_large_image" : "summary",
      title,
      description,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  let post = await getPublishedPostBySlug(slug);
  let isDraftPreview = false;
  if (!post) {
    // Not published: only admins get a draft preview here (anon/regular
    // visitors 404). This route is request-rendered (Supabase client reads
    // cookies), so the preview is never cached for the public.
    const draft = await getPostBySlugForAdmin(slug);
    if (!draft) notFound();
    post = draft;
    isDraftPreview = draft.status !== "published";
  }

  const minutes = readingTimeMinutes(post.content_md);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seo_description || post.excerpt || undefined,
    image: post.cover_image_url || undefined,
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at,
    author: { "@type": "Person", name: post.author_name },
    publisher: {
      "@type": "Organization",
      name: "DreamRiver",
      url: SITE_URL,
    },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };

  return (
    <div className="dark w-full min-h-screen bg-night text-cream">
      <SiteHeader />
      {!isDraftPreview ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}

      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 pt-10 sm:pt-14 pb-16 sm:pb-24">
        {isDraftPreview ? (
          <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
            <strong className="uppercase tracking-[0.14em] text-[11px] font-bold text-gold">
              Draft preview
            </strong>
            <span className="text-cream/70">
              Only admins can see this page — readers get a 404 until you
              publish.
            </span>
            <Link
              href={`/admin/blog/${post.id}`}
              className="text-gold underline underline-offset-4 hover:text-gold-light"
            >
              Back to editor
            </Link>
          </div>
        ) : null}

        <nav className="text-sm">
          <Link
            href="/blog"
            className="text-cream/60 hover:text-gold transition-colors"
          >
            ← The Journal
          </Link>
        </nav>

        <header className="mt-6">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-[0.16em] text-cream/50 font-semibold">
            {post.tags[0] ? <span className="text-gold">{post.tags[0]}</span> : null}
            {post.published_at ? (
              <time dateTime={post.published_at}>
                {new Date(post.published_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            ) : null}
            <span aria-hidden>·</span>
            <span>{minutes} min read</span>
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-[2.75rem] font-semibold leading-tight mt-3">
            {post.title}
          </h1>
          {post.excerpt ? (
            <p className="text-cream/70 text-base sm:text-lg mt-4 leading-relaxed">
              {post.excerpt}
            </p>
          ) : null}
          <p className="text-sm text-cream/50 mt-4">By {post.author_name}</p>
        </header>

        {post.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image_url}
            alt=""
            className="w-full rounded-xl mt-8 border border-cream/10"
          />
        ) : null}

        <article className="prose-blog max-w-[65ch] mt-8 sm:mt-10">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content_md}
          </ReactMarkdown>
        </article>

        {/* CTA */}
        <aside className="mt-12 sm:mt-16 rounded-2xl border border-gold/25 bg-night-soft/40 p-6 sm:p-8 text-center">
          <h2 className="font-serif text-xl sm:text-2xl font-semibold">
            Bring your own dream to the water
          </h2>
          <p className="text-cream/70 text-sm mt-2 max-w-sm mx-auto">
            DreamRiver interprets your dreams through a biblical lens — free to
            start.
          </p>
          <Link
            href="/sign-up"
            className="inline-block mt-5 rounded-full bg-gold text-night-deep font-semibold px-6 py-2.5 text-sm hover:bg-gold-light transition-colors focus-visible:outline-2 focus-visible:outline-cream"
          >
            Try DreamRiver free
          </Link>
        </aside>
      </main>
    </div>
  );
}
