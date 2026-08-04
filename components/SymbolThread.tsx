// components/SymbolThread.tsx
//
// "Water has been with you since 21 June — four dreams, one symbol."
//
// The payoff for the 2026-07-08 concrete-tags decision. Generic labels were
// banned from tags precisely so this could exist: a dream journal's one real
// advantage over a notes app is noticing that the same image keeps returning.
// A list of dreams can't do that; a thread can.
//
// Renders null unless a tag appears in MIN_OCCURRENCES or more dreams, so it
// stays invisible for new accounts rather than showing a lonely one-item
// "pattern". Pure presentation — takes the dreams already fetched by the
// dashboard, no extra query.

import Link from "next/link";
import Image from "next/image";

/**
 * A tag must appear on at least this many distinct DAYS before it counts as a
 * thread.
 *
 * Days, not rows, and that distinction is the whole point: recurrence is a
 * claim about time. Three dreams logged in one sitting is one night's
 * imagination, not a symbol returning to you. Counting rows also let admin
 * test-mode variants and same-day re-runs inflate a thread — production had a
 * dream titled "Soaring Above Mountains" / "Soaring Over Life's Mountains" /
 * "Soaring on Eagle's Wings", all on 2026-05-02, which a row count reads as a
 * pattern and a day count correctly reads as one dream.
 */
const MIN_DISTINCT_DAYS = 3;

/** Rows shown inline; the rest live behind the "see all" link. */
const MAX_ROWS = 3;

/**
 * Tags that describe the product rather than the dream. Mirrors META_TAGS in
 * lib/tags.ts — those are stripped on write, but rows written before that
 * landed still carry them, and "dream interpretation" (47 occurrences in
 * production) would otherwise win every thread by a mile.
 */
const META_TAGS = new Set([
  "dream interpretation",
  "dream analysis",
  "dream meaning",
  "dream",
  "dreams",
  "interpretation",
  "analysis",
  "spiritual insight",
  "biblical interpretation",
  "bible interpretation",
  "dream journal",
]);

export interface SymbolThreadDream {
  id: string;
  title: string | null;
  tags: string[] | null;
  image_url: string | null;
  created_at: string;
  dream_summary?: string | null;
  personalized_summary?: string | null;
  /** Set when a dream was run through admin test mode's comparison matrix —
   *  several rows for one actual dream. See the dedupe in collapseVariants. */
  comparison_group_id?: string | null;
}

/**
 * Collapses admin test-mode comparison variants down to one row per real
 * dream.
 *
 * Verified against production before this shipped: one account had
 * "The Puppy Beneath the Sink" three times on the same day, another had
 * "Soaring Above Mountains" / "Soaring Over Life's Mountains" / "Soaring on
 * Eagle's Wings" — all the same dream re-run through the matrix. Without this
 * the thread claims "24 dreams, one symbol" from what is really a handful,
 * which is worse than showing nothing: it invents a pattern.
 */
function collapseVariants(dreams: SymbolThreadDream[]): SymbolThreadDream[] {
  const seenGroups = new Set<string>();
  const out: SymbolThreadDream[] = [];
  for (const dream of dreams) {
    const group = dream.comparison_group_id;
    if (group) {
      if (seenGroups.has(group)) continue;
      seenGroups.add(group);
    }
    out.push(dream);
  }
  return out;
}

/**
 * Calendar-day key for grouping.
 *
 * Reads the date straight off the stored string rather than round-tripping
 * through Date -> toISOString(). Many created_at values carry no timezone
 * suffix ("2026-07-27T04:50:15.759593"), so `new Date()` parses them as local
 * and toISOString() then shifts them into the previous or next UTC day — which
 * produced a thread reporting three entries across two days. Storing per-user
 * timezones (profile.timezone exists but is null for every row today) would
 * let this be exact; until then, not introducing a shift beats guessing at one.
 */
