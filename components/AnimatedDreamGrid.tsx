'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DreamCard from './DreamCard';
import { useSearch } from '@/context/search-context';
import { useDreamSearch } from '@/hooks/use-dream-search';
import { Search, Calendar, Puzzle, Book, Trash2, Share2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AiDisclosure } from '@/components/brand/AiDisclosure';
import Image from 'next/image';

// Notes (2026-06-09 audit, H7/M6):
// - framer-motion was previously pulled in via `require()` inside try/catch,
//   which defeated ESM tree-shaking and shipped the whole CJS package; the
//   fallback (`motion = { div: 'div' }`) was also broken — it had no
//   `.section`, so ComparisonGroup would have crashed if it ever triggered.
//   Standard ESM import restores tree-shaking; framer-motion supports SSR.
// - DreamCard was dynamic-imported with `ssr: false`, which made the entire
//   journal grid render as pulse skeletons until hydration even though the
//   server had already fetched the data — wrecking LCP on the core page.
//   A direct import lets the server render the cards.

interface Dream {
  id: string;
  original_text: string;
  title?: string;
  dream_summary?: string;
  analysis_summary?: string;
  topic_sentence?: string;
  supporting_points?: string[];
  conclusion_sentence?: string;
  formatted_analysis?: string;
  personalized_summary?: string;
  tags?: string[];
  bible_refs?: string[];
  created_at?: string;
  // Owner-only "favorite" flag, surfaced via the Starred gallery filter.
  is_starred?: boolean;
  // Comparison-group metadata (set on rows produced by admin test mode).
  comparison_group_id?: string | null;
  analysis_depth?: string | null;
  reading_level_used?: string | null;
  image_aesthetic_used?: string | null;
  // Admin-only cost breakdown joined from chatgpt_interactions on the server.
  // Non-admins never see this populated.
  _admin_usage?: {
    input_tokens: number | null;
    output_tokens: number | null;
    image_generated: boolean | null;
    image_cost_usd: number | null;
  } | null;
}

// Gallery filter pills. "All", "This month" and "Starred" are wired to real
// filtering below. "Recurring themes" is a future feature (depends on
// pattern-detection that isn't built yet) so it's rendered disabled rather
// than as a dead/clickable pill.
type GalleryFilter = 'All' | 'This month' | 'Recurring themes' | 'Starred';
const GALLERY_FILTERS: { label: GalleryFilter; enabled: boolean }[] = [
  { label: 'All', enabled: true },
  { label: 'This month', enabled: true },
  { label: 'Recurring themes', enabled: false },
  { label: 'Starred', enabled: true },
];

// Letters used to tell two on-screen comparisons apart ("Set A", "Set B").
// Only rendered when more than one comparison is visible.
const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** A card slot in the gallery: an ordinary dream, or one variant of a
 *  comparison. Variants render as ordinary cards with a ring and a badge —
 *  see the note in the render-order loop for why they are no longer a
 *  wrapped section. */
type RenderItem =
  | { type: 'standalone'; dream: Dream }
  | {
      type: 'variant';
      dream: Dream;
      groupId: string;
      setLabel: string;
      position: number;
      total: number;
      showDepth: boolean;
      showReading: boolean;
      showAesthetic: boolean;
    };

// Pretty labels for badges shown on comparison-group cards.
const DEPTH_LABELS: Record<string, string> = {
  shallow: 'Shallow',
  deep: 'Deep',
  profound: 'Profound',
};

const READING_LEVEL_LABELS: Record<string, string> = {
  radiant_clarity: 'Radiant',
  celestial_insight: 'Celestial',
  prophetic_wisdom: 'Prophetic',
  divine_revelation: 'Divine',
};

const AESTHETIC_LABELS: Record<string, string> = {
  sacred_oil_painting: 'Oil Painting',
  stained_glass: 'Stained Glass',
  watercolor_dreamscape: 'Watercolor',
  celestial_cosmos: 'Cosmos',
  renaissance_fresco: 'Fresco',
  surreal_prophetic: 'Surreal',
  anime_sacred: 'Anime',
  photorealistic_vision: 'Photorealistic',
};

