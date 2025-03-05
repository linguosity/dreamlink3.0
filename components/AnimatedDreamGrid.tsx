'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
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
  // If no dreams, show placeholder
  if (!dreams || dreams.length === 0) {
    const placeholderDream = {
      id: 'placeholder',
      original_text: "I was walking along a beach at sunset when I noticed the water was crystal clear. I could see colorful fish swimming beneath the surface. Suddenly, the water parted in front of me like the Red Sea in the Bible. I walked between the walls of water and discovered an ancient temple with symbols I couldn't understand. Inside the temple was a bright light that spoke to me, saying I had a mission to fulfill. I woke up feeling peaceful yet with a sense of purpose.",
      title: 'Example: Ocean Temple Dream',
      dream_summary: 'A journey to an underwater temple where divine guidance was received, suggesting a spiritual calling or mission.',
      analysis_summary: 'This dream contains elements of divine revelation and spiritual journey. The parting waters reference Moses and the Exodus story, while the temple represents a sacred space for divine communication. The voice from light suggests divine guidance or calling.',
      tags: ['Water', 'Temple', 'Divine Message', 'Journey'],
      bible_refs: ['Exodus 14:21', 'John 8:12', '1 Kings 6:19', 'Psalm 23:2'],
      created_at: new Date().toISOString()
    };
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="col-span-1">
          <DreamCard empty={true} dream={placeholderDream} />
        </div>
      </div>
    );
  }

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

  return (
    <div 
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 min-h-[300px]"
      style={{ gridAutoFlow: 'dense' }}
    >
      <AnimatePresence initial={false}>
        {dreams.slice(0, 12).map((dream, index) => (
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
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}