// lib/dreamTrends.ts
//
// Server-side aggregation for the admin "Trends" page — long-term patterns
// across ALL dreams, last 12 calendar months. Everything is computed here so
// the client components receive small, already-shaped arrays (the raw window
// can be thousands of rows; none of it should reach the browser).
//
// Month bucketing mirrors the UTC-day convention in app/(admin)/admin/page.tsx:
// Supabase `timestamp` columns are UTC; tz-less strings are treated as UTC.

import { getAdminClient } from "@/utils/supabase/admin";
import { sanitizeTags } from "@/lib/tags";

const PAGE_SIZE = 1000;
// Safety valve: 24k rows is far above current volume; if we ever hit it the
// charts simply cover the most recent rows and the page still renders.
const MAX_PAGES = 24;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ThemeSeries {
  theme: string;
  counts: number[]; // one entry per month key, oldest first
  total: number;
}

export interface MomentumRow {
  tag: string;
  current: number; // mentions in the last 90 days
  prior: number; // mentions in the prior 90 days
  pctChange: number | null; // null when prior === 0 (new arrival)
}

export interface ScriptureRow {
  book: string;
  counts: number[]; // per month
  total: number;
}

export interface TrendsData {
  monthKeys: string[]; // "YYYY-MM", oldest first
  monthLabels: string[]; // "Oct", "Jan '26", …
  totalDreams: number;
  totalDreamers: number;
  starredPct: number; // % of dreams starred, whole window
  feedbackPct: number; // % of dreams with thumbs feedback, whole window
  dreamsByMonth: number[];
  dreamersByMonth: number[];
  starredPctByMonth: number[]; // % of that month's dreams starred
  feedbackPctByMonth: number[]; // % of that month's analyses rated
  themes: ThemeSeries[]; // top 6 by total, rank order
  rising: MomentumRow[];
  fading: MomentumRow[];
  newArrivals: MomentumRow[]; // tags with prior === 0 this quarter
  scripture: ScriptureRow[]; // top 10 books
  scriptureMax: number; // max single cell, for the heatmap ramp
}

interface WindowRow {
  created_at: string | null;
  tags: string[] | null;
  bible_refs: string[] | null;
  is_starred: boolean;
  meaningful: boolean | null;
  user_id: string | null;
}

function toUtcDate(ts: string): Date {
  const normalized = /Z|[+-]\d{2}:?\d{2}$/.test(ts) ? ts : `${ts}Z`;
  return new Date(normalized);
}

function monthKeyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Last 12 calendar months (UTC), oldest first, current month last. */
export function lastTwelveMonths(now = new Date()): {
  monthKeys: string[];
  monthLabels: string[];
} {
  const monthKeys: string[] = [];
  const monthLabels: string[] = [];
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - i, 1));
    monthKeys.push(monthKeyOf(d));
    // Year suffix only on January and on the very first label, so the axis
    // stays quiet but never ambiguous.
    const label =
      d.getUTCMonth() === 0 || i === 11
        ? `${MONTH_NAMES[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}`
        : MONTH_NAMES[d.getUTCMonth()];
    monthLabels.push(label);
  }
  return { monthKeys, monthLabels };
}

// ---------------------------------------------------------------------------
// Scripture reference → book name
//
// bible_refs rows look like "John 3:16", "1 Corinthians 13:4-7", "Psalm 23",
// occasionally wrapped in parens. We only need the book for the heatmap.
// ---------------------------------------------------------------------------

const BOOK_ALIASES: Record<string, string> = {
  psalms: "Psalm",
  "song of songs": "Song of Solomon",
  canticles: "Song of Solomon",
  revelations: "Revelation",
};