interface AnimatedDreamGridProps {
  dreams: Dream[];
  maxRowItems?: number;
  /** Set by the server based on profile.is_admin — gates the cost footer on each card. */
  isAdmin?: boolean;
  /** Greeting + composer, rendered inside the wrap grid spanning the card
   *  columns. Only meaningful when `rail` is present. */
  header?: ReactNode;
  /** Editorial rail (symbol thread + latest journal note). When present the
   *  grid switches to wrap mode: lg:grid-cols-4 with the rail pinned to the
   *  last column spanning the head row + first card row — cards flow beside
   *  it 3-up, then claim the full width. On mobile the rail renders after
   *  the cards so editorial content never pushes the gallery down. */
  rail?: ReactNode;
}

export default function AnimatedDreamGrid({ dreams, maxRowItems = 3, isAdmin = false, header, rail }: AnimatedDreamGridProps) {
  const railMode = Boolean(rail);
  // Access search context
  const { keywords, isLoading, isSearchEnabled } = useSearch();

  // Always call the hook to maintain consistent hook order
  const searchedDreams = useDreamSearch(dreams, keywords);

  // Hooks must be called before any conditional returns (Rules of Hooks)
  const [loadingDreamId, setLoadingDreamId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [activeFilter, setActiveFilter] = useState<GalleryFilter>('All');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Use search results only after mount to avoid hydration mismatch
  const filteredDreams = isMounted && isSearchEnabled
    ? searchedDreams
    : dreams;

  // Live analysis prose streamed from the server while the placeholder card
  // is up (feat/streaming-analysis). Rendered inside that card so the reading
  // forms where it will live. Cleared when real content or a failure arrives.
  const [streamingText, setStreamingText] = useState<string | null>(null);

  // The auto-opening "reading" pop-up: opens on submit and shows the title +
  // full analysis body writing itself in, then stays open (done:true) for the
  // reader to close. Lives at the grid level so the placeholder -> real-card
  // handoff never dismisses it.
  const [reader, setReader] = useState<{ title: string; body: string; done: boolean; dreamId: string | null; tags: string[]; originalText: string; bibleRefs: { citation: string; theme: string }[] } | null>(null);

  // Optimistic placeholder card shown immediately on submission
  const [pendingDream, setPendingDream] = useState<Dream | null>(null);

  // Track analyzed dream data that arrived before the server refresh
  const [analyzedDream, setAnalyzedDream] = useState<{id: string; analysis: any} | null>(null);
  // Latch the analyzed dream id in a ref so the "has the real row landed?"
  // check survives analyzedDream being cleared by the 300ms handoff timer
  // below. Deriving that check from analyzedDream state let the placeholder
  // resurrect the instant the timer nulled it, leaving a duplicate
  // "Analysis pending" card sitting next to the finished one.
  const analyzedIdRef = useRef<string | null>(null);

  // Listen for dream submission events to show a placeholder card instantly
  useEffect(() => {
    function handleDreamSubmitting(e: Event) {
      const detail = (e as CustomEvent).detail;
      analyzedIdRef.current = null; // new submission forgets any prior analyzed id
      setReader({ title: '', body: '', done: false, dreamId: null, tags: [], originalText: detail.original_text ?? '', bibleRefs: [] }); // open the reading pop-up now
      setPendingDream({
        id: detail.id,
        original_text: detail.original_text,
        created_at: detail.created_at,
      });
    }

    // Listen for analysis completion so we can update without waiting for router.refresh
    function handleDreamAnalyzed(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.id && detail?.analysis) {
        analyzedIdRef.current = detail.id;
        setAnalyzedDream({ id: detail.id, analysis: detail.analysis });
        setStreamingText(null); // real content supersedes the live stream
        setReader((r) => (r
          ? {
              ...r,
              done: true,
              dreamId: detail.id,
              tags: Array.isArray(detail.analysis?.tags) ? detail.analysis.tags : r.tags,
              bibleRefs: Array.isArray(detail.analysis?.biblicalReferences) ? detail.analysis.biblicalReferences : r.bibleRefs,
              // Settle to the final full analysis (composed prose on deep tiers).
              body: (typeof detail.analysis?.analysis === 'string' && detail.analysis.analysis) || r.body,
            }
          : r));
      }
    }

    // Failed submissions (e.g. 402 out-of-credits paywall) never produce a
    // real card, so drop the optimistic placeholder instead of leaving it
    // spinning forever behind the error/upsell UI.
    function handleDreamFailed() {
      analyzedIdRef.current = null;
      setPendingDream(null);
      setAnalyzedDream(null);
      setStreamingText(null);
      setReader(null); // tear down the reading pop-up on failure
    }

    function handleDreamStreaming(e: Event) {
      const detail = (e as CustomEvent).detail as { title?: string; body?: string };
      const body = detail?.body ?? '';
      const title = detail?.title ?? '';
      setStreamingText(body || null);
      setReader((r) => (r
        ? { ...r, title, body }
        : { title, body, done: false, dreamId: null, tags: [], originalText: '', bibleRefs: [] }));
    }

    window.addEventListener('dreamriver:dream-submitting', handleDreamSubmitting);
    window.addEventListener('dreamriver:dream-analyzed', handleDreamAnalyzed);
    window.addEventListener('dreamriver:dream-failed', handleDreamFailed);
    window.addEventListener('dreamriver:dream-streaming', handleDreamStreaming);
    return () => {
      window.removeEventListener('dreamriver:dream-submitting', handleDreamSubmitting);
      window.removeEventListener('dreamriver:dream-analyzed', handleDreamAnalyzed);
      window.removeEventListener('dreamriver:dream-failed', handleDreamFailed);
      window.removeEventListener('dreamriver:dream-streaming', handleDreamStreaming);
    };
  }, []);

  // Clear pending placeholder only once the real card (identified by the
  // analyzed dream id) actually appears in the server-rendered list. Clearing
  // based on `dreams.length > 0` races against Supabase read propagation and
  // causes a visible gap between placeholder and real card.
  // Based on the latched ref, NOT analyzedDream state: once the real server
  // row lands this stays true, so the placeholder hides and never comes back.
  const analyzedIdInGrid =
    analyzedIdRef.current !== null &&
    dreams.some((d) => d.id === analyzedIdRef.current);
  useEffect(() => {
    if (pendingDream && analyzedIdInGrid) {
      const timer = setTimeout(() => {
        analyzedIdRef.current = null;
        setPendingDream(null);
        setAnalyzedDream(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pendingDream, analyzedIdInGrid]);

  // Check for loading dream
  useEffect(() => {
    const storedLoadingId = localStorage.getItem('loadingDreamId');
    if (storedLoadingId) {
      setLoadingDreamId(storedLoadingId);
    }

    // Clear loading state if we have analysis
    const loadingDream = dreams.find(d => d.id === storedLoadingId);
    if (loadingDream && (loadingDream.dream_summary || loadingDream.analysis_summary ||
        (loadingDream.supporting_points && loadingDream.supporting_points.length > 0))) {
      localStorage.removeItem('loadingDreamId');
      setLoadingDreamId(null);
    }
  }, [dreams]);

  // If no dreams (and no pending submission), show empty state. In rail mode
  // this becomes a block inside the wrap grid further down, so the header
  // slot (greeting + composer) and the rail always stay on the page.
  const emptyJournal = (!dreams || dreams.length === 0) && !pendingDream;
  const emptyJournalNode = (
    <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8">
      <div className="bg-muted rounded-full p-8 mb-6">
        <Search className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-2xl mb-3">No dreams recorded yet</h3>
      <p className="text-muted-foreground max-w-md mb-6">
        Your dream journal is empty. Start by recording your first dream above to receive AI-powered spiritual interpretations and biblical insights.
      </p>
      <p className="text-sm text-muted-foreground">
        Dreams are where spiritual wisdom awakens. Each one is a message waiting to be understood.
      </p>
    </div>
  );
  if (!railMode && emptyJournal) {
    return emptyJournalNode;
  }

  // Show no results state (client-side only)
  const searchNoResults =
    isMounted && isSearchEnabled && keywords.length > 0 && filteredDreams.length === 0;
  const searchNoResultsNode = (
    <div className="min-h-[300px] flex flex-col items-center justify-center text-center p-8">
      <div className="bg-muted rounded-full p-6 mb-4">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg mb-2">No dreams found</h3>
      <p className="text-muted-foreground max-w-md">
        We couldn’t find any dreams matching all of:{' '}
        {keywords.map((kw, i) => (
          <span key={i} className="font-medium">
            “{kw}”{i < keywords.length - 1 ? ', ' : ''}
          </span>
        ))}
        <br />
        Try removing some keywords or using different terms.
      </p>
    </div>
  );
  if (!railMode && searchNoResults) {
    return searchNoResultsNode;
  }
  
  // Show loading state (client-side only)
  const searchLoading = isMounted && isSearchEnabled && isLoading;
  if (!railMode && searchLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[300px]">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-64 w-full bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  // Enrich dreams with client-side analysis data if available (before server refresh).
  // Annotated as `Dream[]` so downstream consumers (comparison_group_id, etc.)
  // keep their full type — without the annotation TS narrows the synthetic
  // branch's object literal and the union loses fields not mentioned inline.
  const enrichedDreams: Dream[] = filteredDreams.map((dream): Dream => {
    if (analyzedDream && analyzedDream.id === dream.id && !dream.dream_summary) {
      const a = analyzedDream.analysis;
      return {
        ...dream,
        title: a.dreamTitle || dream.title,
        dream_summary: a.analysis ? a.analysis.split('.').slice(0, 2).join('.') + '.' : undefined,
        analysis_summary: a.analysis,
        topic_sentence: a.topicSentence,
        supporting_points: a.supportingPoints,
        conclusion_sentence: a.conclusionSentence,
        formatted_analysis: a.analysis || `${a.topicSentence} ${(a.supportingPoints || []).join(' ')} ${a.conclusionSentence}`,
        personalized_summary: a.personalizedSummary,
        tags: a.tags?.length > 0 ? a.tags : [],
        bible_refs: (a.biblicalReferences || []).filter((r: any) => r?.citation).map((r: any) => r.citation.trim()),
      };
    }
    return dream;
  });

  // While the placeholder is visible, enrich it with analyzed fields as they
  // arrive so the user sees title → summary → tags populate without the card
  // flickering out and back.
  const showPlaceholder = pendingDream !== null && !analyzedIdInGrid;
  const placeholderKey =
    pendingDream?.id ?? analyzedDream?.id ?? 'placeholder';

  const placeholderDream: Dream | null = pendingDream
    ? analyzedDream
      ? {
          id: analyzedDream.id,
          original_text: pendingDream.original_text,
          created_at: pendingDream.created_at,
          title: analyzedDream.analysis.dreamTitle ?? pendingDream.title,
          dream_summary: analyzedDream.analysis.analysis
            ? analyzedDream.analysis.analysis.split('.').slice(0, 2).join('.') + '.'
            : undefined,
          analysis_summary: analyzedDream.analysis.analysis,
          topic_sentence: analyzedDream.analysis.topicSentence,
          supporting_points: analyzedDream.analysis.supportingPoints,
          conclusion_sentence: analyzedDream.analysis.conclusionSentence,
          formatted_analysis: analyzedDream.analysis.analysis,
          tags:
            analyzedDream.analysis.tags?.length > 0
              ? analyzedDream.analysis.tags
              : [],
          bible_refs: (analyzedDream.analysis.biblicalReferences || [])
            .filter((r: any) => r?.citation)
            .map((r: any) => r.citation.trim()),
        }
      : pendingDream
    : null;

  // Apply the active gallery filter (All / This month / Starred). Search
  // filtering already happened above (enrichedDreams); this composes on top
  // of it. "Recurring themes" is disabled in the pill row, so it never
  // becomes the active filter.
  const now = new Date();
  const categoryFiltered = enrichedDreams.filter((d) => {
    if (activeFilter === 'Starred') return Boolean(d.is_starred);
    if (activeFilter === 'This month') {
      if (!d.created_at) return false;
      const dt = new Date(d.created_at);
      return (
        dt.getFullYear() === now.getFullYear() &&
        dt.getMonth() === now.getMonth()
      );
    }
    return true; // 'All'
  });

  // Build the render order: walk the visible dreams once, emit either
  // standalone cards or comparison-group sections (the first time we see
  // a given group_id, we emit the whole group; subsequent rows in that
  // group are skipped because they were emitted with the first one).
  const visible = categoryFiltered.slice(0, 12);
  const seenGroupIds = new Set<string>();
  const renderOrder: RenderItem[] = [];

  // Comparison variants are emitted as ordinary cards, not as a section.
  //
  // They used to be wrapped in a tinted `col-span-full` panel with its OWN
  // nested grid — a grid inside a grid, so variant cards were sized and
  // spaced differently from every other card on the page and the whole block
  // read as a slab. The panel was carrying one piece of real information
  // (these N cards are one comparison); that now lives in a per-card badge,
  // so the cards can rejoin the main grid and just wear a ring.
  let groupOrdinal = 0;
  for (const dream of visible) {
    const groupId = dream.comparison_group_id;
    if (!groupId) {
      renderOrder.push({ type: 'standalone', dream });
      continue;
    }
    if (seenGroupIds.has(groupId)) continue;
    seenGroupIds.add(groupId);
    const members = visible.filter((d) => d.comparison_group_id === groupId);
    // Only badge the dimensions that actually vary within this group.
    const showDepth =
      new Set(members.map((d) => d.analysis_depth ?? '')).size > 1;
    const showReading =
      new Set(members.map((d) => d.reading_level_used ?? '')).size > 1;
    const showAesthetic =
      new Set(members.map((d) => d.image_aesthetic_used ?? '')).size > 1;
    const setLabel = GROUP_LETTERS[groupOrdinal] ?? String(groupOrdinal + 1);
    groupOrdinal += 1;
    members.forEach((m, i) => {
      renderOrder.push({
        type: 'variant',
        dream: m,
        groupId,
        setLabel,
        position: i + 1,
        total: members.length,
        showDepth,
        showReading,
        showAesthetic,
      });
    });
  }
  // With a single comparison on screen the set letter is noise — "2/6" is
  // unambiguous. It only earns its place once two comparisons are visible.
  const showSetLabel = groupOrdinal > 1;

  const hasVisibleCards = renderOrder.length > 0 || showPlaceholder;

  // Shared pieces used by both the classic and wrap-mode returns.
  const filterPillButtons = GALLERY_FILTERS.map(({ label, enabled }) => {
    const isActive = activeFilter === label;
    return (
      <button
        key={label}
        type="button"
        role="tab"
        aria-selected={isActive}
        disabled={!enabled}
        onClick={() => enabled && setActiveFilter(label)}
        title={!enabled ? 'Coming soon' : undefined}
        className={
          isActive
            ? 'px-2.5 py-1 rounded-md bg-primary text-primary-foreground font-semibold'
            : enabled
              ? 'px-2.5 py-1 rounded-md text-muted-foreground hover:text-foreground transition-colors'
              : 'px-2.5 py-1 rounded-md text-muted-foreground/40 cursor-not-allowed'
        }
      >
        {label}
      </button>
    );
  });

  const noVisibleCardsNode = (
    <div className="min-h-[240px] flex flex-col items-center justify-center text-center p-8">
      <h3 className="text-lg mb-1">
        {activeFilter === 'Starred'
          ? 'No starred dreams yet'
          : activeFilter === 'This month'
            ? 'No dreams this month'
            : 'No dreams to show'}
      </h3>
      <p className="text-muted-foreground max-w-md text-sm">
        {activeFilter === 'Starred'
          ? 'Tap the star on any dream to save it here for quick access.'
          : 'Try a different filter, or record a new dream above.'}
      </p>
    </div>
  );

  const cardItems = (
    <>
      {/* Optimistic placeholder — rendered OUTSIDE AnimatePresence so React
          unmounts it the moment the real card lands. Left inside AnimatePresence
          it was orphaned in the DOM, leaving a duplicate card by the real one.
          For matrix submissions we still show one placeholder; the
          remaining rows arrive via router.refresh. */}
      {showPlaceholder && placeholderDream && (
        <motion.div
          key={placeholderKey}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: 'tween',
            duration: 0.3,
            ease: 'easeOut'
          }}
          className="col-span-1"
        >
          <DreamCard
            dream={placeholderDream}
            loading={analyzedDream === null}
            streamingText={streamingText ?? undefined}
            isAdmin={isAdmin}
          />
        </motion.div>
      )}
      <AnimatePresence initial={false}>
      {renderOrder.map((item) =>
        item.type === 'standalone' ? (
          <motion.div
            key={item.dream.id}
            layout
            // The card that replaces the optimistic placeholder appears in
            // place with no entrance pop; the placeholder exits instantly, so
            // the streamed card simply becomes the finished card - no crossfade.
            initial={analyzedIdRef.current === item.dream.id ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'tween', duration: 0.4, ease: 'easeOut' }}
            className="col-span-1"
          >
            <DreamCard
              dream={item.dream}
              loading={item.dream.id === loadingDreamId}
              searchTerms={isMounted && isSearchEnabled ? keywords : []}
              isAdmin={isAdmin}
            />
          </motion.div>
        ) : (
          <motion.div
            key={item.dream.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'tween', duration: 0.4, ease: 'easeOut' }}
            className="col-span-1"
          >
            <VariantCard
              item={item}
              showSetLabel={showSetLabel}
              loading={item.dream.id === loadingDreamId}
              searchTerms={isMounted && isSearchEnabled ? keywords : []}
              isAdmin={isAdmin}
            />
          </motion.div>
        ),
      )}
      </AnimatePresence>
    </>
  );

  // ── Wrap (rail) mode ──────────────────────────────────────────
  // One shared grid: the header slot spans the card columns, the rail pins
  // to the last lg column spanning the head row + first card row, and cards
  // auto-flow beside it, then claim the full width. On mobile the order is
  // header → cards → rail, so editorial content never pushes the gallery
  // below the fold.
  if (railMode) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="col-span-full lg:col-span-3 min-w-0">
          {header}
          <div className="flex items-baseline justify-between gap-4 flex-wrap mt-9 mb-1">
            <h2 className="font-serif text-[22px] font-normal leading-tight">
              Your dream gallery
            </h2>
            {!(isMounted && isSearchEnabled) && (
              <div
                className="flex gap-1 text-[12.5px]"
                role="tablist"
                aria-label="Filter dreams"
              >
                {filterPillButtons}
              </div>
            )}
          </div>
        </div>

        <aside
          aria-label="Patterns and Journal"
          className="col-span-full order-last lg:order-none lg:col-span-1 lg:col-start-4 lg:row-start-1 lg:row-span-2 min-w-0 flex flex-col gap-6 lg:border-l lg:border-border lg:pl-5"
        >
          {rail}
        </aside>

        {searchLoading ? (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="col-span-1 h-64 w-full bg-muted animate-pulse rounded-md" />
          ))
        ) : emptyJournal ? (
          <div className="col-span-full lg:col-span-3">{emptyJournalNode}</div>
        ) : searchNoResults ? (
          <div className="col-span-full lg:col-span-3">{searchNoResultsNode}</div>
        ) : !hasVisibleCards ? (
          <div className="col-span-full lg:col-span-3">{noVisibleCardsNode}</div>
        ) : (
          cardItems
        )}

        <StreamingReaderModal reader={reader} onClose={() => setReader(null)} />
      </div>
    );
  }

  return (
    <div>
      {/* Gallery filter pills — wired to real filtering. Hidden while a
          search is active to avoid two competing filter mechanisms. */}
      {!(isMounted && isSearchEnabled) && (
        <div
          className="flex gap-1 text-[12.5px] justify-end mb-4 -mt-1"
          role="tablist"
          aria-label="Filter dreams"
        >
          {filterPillButtons}
        </div>
      )}

      {!hasVisibleCards ? (
        noVisibleCardsNode
      ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[300px]">
      {cardItems}
    </div>
      )}

      <StreamingReaderModal reader={reader} onClose={() => setReader(null)} />
    </div>
  );
}

