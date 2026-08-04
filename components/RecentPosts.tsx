// components/RecentPosts.tsx
//
// Server-rendered "From the Journal" discovery surfaces for the public blog.
//
//   <RecentPosts variant="landing" />  — full marketing section on /landing:
//     eyebrow + heading, 3 post cards (Features-card visual language), and a
//     "Read the Journal →" link. Post links are clean /blog/<slug> hrefs
//     (internal SEO links); only the index link carries utm.
//
//   <RecentPosts variant="app" />      — quiet strip under the dashboard's
//     dream gallery: 2–3 titles + dates and a single "Journal →" link. All
//     app-variant links carry utm_source=app&utm_medium=dashboard.
//
// IMPORTANT: renders null while there are zero publicly-visible posts
// (published, or scheduled with scheduled_for in the past — lazy publish),
// so both surfaces invisibly no-op until the first post ships. Fetches at
// request time via the cookie-scoped Supabase client — same render model as
// /blog itself; no ISR/revalidate.

import Link from "next/link";
import {
  effectivePublishedAt,
  getRecentPublishedPosts,
  type BlogPostPreview,
} from "@/lib/blog";

interface RecentPostsProps {
  variant: "landing" | "app";
  limit?: number;
}

function formatPostDate(date: string | null): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function RecentPosts({
  variant,
  limit = 3,
}: RecentPostsProps) {
  // Anon-safe: only publicly-visible rows are selected (published OR
  // scheduled-and-due; matches the /blog RLS path for logged-out visitors).
  // Swallow failures — a missing blog table (migration not yet applied) must
  // never take down landing or the dashboard.
  let posts: BlogPostPreview[] = [];
  try {
    posts = await getRecentPublishedPosts(limit);
  } catch {
    posts = [];
  }

  if (posts.length === 0) return null;

  return variant === "landing" ? (
    <LandingJournalSection posts={posts} />
  ) : (
    <AppJournalStrip posts={posts} />
  );
}

/* ── Landing variant ─────────────────────────────────────────────────────
   Mirrors the Features/Plans section rhythm: translucent light band,
   gold eyebrow, centered serif heading, 3-up card grid. */
function LandingJournalSection({ posts }: { posts: BlogPostPreview[] }) {
  return (
    <section
      aria-labelledby="journal-heading"
      className="py-20 sm:py-24 lg:py-32 bg-white/70 dark:bg-slate-950/70 backdrop-blur-sm"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 lg:mb-12">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--gold-deep)] dark:text-gold">
            From the Journal
          </p>
          <h2
            id="journal-heading"
            className="text-balance text-[clamp(1.75rem,3.5vw,2.5rem)] text-gray-900 dark:text-white mt-3 mb-3"
          >
            Go deeper into scriptural dream symbolism
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Plain-language articles on dream symbols in scripture,
            interpretation, and learning to listen at night.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 [&>*]:h-full">
          {posts.map((post) => {
            const publicDate = effectivePublishedAt(post);
            const dateLabel = formatPostDate(publicDate);
            return (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group flex flex-col bg-white dark:bg-slate-900 rounded-2xl
                           ring-1 ring-gray-200/70 dark:ring-slate-800
                           p-6 sm:p-8 transition
                           hover:shadow-lg hover:-translate-y-1 hover:ring-gold-light
                           focus-ring"
              >
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-[0.14em] font-semibold text-gray-500 dark:text-gray-400">
                  {post.tags[0] ? (
                    <span className="text-[color:var(--gold-deep)] dark:text-gold">
                      {post.tags[0]}
                    </span>
                  ) : null}
                  {dateLabel ? (
                    <time dateTime={publicDate ?? undefined}>
                      {dateLabel}
                    </time>
                  ) : null}
                </p>
                <h3 className="text-xl text-gray-900 dark:text-white leading-snug mt-3 mb-2 group-hover:text-[color:var(--gold-deep)] dark:group-hover:text-gold-light transition-colors">
                  {post.title}
                </h3>
                {post.excerpt ? (
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed line-clamp-2">
                    {post.excerpt}
                  </p>
                ) : null}
              </Link>
            );
          })}
        </div>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-8 lg:mt-10">
          <Link
            href="/blog?utm_source=landing&utm_medium=journal_section"
            className="text-[color:var(--gold-deep)] dark:text-gold font-semibold hover:underline underline-offset-4 focus-ring rounded"
          >
            Read the Journal →
          </Link>
        </p>
      </div>
    </section>
  );
}

/* ── App variant ─────────────────────────────────────────────────────────
   Visually quiet strip for the logged-in dashboard: mono eyebrow (echoes the
   greeting's date eyebrow), 2–3 truncated title rows + dates, one Journal
   link. Muted tokens only — must not compete with the dream-entry flow. */
/**
 * Editorial "journal note" — the newest post gets a real headline, its excerpt,
 * and a read link; any further posts stay as a quiet title list underneath.
 *
 * Previously this rendered three truncated titles in a muted box, which asked
 * the reader to care about a link with no reason to click it. The excerpt is
 * already written (it's the SEO meta description) and was going unused in-app.
 *
 * This is also the only row on the dashboard with content on day one: the
 * featured-dream and symbol-thread rows are both empty for a new account, so
 * without this the dashboard reads unfinished until someone has journalled.
 */
export function AppJournalStrip({ posts }: { posts: BlogPostPreview[] }) {
  const [lead, ...rest] = posts.slice(0, 3);
  if (!lead) return null;
  const leadDate = effectivePublishedAt(lead);
  const leadLabel = formatPostDate(leadDate);

  return (
    <aside
      aria-labelledby="journal-strip-label"
      className="border-t border-border pt-5"
    >
      <div className="flex items-baseline justify-between gap-4">
        <span
          id="journal-strip-label"
          className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground"
        >
          From the Journal
        </span>
        {leadLabel ? (
          <time
            dateTime={leadDate ?? undefined}
            className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
          >
            {leadLabel}
          </time>
        ) : null}
      </div>

      <Link
        href={`/blog/${lead.slug}?utm_source=app&utm_medium=dashboard`}
        className="group mt-3 block focus-ring rounded"
      >
        <h3 className="font-serif text-[22px] leading-tight text-balance group-hover:underline underline-offset-4 decoration-1">
          {lead.title}
        </h3>
        {lead.excerpt ? (
          <p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-muted-foreground">
            {lead.excerpt}
          </p>
        ) : null}
        <span className="mt-2.5 inline-block text-[13px] text-primary">
          Read the piece →
        </span>
      </Link>

      {rest.length > 0 ? (
        <ul className="mt-4 space-y-1.5 border-t border-border/60 pt-3">
          {rest.map((post) => {
            const publicDate = effectivePublishedAt(post);
            const dateLabel = formatPostDate(publicDate);
            return (
              <li
                key={post.id}
                className="flex items-baseline justify-between gap-3 min-w-0"
              >
                <Link
                  href={`/blog/${post.slug}?utm_source=app&utm_medium=dashboard`}
                  className="min-w-0 truncate text-sm text-foreground/90 hover:text-foreground hover:underline underline-offset-4 focus-ring rounded"
                >
                  {post.title}
                </Link>
                {dateLabel ? (
                  <time
                    dateTime={publicDate ?? undefined}
                    className="shrink-0 text-xs text-muted-foreground"
                  >
                    {dateLabel}
                  </time>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </aside>
  );
}
