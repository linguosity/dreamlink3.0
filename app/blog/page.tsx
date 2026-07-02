// app/blog/page.tsx — The DreamRiver Journal (public, SEO)
// Night-themed per the Journal mockup; posts are authored in /admin/blog.

import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { getPublishedPosts, readingTimeMinutes, SITE_URL } from "@/lib/blog";

export const metadata: Metadata = {
  title: "The DreamRiver Journal — Biblical Dream Interpretation Blog",
  description:
    "Articles on biblical dream interpretation, dream symbols in scripture, and hearing God through your dreams — from the team behind DreamRiver.",
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: "The DreamRiver Journal",
    description:
      "Biblical dream interpretation, dream symbols in scripture, and hearing God through your dreams.",
    url: `${SITE_URL}/blog`,
    type: "website",
  },
};

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();
  const [featured, ...rest] = posts;

  return (
    // `dark` wrapper: SiteHeader + shared components render their dark:
    // variants so they stay legible on the night background.
    <div className="dark min-h-screen bg-night text-cream">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-10 sm:pt-14 pb-16 sm:pb-24">
        {/* Hero */}
        <header className="max-w-2xl">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-gold">
            The DreamRiver Journal
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight mt-3">
            Understanding the dreams God gives you
          </h1>
          <p className="text-cream/70 text-sm sm:text-base mt-4 leading-relaxed">
            Plain-language articles on dream symbols in scripture, biblical
            interpretation, and learning to listen at night.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="mt-16 text-cream/60">
            First articles are on the way — check back soon.
          </p>
        ) : (
          <>
            {/* Featured (newest) */}
            {featured ? (
              <Link
                href={`/blog/${featured.slug}`}
                className="group block mt-10 sm:mt-14 rounded-2xl border border-cream/10 bg-night-soft/40 hover:bg-night-soft/70 transition-colors overflow-hidden focus-visible:outline-2 focus-visible:outline-gold"
              >
                <div className="grid grid-cols-1 md:grid-cols-2">
                  {featured.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={featured.cover_image_url}
                      alt=""
                      className="h-52 md:h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-52 md:h-auto bg-[radial-gradient(ellipse_at_top_left,oklch(0.30_0.07_252),oklch(0.18_0.06_250))] flex items-center justify-center">
                      <span className="font-serif text-5xl text-gold/50">✦</span>
                    </div>
                  )}
                  <div className="p-6 sm:p-8">
                    <PostMeta
                      date={featured.published_at}
                      minutes={readingTimeMinutes(featured.content_md)}
                      tags={featured.tags}
                    />
                    <h2 className="font-serif text-2xl sm:text-3xl font-semibold leading-snug mt-3 group-hover:text-gold-light transition-colors">
                      {featured.title}
                    </h2>
                    {featured.excerpt ? (
                      <p className="text-cream/70 text-sm sm:text-base mt-3 leading-relaxed line-clamp-3">
                        {featured.excerpt}
                      </p>
                    ) : null}
                    <span className="inline-block mt-5 text-sm font-semibold text-gold">
                      Read article →
                    </span>
                  </div>
                </div>
              </Link>
            ) : null}

            {/* Grid */}
            {rest.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-8 sm:mt-10">
                {rest.map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group rounded-xl border border-cream/10 bg-night-soft/30 hover:bg-night-soft/60 transition-colors p-5 sm:p-6 flex flex-col focus-visible:outline-2 focus-visible:outline-gold"
                  >
                    <PostMeta
                      date={post.published_at}
                      minutes={readingTimeMinutes(post.content_md)}
                      tags={post.tags}
                    />
                    <h2 className="font-serif text-lg sm:text-xl font-semibold leading-snug mt-2.5 group-hover:text-gold-light transition-colors">
                      {post.title}
                    </h2>
                    {post.excerpt ? (
                      <p className="text-cream/60 text-sm mt-2 leading-relaxed line-clamp-3">
                        {post.excerpt}
                      </p>
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : null}
          </>
        )}

        {/* CTA */}
        <section className="mt-16 sm:mt-24 rounded-2xl border border-gold/25 bg-night-soft/40 p-6 sm:p-10 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold">
            Had a dream you can’t shake?
          </h2>
          <p className="text-cream/70 text-sm sm:text-base mt-2 max-w-md mx-auto">
            Write it down and receive a scripture-grounded interpretation in
            minutes. Your first three are free.
          </p>
          <Link
            href="/sign-up"
            className="inline-block mt-6 rounded-full bg-gold text-night-deep font-semibold px-7 py-3 text-sm hover:bg-gold-light transition-colors focus-visible:outline-2 focus-visible:outline-cream"
          >
            Interpret my dream
          </Link>
        </section>
      </main>
    </div>
  );
}

function PostMeta({
  date,
  minutes,
  tags,
}: {
  date: string | null;
  minutes: number;
  tags: string[];
}) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-[0.14em] text-cream/50 font-semibold">
      {tags[0] ? <span className="text-gold">{tags[0]}</span> : null}
      {date ? (
        <time dateTime={date}>
          {new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </time>
      ) : null}
      <span aria-hidden>·</span>
      <span>{minutes} min read</span>
    </p>
  );
}
