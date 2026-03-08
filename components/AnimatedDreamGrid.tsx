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

  // Then conditionally use the results
  const filteredDreams = typeof window !== 'undefined' && isSearchEnabled
    ? searchedDreams
    : dreams;

  // Hooks must be called before any conditional returns (Rules of Hooks)
  const [loadingDreamId, setLoadingDreamId] = useState<string | null>(null);

  // Check for loading dream
  useEffect(() => {
    if (typeof window === 'undefined') return;

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

  // If no dreams, show empty state
  if (!dreams || dreams.length === 0) {
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
  if (typeof window !== 'undefined' && isSearchEnabled && keywords.length > 0 && filteredDreams.length === 0) {
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
  if (typeof window !== 'undefined' && isSearchEnabled && isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 min-h-[300px]">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-64 w-full bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div 
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 min-h-[300px]"
      style={{ gridAutoFlow: 'dense' }}
    >
      <AnimatePresence initial={false}>
        {filteredDreams.slice(0, 12).map((dream, index) => (
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
              searchTerms={typeof window !== 'undefined' && isSearchEnabled ? keywords : []}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}