// The auto-opening reading pop-up. Mirrors the saved-card detail view: square
// artwork (skeleton until it generates, then it fades in) + title + date + tags
// on the header, and the full analysis writing itself in below. Kept as a
// grid-level sibling so it survives the placeholder -> real-card handoff.
function StreamingReaderModal({
  reader,
  onClose,
}: {
  reader: {
    title: string;
    body: string;
    done: boolean;
    dreamId: string | null;
    tags: string[];
    originalText: string;
    bibleRefs: { citation: string; theme: string }[];
  } | null;
  onClose: () => void;
}) {
  const open = reader !== null;
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Autoscroll the reading as it writes itself in.
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [reader?.body]);

  // Forget the artwork when the pop-up closes so the next reading starts clean.
  useEffect(() => {
    if (!open) setImageUrl(null);
  }, [open]);

  // Poll for the artwork once the dream row exists and fade it into the
  // skeleton's spot the moment it lands, matching the saved card.
  const dreamId = reader?.dreamId ?? null;
  useEffect(() => {
    if (!dreamId || imageUrl) return;
    let cancelled = false;
    let tries = 0;
    const iv = setInterval(async () => {
      tries += 1;
      if (tries > 45) {
        clearInterval(iv);
        return;
      }
      try {
        const res = await fetch(`/api/dream-entries?id=${dreamId}`, {
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (!res.ok) return;
        const data = await res.json();
        const url = data?.dreams?.[0]?.image_url;
        if (url && !cancelled) {
          setImageUrl(url);
          clearInterval(iv);
        }
      } catch {
        // transient network error - keep polling
      }
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [dreamId, imageUrl]);

  const dateLabel = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto pb-8">
        <DialogDescription className="sr-only">
          Your dream interpretation, appearing as it is written.
        </DialogDescription>

        {/* Split header — identical to the saved-card detail view: title/date/
            tags on the left, square artwork (skeleton until it generates) on
            the right. */}
        <div className="flex flex-col-reverse sm:grid sm:grid-cols-[minmax(0,1fr)_38%] gap-3 sm:gap-4 items-start">
          <div className="min-w-0 w-full">
            <div className="flex items-start justify-between gap-2">
              <DialogTitle className="font-serif text-2xl sm:text-3xl leading-[1.15] tracking-tight">
                {reader?.title ? (
                  reader.title
                ) : (
                  <span className="text-muted-foreground italic font-normal">
                    Interpreting your dream…
                  </span>
                )}
              </DialogTitle>
              <span className="text-[10px] text-muted-foreground border border-muted-foreground rounded px-1.5 py-0.5 whitespace-nowrap flex items-center h-fit shrink-0">esc</span>
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1.5">
              <Calendar className="h-3 w-3 mr-1 shrink-0" />
              {dateLabel}
            </div>
            {reader && reader.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {reader.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs capitalize">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-muted">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt="Dream artwork"
                fill
                className="object-cover animate-in fade-in duration-700"
                sizes="(max-width: 640px) 100vw, 230px"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
            )}
          </div>
        </div>

        {/* Tabs — same shell as the detail view. The reading writes itself into
            the Analysis tab; Original Dream shows exactly what was submitted. */}
        <Tabs defaultValue="analysis" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analysis" className="flex items-center gap-1 data-[state=active]:shadow-sm">
              <Puzzle className="h-3 w-3" />Analysis
            </TabsTrigger>
            <TabsTrigger value="original" className="data-[state=active]:shadow-sm">Original Dream</TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="space-y-4 p-1 min-h-0">
            <div>
              {/* AI disclosure — above the reading, exactly as the detail view. */}
              <AiDisclosure
                verseCount={reader && reader.bibleRefs.length > 0 ? reader.bibleRefs.length : undefined}
                className="mb-4 max-w-[65ch]"
              />
              <div ref={bodyRef} className="max-w-[65ch]">
                {reader && !reader.done && !reader.body ? (
                  // Pre-stream "thinking" beat: the pop-up is open but the
                  // first token hasn't landed yet. Bouncing dots read as
                  // "coming" without the skeleton's "empty template" feel.
                  <div
                    className="flex items-center gap-3 text-sm text-muted-foreground"
                    role="status"
                    aria-live="polite"
                  >
                    {/* A gentle river current scrolling sideways — a seamless
                        loop: the SVG is 2x the window and slides one full
                        wavelength period (-50%) before repeating. */}
                    <span className="relative h-5 w-[140px] shrink-0 overflow-hidden" aria-hidden="true">
                      <svg
                        className="absolute left-0 top-0 h-5 w-[280px] animate-river text-primary/80"
                        viewBox="0 0 280 20"
                        preserveAspectRatio="none"
                        fill="none"
                      >
                        <path
                          d="M0 10 Q 17 2 35 10 T 70 10 T 105 10 T 140 10 T 175 10 T 210 10 T 245 10 T 280 10"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </span>
                    Reading your dream…
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                    {reader?.body}
                    {reader && !reader.done && (
                      <span
                        aria-hidden="true"
                        className="ml-0.5 inline-block h-3.5 w-[6px] animate-pulse rounded-[1px] bg-primary/70 align-text-bottom"
                      />
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Feedback + Read again — same layout as the saved card. Inert
                while the reading is being written; the saved card behind the
                pop-up carries the working controls once you close it. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t pt-3.5">
              <span className="text-xs text-muted-foreground">
                Did this reading feel meaningful?
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled
                  className="rounded-full border border-input px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors disabled:opacity-50"
                >
                  Yes
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-full border border-input px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors disabled:opacity-50"
                >
                  Not really
                </button>
              </div>
              <button
                type="button"
                disabled
                className="ml-auto rounded-full border border-input px-3 py-1 text-xs font-medium text-muted-foreground transition-colors disabled:opacity-50"
              >
                Read again · 1 credit
              </button>
            </div>
          </TabsContent>

          <TabsContent value="original" className="space-y-4 p-1 min-h-0">
            <div className="text-sm whitespace-pre-wrap max-w-[65ch]">
              {reader?.originalText}
            </div>
          </TabsContent>
        </Tabs>

        {/* Share row — matches the detail view's position. */}
        <div className="flex justify-end items-center mb-4">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground disabled:opacity-50"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
        </div>

        {/* Footer: scripture + delete — same structure as the saved card. */}
        <div className="pt-4 border-t space-y-3">
          {reader && reader.bibleRefs.length > 0 && (
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                Scripture
              </div>
              <div className="flex flex-wrap gap-1.5">
                {reader.bibleRefs.map((ref, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold min-h-[24px] bg-mist text-primary border-mist-2"
                  >
                    <Book className="h-2 w-2" />
                    {ref.citation}
                    {ref.theme && (
                      <span className="font-normal opacity-75">· {ref.theme}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button
              type="button"
              disabled
              className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-destructive disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── VariantCard ──────────────────────────────────────────────────────
//
// One card from an admin test-mode comparison. Renders the ordinary DreamCard
// with an amber ring and a badge row, and sits in the main grid alongside
// every other card.
//
// This replaces ComparisonGroup, which wrapped the whole comparison in a
// tinted `col-span-full` panel containing its own nested grid. That panel had
// two problems: it was a grid inside a grid, so variant cards were sized and
// spaced unlike every other card on the page; and its weight was out of
// proportion to what it said. The one thing it communicated that a ring does
// not — which cards belong to the same comparison — is now carried by the
// "Set A · 2/6" badge, which costs a few pixels instead of a full-width slab.

interface VariantCardProps {
  item: Extract<RenderItem, { type: 'variant' }>;
  /** Set letters only appear when two comparisons are on screen at once. */
  showSetLabel: boolean;
  loading: boolean;
  searchTerms: string[];
  isAdmin: boolean;
}

function VariantCard({
  item,
  showSetLabel,
  loading,
  searchTerms,
  isAdmin,
}: VariantCardProps) {
  const {
    dream,
    setLabel,
    position,
    total,
    showDepth,
    showReading,
    showAesthetic,
  } = item;

  return (
    <div
      role="group"
      aria-label={`Test variant ${position} of ${total}${
        showSetLabel ? ` in set ${setLabel}` : ''
      }`}
      className="relative rounded-xl ring-2 ring-amber-400/70 dark:ring-amber-500/50"
    >
      <div className="absolute -top-2 right-2 z-10 flex flex-wrap gap-1 max-w-[90%] justify-end">
        {/* Group identity first — it is the badge that replaces the old
            container header, so it reads before the variant dimensions. */}
        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 shadow-sm">
          {showSetLabel ? `Set ${setLabel} · ` : ''}
          {position}/{total}
        </span>
        {showDepth && dream.analysis_depth && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-navy-900 text-mist shadow-sm">
            {DEPTH_LABELS[dream.analysis_depth] ?? dream.analysis_depth}
          </span>
        )}
        {showReading && dream.reading_level_used && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground shadow-sm">
            {READING_LEVEL_LABELS[dream.reading_level_used] ??
              dream.reading_level_used}
          </span>
        )}
        {showAesthetic && dream.image_aesthetic_used && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-700 text-white shadow-sm">
            {AESTHETIC_LABELS[dream.image_aesthetic_used] ??
              dream.image_aesthetic_used}
          </span>
        )}
      </div>
      <DreamCard
        dream={dream}
        loading={loading}
        searchTerms={searchTerms}
        isAdmin={isAdmin}
      />
    </div>
  );
}
