'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DreamCard from './DreamCard';
import { useSearch } from '@/context/search-context';
import { useDreamSearch } from '@/hooks/use-dream-search';
import { Search } from 'lucide-react';

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
}

export default function AnimatedDreamGrid({ dreams, maxRowItems = 3, isAdmin = false }: AnimatedDreamGridProps) {
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

  // Optimistic placeholder card shown immediately on submission
  const [pendingDream, setPendingDream] = useState<Dream | null>(null);

  // Track analyzed dream data that arrived before the server refresh
  const [analyzedDream, setAnalyzedDream] = useState<{id: string; analysis: any} | null>(null);

  // Listen for dream submission events to show a placeholder card instantly
  useEffect(() => {
    function handleDreamSubmitting(e: Event) {
      const detail = (e as CustomEvent).detail;
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
        setAnalyzedDream({ id: detail.id, analysis: detail.analysis });
      }
    }

    window.addEventListener('dreamriver:dream-submitting', handleDreamSubmitting);
    window.addEventListener('dreamriver:dream-analyzed', handleDreamAnalyzed);
    return () => {
      window.removeEventListener('dreamriver:dream-submitting', handleDreamSubmitting);
      window.removeEventListener('dreamriver:dream-analyzed', handleDreamAnalyzed);
    };
  }, []);

  // Clear pending placeholder only once the real card (identified by the
  // analyzed dream id) actually appears in the server-rendered list. Clearing
  // based on `dreams.length > 0` races against Supabase read propagation and
  // causes a visible gap between placeholder and real card.
  const analyzedIdInGrid =
    analyzedDream !== null && dreams.some((d) => d.id === analyzedDream.id);

  useEffect(() => {
    if (pendingDream && analyzedIdInGrid) {
      const timer = setTimeout(() => {
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

  // If no dreams (and no pending submission), show empty state
  if ((!dreams || dreams.length === 0) && !pendingDream) {
    return (
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
  }

  // Show no results state (client-side only)
  if (isMounted && isSearchEnabled && keywords.length > 0 && filteredDreams.length === 0) {
    return (
      <div className="min-h-[300px] flex flex-col items-center justify-center text-center p-8">
        <div className="bg-muted rounded-full p-6 mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg mb-2">No dreams found</h3>
        <p className="text-muted-foreground max-w-md">
          We couldn't find any dreams matching all of:{' '}
          {keywords.map((kw, i) => (
            <span key={i} className="font-medium">
              "{kw}"{i < keywords.length - 1 ? ', ' : ''}
            </span>
          ))}
          <br />
          Try removing some keywords or using different terms.
        </p>
      </div>
    );
  }
  
  // Show loading state (client-side only)
  if (isMounted && isSearchEnabled && isLoading) {
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
        tags: a.tags?.length > 0 ? a.tags : ['spiritual insight', 'dream analysis'],
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
    analyzedDream?.id ?? pendingDream?.id ?? 'placeholder';

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
              : ['spiritual insight', 'dream analysis'],
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
  const renderOrder: Array<
    | { type: 'standalone'; dream: Dream }
    | { type: 'group'; groupId: string; dreams: Dream[] }
  > = [];

  for (const dream of visible) {
    const groupId = dream.comparison_group_id;
    if (groupId) {
      if (seenGroupIds.has(groupId)) continue;
      seenGroupIds.add(groupId);
      const dreamsInGroup = visible.filter(
        (d) => d.comparison_group_id === groupId,
      );
      renderOrder.push({ type: 'group', groupId, dreams: dreamsInGroup });
    } else {
      renderOrder.push({ type: 'standalone', dream });
    }
  }

  const hasVisibleCards = renderOrder.length > 0 || showPlaceholder;

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
          {GALLERY_FILTERS.map(({ label, enabled }) => {
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
                    ? 'px-2.5 py-1 rounded-md bg-[color:var(--gold)] text-[color:var(--night-deep)] font-semibold'
                    : enabled
                      ? 'px-2.5 py-1 rounded-md text-muted-foreground hover:text-foreground transition-colors'
                      : 'px-2.5 py-1 rounded-md text-muted-foreground/40 cursor-not-allowed'
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {!hasVisibleCards ? (
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
      ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[300px]">
      <AnimatePresence initial={false}>
        {/* Optimistic placeholder — stays visible through analysis and
            disappears only once the real server row lands in the grid.
            For matrix submissions we still show one placeholder; the
            remaining rows arrive via router.refresh. */}
        {showPlaceholder && placeholderDream && (
          <motion.div
            key={placeholderKey}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
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
              isAdmin={isAdmin}
            />
          </motion.div>
        )}
        {renderOrder.map((item) =>
          item.type === 'standalone' ? (
            <motion.div
              key={item.dream.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
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
            <ComparisonGroup
              key={item.groupId}
              groupId={item.groupId}
              dreams={item.dreams}
              loadingDreamId={loadingDreamId}
              searchTerms={isMounted && isSearchEnabled ? keywords : []}
              isAdmin={isAdmin}
            />
          ),
        )}
      </AnimatePresence>
    </div>
      )}
    </div>
  );
}

// ── ComparisonGroup ──────────────────────────────────────────────────
// Renders a labeled, framed section that spans the full grid width and
// holds every card produced by a single admin test-mode submission. We
// detect which dimensions vary in the group and surface those as badges
// on each card, so the admin can read a card and know what produced it.
//
// Universal Design: identification is not color-only — there's a text
// header, a visible frame, badges on every card, and an ARIA role/label
// so assistive tech announces the set as a group.

interface ComparisonGroupProps {
  groupId: string;
  dreams: Dream[];
  loadingDreamId: string | null;
  searchTerms: string[];
  isAdmin?: boolean;
}

function ComparisonGroup({
  groupId,
  dreams,
  loadingDreamId,
  searchTerms,
  isAdmin = false,
}: ComparisonGroupProps) {
  const created = dreams[0]?.created_at
    ? new Date(dreams[0].created_at)
    : null;
  const headerDate = created
    ? created.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  // Identify the dimensions that actually vary across the group, so we
  // only badge what's meaningful.
  const uniqueDepths = new Set(dreams.map((d) => d.analysis_depth ?? ''));
  const uniqueReadingLevels = new Set(
    dreams.map((d) => d.reading_level_used ?? ''),
  );
  const uniqueAesthetics = new Set(
    dreams.map((d) => d.image_aesthetic_used ?? ''),
  );
  const showDepthBadge = uniqueDepths.size > 1;
  const showReadingLevelBadge = uniqueReadingLevels.size > 1;
  const showAestheticBadge = uniqueAesthetics.size > 1;

  return (
    <motion.section
      role="group"
      aria-label={`Test comparison · ${dreams.length} variants${headerDate ? ` from ${headerDate}` : ''}`}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'tween', duration: 0.4, ease: 'easeOut' }}
      className="col-span-full rounded-xl border-2 border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 p-4"
    >
      <header className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            Test comparison
          </span>
          <span className="text-xs text-muted-foreground">
            {dreams.length} variant{dreams.length === 1 ? '' : 's'}
            {headerDate && ` · ${headerDate}`}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dreams.map((dream) => (
          <div key={dream.id} className="relative">
            {/* Variant badges — top-right of the card. Only the dimensions
                that vary in this group are shown. */}
            {(showDepthBadge || showReadingLevelBadge || showAestheticBadge) && (
              <div className="absolute -top-2 right-2 z-10 flex flex-wrap gap-1 max-w-[90%] justify-end">
                {showDepthBadge && dream.analysis_depth && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-900 text-white shadow-sm">
                    {DEPTH_LABELS[dream.analysis_depth] ?? dream.analysis_depth}
                  </span>
                )}
                {showReadingLevelBadge && dream.reading_level_used && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground shadow-sm">
                    {READING_LEVEL_LABELS[dream.reading_level_used] ?? dream.reading_level_used}
                  </span>
                )}
                {showAestheticBadge && dream.image_aesthetic_used && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-700 text-white shadow-sm">
                    {AESTHETIC_LABELS[dream.image_aesthetic_used] ?? dream.image_aesthetic_used}
                  </span>
                )}
              </div>
            )}
            <DreamCard
              dream={dream}
              loading={dream.id === loadingDreamId}
              searchTerms={searchTerms}
              isAdmin={isAdmin}
            />
          </div>
        ))}
      </div>
    </motion.section>
  );
}