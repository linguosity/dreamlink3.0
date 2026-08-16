'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DreamCard from './DreamCard';
import { useSearch } from '@/context/search-context';
import { useDreamSearch } from '@/hooks/use-dream-search';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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
  const [reader, setReader] = useState<{ title: string; body: string; done: boolean } | null>(null);

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
      setReader({ title: '', body: '', done: false }); // open the reading pop-up now
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
        setReader((r) => (r ? { ...r, done: true } : r)); // keep pop-up open, mark finished
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
      setReader((r) => ({ title, body, done: r?.done ?? false }));
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

// The auto-opening reading pop-up. Renders the title (streamed first) and the
// analysis body writing itself in, with a blinking cursor until done. Kept as a
// grid-level sibling so it survives the placeholder -> real-card handoff.
function StreamingReaderModal({
  reader,
  onClose,
}: {
  reader: { title: string; body: string; done: boolean } | null;
  onClose: () => void;
}) {
  const open = reader !== null;
  const bodyRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [reader?.body]);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl w-[92vw] max-h-[82vh] flex flex-col gap-0">
        <DialogDescription className="sr-only">
          Your dream interpretation, appearing as it is written.
        </DialogDescription>
        <DialogTitle className="font-serif text-2xl sm:text-3xl leading-[1.15] tracking-tight pr-8">
          {reader?.title ? (
            reader.title
          ) : (
            <span className="text-muted-foreground italic font-normal">
              Interpreting your dream…
            </span>
          )}
        </DialogTitle>
        <div ref={bodyRef} className="mt-3 flex-1 min-h-0 overflow-y-auto">
          <p className="font-serif text-[15px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {reader?.body}
            {reader && !reader.done && (
              <span
                aria-hidden="true"
                className="ml-0.5 inline-block h-4 w-[7px] animate-pulse rounded-[1px] bg-primary/70 align-text-bottom"
              />
            )}
          </p>
        </div>
        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <span className="text-xs text-muted-foreground">
            {reader && !reader.done ? 'Interpreting…' : 'Interpretation complete'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition"
          >
            {reader?.done ? 'Done' : 'Close'}
          </button>
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