export function bookOfRef(ref: unknown): string | null {
  if (typeof ref !== "string") return null;
  const cleaned = ref.replace(/^[([\s]+/, "").trim();
  // Book = optional leading ordinal (1–3) + words, up to the chapter number.
  // "Psalm 23" and bare "Jude" both resolve; junk strings fall out below.
  const m = cleaned.match(/^((?:[1-3]\s*)?[A-Za-z][A-Za-z.\s]*?)(?:\s+\d|\s*$)/);
  if (!m) return null;
  let book = m[1].replace(/\./g, "").replace(/\s+/g, " ").trim();
  if (book.length < 3 || book.length > 24) return null;
  const lower = book.toLowerCase();
  if (BOOK_ALIASES[lower]) return BOOK_ALIASES[lower];
  // Title-case, keeping "of" lowered ("Song of Solomon").
  book = lower
    .split(" ")
    .map((w) => (w === "of" ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
  return book;
}

// ---------------------------------------------------------------------------

async function fetchWindowRows(sinceIso: string): Promise<WindowRow[]> {
  const admin = getAdminClient();
  const rows: WindowRow[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await admin
      .from("dream_entries")
      .select("created_at, tags, bible_refs, is_starred, meaningful, user_id")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as WindowRow[]));
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

export async function getDreamTrends(now = new Date()): Promise<TrendsData> {
  const { monthKeys, monthLabels } = lastTwelveMonths(now);
  const windowStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1),
  );
  const rows = await fetchWindowRows(windowStart.toISOString());

  const monthIndex = new Map<string, number>(monthKeys.map((k, i) => [k, i]));
  const months = monthKeys.length;

  const dreamsByMonth = new Array<number>(months).fill(0);
  const dreamersByMonth: Array<Set<string>> = Array.from(
    { length: months },
    () => new Set(),
  );
  const allDreamers = new Set<string>();
  const starredByMonth = new Array<number>(months).fill(0);
  const feedbackByMonth = new Array<number>(months).fill(0);
  let starred = 0;
  let feedback = 0;

  // tag → per-month counts; tag → 90-day windows
  const tagMonthly = new Map<string, number[]>();
  const tagCurrent = new Map<string, number>(); // last 90 days
  const tagPrior = new Map<string, number>(); // 90–180 days ago
  const currentStart = now.getTime() - 90 * DAY_MS;
  const priorStart = now.getTime() - 180 * DAY_MS;

  const bookMonthly = new Map<string, number[]>();

  for (const row of rows) {
    if (!row.created_at) continue;
    const d = toUtcDate(row.created_at);
    const mi = monthIndex.get(monthKeyOf(d));
    if (mi === undefined) continue;

    dreamsByMonth[mi]++;
    if (row.user_id) {
      dreamersByMonth[mi].add(row.user_id);
      allDreamers.add(row.user_id);
    }
    if (row.is_starred) {
      starred++;
      starredByMonth[mi]++;
    }
    if (row.meaningful !== null) {
      feedback++;
      feedbackByMonth[mi]++;
    }

    const t = d.getTime();
    // sanitizeTags dedupes and lowercases — the same guarantee the write path
    // has, re-applied here so pre-hygiene rows can't split one theme in two.
    for (const tag of sanitizeTags(row.tags)) {
      let series = tagMonthly.get(tag);
      if (!series) {
        series = new Array<number>(months).fill(0);
        tagMonthly.set(tag, series);
      }
      series[mi]++;
      if (t >= currentStart) {
        tagCurrent.set(tag, (tagCurrent.get(tag) ?? 0) + 1);
      } else if (t >= priorStart) {
        tagPrior.set(tag, (tagPrior.get(tag) ?? 0) + 1);
      }
    }

    if (Array.isArray(row.bible_refs)) {
      const seenBooks = new Set<string>(); // count a book once per dream
      for (const ref of row.bible_refs) {
        const book = bookOfRef(ref);
        if (!book || seenBooks.has(book)) continue;
        seenBooks.add(book);
        let series = bookMonthly.get(book);
        if (!series) {
          series = new Array<number>(months).fill(0);
          bookMonthly.set(book, series);
        }
        series[mi]++;
      }
    }
  }

  // Top 6 themes by total mentions. Rank order is the color-slot order and is
  // stable for a given dataset (color follows the theme, not the month rank).
  const themes: ThemeSeries[] = [...tagMonthly.entries()]
    .map(([theme, counts]) => ({
      theme,
      counts,
      total: counts.reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.total - a.total || a.theme.localeCompare(b.theme))
    .slice(0, 6);

  // Momentum: last 90 days vs the 90 before. Threshold keeps one-off tags out.
  const MIN_MENTIONS = 3;
  const momentum: MomentumRow[] = [];
  const allWindowTags = new Set([...tagCurrent.keys(), ...tagPrior.keys()]);
  for (const tag of allWindowTags) {
    const current = tagCurrent.get(tag) ?? 0;
    const prior = tagPrior.get(tag) ?? 0;
    if (current + prior < MIN_MENTIONS) continue;
    momentum.push({
      tag,
      current,
      prior,
      pctChange:
        prior === 0 ? null : Math.round(((current - prior) / prior) * 100),
    });
  }
  const rising = momentum
    .filter((r) => r.prior > 0 && r.current > r.prior)
    .sort((a, b) => b.current - b.prior - (a.current - a.prior))
    .slice(0, 5);
  const fading = momentum
    .filter((r) => r.prior > r.current)
    .sort((a, b) => b.prior - b.current - (a.prior - a.current))
    .slice(0, 5);
  const newArrivals = momentum
    .filter((r) => r.prior === 0 && r.current >= MIN_MENTIONS)
    .sort((a, b) => b.current - a.current)
    .slice(0, 5);

  const scripture: ScriptureRow[] = [...bookMonthly.entries()]
    .map(([book, counts]) => ({
      book,
      counts,
      total: counts.reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.total - a.total || a.book.localeCompare(b.book))
    .slice(0, 10);
  const scriptureMax = Math.max(
    1,
    ...scripture.flatMap((r) => r.counts),
  );

  const totalDreams = dreamsByMonth.reduce((a, b) => a + b, 0);

  return {
    monthKeys,
    monthLabels,
    totalDreams,
    totalDreamers: allDreamers.size,
    starredPct: totalDreams ? Math.round((starred / totalDreams) * 100) : 0,
    feedbackPct: totalDreams ? Math.round((feedback / totalDreams) * 100) : 0,
    dreamsByMonth,
    dreamersByMonth: dreamersByMonth.map((s) => s.size),
    starredPctByMonth: starredByMonth.map((s, i) =>
      dreamsByMonth[i] ? Math.round((s / dreamsByMonth[i]) * 100) : 0,
    ),
    feedbackPctByMonth: feedbackByMonth.map((f, i) =>
      dreamsByMonth[i] ? Math.round((f / dreamsByMonth[i]) * 100) : 0,
    ),
    themes,
    rising,
    fading,
    newArrivals,
    scripture,
    scriptureMax,
  };
}