function dayKey(iso: string): string {
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : new Date(iso).toISOString().slice(0, 10);
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatMonthDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

/**
 * Picks the symbol to feature.
 *
 * Deliberately "most recently active" rather than "most frequent": a
 * most-frequent rule would pin the same tag to the dashboard for months, and
 * the row stops being read. Recency makes it move as the dreamer dreams.
 * Ties break toward the larger thread.
 */
export function selectSymbolThread(dreams: SymbolThreadDream[]): {
  tag: string;
  dreams: SymbolThreadDream[];
} | null {
  const byTag = new Map<string, SymbolThreadDream[]>();

  for (const dream of collapseVariants(dreams)) {
    if (!Array.isArray(dream.tags)) continue;
    // Normalize the same way lib/tags.ts now does on write, so rows saved
    // before that landed ("Divine Calling" vs "divine calling") still thread.
    const seen = new Set<string>();
    for (const raw of dream.tags) {
      if (typeof raw !== "string") continue;
      const tag = raw.trim().toLowerCase();
      if (!tag || META_TAGS.has(tag) || seen.has(tag)) continue;
      seen.add(tag);
      const bucket = byTag.get(tag);
      if (bucket) bucket.push(dream);
      else byTag.set(tag, [dream]);
    }
  }

  let best: { tag: string; dreams: SymbolThreadDream[] } | null = null;
  for (const [tag, tagged] of byTag) {
    // One entry per day. A thread is the list of days a symbol came back, so
    // the count in the heading and the rows beneath it describe the same
    // thing. Keeping every row let a single day of re-runs render as
    // "19 dreams, one symbol" above three near-identical titles.
    const byDay = new Map<string, SymbolThreadDream>();
    for (const dream of tagged) {
      const day = dayKey(dream.created_at);
      const held = byDay.get(day);
      if (!held || +new Date(dream.created_at) > +new Date(held.created_at)) {
        byDay.set(day, dream);
      }
    }
    if (byDay.size < MIN_DISTINCT_DAYS) continue;
    const sorted = [...byDay.values()].sort(
      (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
    );
    if (
      !best ||
      +new Date(sorted[0].created_at) > +new Date(best.dreams[0].created_at) ||
      (+new Date(sorted[0].created_at) ===
        +new Date(best.dreams[0].created_at) &&
        sorted.length > best.dreams.length)
    ) {
      best = { tag, dreams: sorted };
    }
  }
  return best;
}

export default function SymbolThread({
  dreams,
  className,
}: {
  dreams: SymbolThreadDream[];
  /** Extra classes merged onto the section. The dashboard rail passes
   *  lg:border-t-0 lg:pt-0 so the rail's left rule replaces the top one. */
  className?: string;
}) {
  const thread = selectSymbolThread(dreams);
  if (!thread) return null;

  const { tag, dreams: threaded } = thread;
  const rows = threaded.slice(0, MAX_ROWS);
  const first = threaded[threaded.length - 1];

  return (
    <section
      aria-labelledby="symbol-thread-label"
      className={`border-t border-border pt-5 ${className ?? ""}`.trim()}
    >
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span
          id="symbol-thread-label"
          className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground"
        >
          <span className="capitalize">{tag}</span> has been with you
        </span>
        <span className="text-[13px] text-muted-foreground">
          since {formatMonthDay(first.created_at)}
        </span>
      </div>

      <h3 className="mt-2 font-serif text-[20px] leading-tight">
        {threaded.length} dreams, one symbol
      </h3>

      <ul className="mt-3.5">
        {rows.map((dream, i) => (
          <li
            key={dream.id}
            className={
              i < rows.length - 1 ? "border-b border-border/60" : undefined
            }
          >
            <Link
              href={`/?dream=${dream.id}`}
              className="group grid grid-cols-[52px_minmax(0,1fr)] items-center gap-3 py-2.5 focus-ring rounded"
            >
              <div className="relative aspect-square overflow-hidden rounded bg-muted">
                {dream.image_url ? (
                  <Image
                    src={dream.image_url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="52px"
                    // Same reason as DreamCard: the Next optimizer
                    // intermittently fails on private Supabase signed URLs.
                    unoptimized
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] text-foreground group-hover:underline underline-offset-4 decoration-1">
                  {dream.title || "Untitled dream"}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {dream.personalized_summary || dream.dream_summary ? (
                    <>
                      {(dream.personalized_summary || dream.dream_summary)!.slice(
                        0,
                        60,
                      )}
                      {" · "}
                    </>
                  ) : null}
                  {formatDay(dream.created_at)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {threaded.length > rows.length ? (
        <Link
          href={`/?q=${encodeURIComponent(tag)}`}
          className="mt-2.5 inline-block text-[13px] text-primary focus-ring rounded"
        >
          See all {threaded.length} →
        </Link>
      ) : null}
    </section>
  );
}
