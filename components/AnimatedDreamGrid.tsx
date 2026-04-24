'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSearch } from '@/context/search-context';
import { useDreamSearch } from '@/hooks/use-dream-search';
import { Search } from 'lucide-react';

// Import framer-motion with error handling to prevent build failures
let motion: any = { div: 'div' };
let AnimatePresence: any = ({ children }: { children: React.ReactNode }) => <>{children}</>;

try {
  // Try to import framer-motion
  const framerMotion = require('framer-motion');
  motion = framerMotion.motion;
  AnimatePresence = framerMotion.AnimatePresence;
} catch (e) {
  console.error('Error loading framer-motion:', e);
  // Fallback to regular divs if framer-motion fails to load
}

// Use dynamic import for DreamCard with SSR disabled as fallback
const DreamCard = dynamic(() => import('./DreamCard'), {
  ssr: false,
  loading: () => <div className="h-64 w-full bg-muted animate-pulse rounded-md"></div>
});

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
  tags?: string[];
  bible_refs?: string[];
  created_at?: string;
}

interface AnimatedDreamGridProps {
  dreams: Dream[];
  maxRowItems?: number;
}

export default function AnimatedDreamGrid({ dreams, maxRowItems = 3 }: AnimatedDreamGridProps) {
  // Access search context
  const { keywords, isLoading, isSearchEnabled } = useSearch();

  // Always call the hook to maintain consistent hook order
  const searchedDreams = useDreamSearch(dreams, keywords);

  // Hooks must be called before any conditional returns (Rules of Hooks)
  const [loadingDreamId, setLoadingDreamId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

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
        <h3 className="text-2xl font-semibold mb-3">No dreams recorded yet</h3>
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
        <h3 className="text-lg font-medium mb-2">No dreams found</h3>
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

  // Enrich dreams with client-side analysis data if available (before server refresh)
  const enrichedDreams = filteredDreams.map((dream) => {
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[300px]">
      <AnimatePresence initial={false}>
        {/* Optimistic placeholder — stays visible through analysis and
            disappears only once the real server row lands in the grid. */}
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
            />
          </motion.div>
        )}
        {enrichedDreams.slice(0, 12).map((dream, index) => (
          <motion.div
            key={dream.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              type: 'tween',
              duration: 0.4,
              ease: 'easeOut'
            }}
            className="col-span-1"
          >
            <DreamCard
              dream={dream}
              loading={dream.id === loadingDreamId}
              searchTerms={isMounted && isSearchEnabled ? keywords : []}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}