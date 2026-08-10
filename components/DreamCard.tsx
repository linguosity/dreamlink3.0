// components/DreamCard.tsx
//
// Technical explanation:
// UI component for displaying a single dream entry card. It's responsible for
// showing the dream's title, date, a brief summary, and any associated tags.
// This component also handles user interactions such as viewing detailed
// analysis in a dialog, deleting the dream entry, sharing it, and displaying
// loading states while data is being fetched or processed. It also includes
// functionality to highlight search terms within the card content.
//
// Analogy:
// Think of this as an individual display case for each dream in a gallery.
// Each case shows a preview of the dream (title, summary, tags) and has
// buttons to manage it: one to open a detailed view (like looking closer at
// the item), one to remove it from the gallery (delete), and one to share it
// with others. It also shows if the item is still being prepared (loading state)
// and can highlight parts of the description if you're searching for something
// specific.

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { highlightMatches } from "@/utils/highlight";
import { toast } from "sonner";
import { logClientError } from "@/utils/errorLogger";
import { FeatureHint } from "@/components/feature-hint";
import { buildDreamCost, formatUsd } from "@/utils/pricing";
import ShareDreamButton from "@/components/ShareDreamButton";
import { AiDisclosure } from "@/components/brand/AiDisclosure";
import { track } from "@/lib/analytics";

// These were nine try/catch require() blocks, each falling back to an inline
// unstyled copy of the component when the require threw. In the app the
// fallbacks never ran; under vitest they always did, because require() cannot
// resolve the "@" alias — so tests rendered lookalike markup instead of the
// real components and every run printed nine MODULE_NOT_FOUND traces. With
// static imports a missing or renamed export fails the build, which is what
// you want, instead of silently degrading the UI at runtime.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// Popover (not Tooltip) backs the scripture chips: Radix Tooltip never opens on
// touch, which left verse text unreachable on mobile.
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";



// Dev-only logger (2026-06-09 audit: 46 console.log calls in render/format
// paths shipped to production — including per-text-part logging on every
// open dialog render). console.error/warn are kept as-is for real failures.
const debugLog: typeof console.log =
  process.env.NODE_ENV === "development"
    ? console.log.bind(console)
    : () => {};

// Use inline SVG components instead of lucide-react imports
const CalendarIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const CloudMoonIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2c-5.33 4.55-8 8.48-8 12 0 3.31 1.72 4 6 4h12c1.66 0 2-1 2-2.5V8c0-5-2.75-6-12-6z" />
    <path d="M17 8h2" />
    <path d="M17 13h1" />
    <path d="M19 11v2" />
  </svg>
);

const BookIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const MaximizeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 3h6v6" />
    <path d="M9 21H3v-6" />
    <path d="M21 3l-7 7" />
    <path d="M3 21l7-7" />
  </svg>
);

const PuzzleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.47 1.229 0 1.698l-1.42 1.42c-.47.47-1.229.47-1.698 0l-1.568-1.568a.997.997 0 0 0-.878-.289l-2.736.419a1 1 0 0 0-.844.844l-.419 2.736a.997.997 0 0 0 .289.878l1.568 1.568c.47.47.47 1.229 0 1.698l-1.42 1.42c-.47.47-1.229.47-1.698 0l-1.568-1.568a.997.997 0 0 0-.878-.289l-2.736.419a1 1 0 0 0-.844.844l-.419 2.736c-.049.322.059.648.289.878l1.568 1.568c.47.47.47 1.229 0 1.698l-1.42 1.42c-.47.47-1.229.47-1.698 0L4.58 19.439a.997.997 0 0 0-.878-.289l-2.736.419a1 1 0 0 0-.844.844l-.419 2.736" />
    <path d="M4 5v4.343" />
    <path d="M9.343 0H5" />
    <path d="M4 14v1a5 5 0 0 0 5 5h1" />
    <path d="M14 19h1a5 5 0 0 0 5-5v-1" />
    <path d="M19 9h-1a5 5 0 0 0-5-5H9" />
  </svg>
);

const Trash2Icon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const ShareIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

// Star toggle icon. `filled` swaps between an outlined star (not starred)
// and a solid Violet Light star (starred) — a fixed accent (not the
// theme-following --primary) so it stays legible over both plain card
// surfaces and dream-art photo backgrounds.
const StarIcon = ({ className, filled }: { className?: string; filled?: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const RefreshCwIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15a9 9 0 0 1-14.85 3.36" />
  </svg>
);

const MessageSquare = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);







// Helper function to highlight text matches for multiple keywords
function highlightText(text: string, searchTerms: string | string[]): React.ReactNode {
  if (!text) return text;
  
  // If searchTerms is a string, convert it to an array
  const terms = Array.isArray(searchTerms) ? searchTerms : [searchTerms];
  
  // If no search terms, return the original text
  if (!terms.length || (terms.length === 1 && !terms[0])) {
    return text;
  }
  
  // Create a safe pattern by escaping special regex characters
  const escapedTerms = terms.map(term => 
    term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  
  // Create a RegExp that matches any of the search terms
  const searchPattern = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
  
  const parts = text.split(searchPattern);
  
  return (
    <>
      {parts.map((part, i) => {
        // Check if this part matches any of the search terms (case insensitive)
        const isMatch = terms.some(term => 
          part.toLowerCase() === term.toLowerCase()
        );
        
        if (isMatch) {
          return (
            <mark key={i} className="bg-yellow-200 dark:bg-amber-900 dark:text-white rounded-sm px-0.5">
              {part}
            </mark>
          );
        }
        
        return part;
      })}
    </>
  );
}

// Legacy helper function to highlight a single search term
function highlightTextLegacy(text: string, searchTerm: string): React.ReactNode {
  if (!searchTerm || !text) return text;

  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === searchTerm.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-amber-900 dark:text-white rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

// Shimmer animation component for image placeholder.
//
// v3 rule 2 — "the gradient belongs to the logo alone; every other surface is
// flat" — so the RESTING surface is a flat Mist/Surface-2 fill. The only
// gradient left is the travelling highlight, which is the shimmer itself
// (a moving specular sweep, not a painted surface) and disappears the moment
// the image lands. The old dark-mode stops were raw slate, not tokens.
function DreamImageShimmer() {
  return (
    <div className="relative w-full h-40 bg-muted overflow-hidden">
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
    </div>
  );
}

// Image header component for the card — only renders when an image exists or is loading
function DreamImageHeader({ imageUrl, isLoading }: { imageUrl: string | null; isLoading: boolean }) {
  if (isLoading) {
    return <DreamImageShimmer />;
  }

  if (!imageUrl) {
    return null;
  }

  return (
    <div className="relative w-full h-40 bg-muted overflow-hidden">
      <Image
        src={imageUrl}
        alt="Dream visualization"
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
        priority={false}
        // Bypass the Next optimizer for private Supabase signed URLs (see the
        // note on the gallery card image) — avoids blank images on load.
        unoptimized
      />
    </div>
  );
}

type DreamEntryProps = {
  empty?: boolean;
  loading?: boolean;
  searchTerms?: string[];
  /** Server-driven flag — gates the cost footer at the bottom of the card. */
  isAdmin?: boolean;
  dream: {
    id: string;
    original_text: string;
    title?: string;
    dream_summary?: string;
    personalized_summary?: string;
    analysis_summary?: string;
    topic_sentence?: string;
    supporting_points?: string[];
    conclusion_sentence?: string;
    formatted_analysis?: string;
    tags?: string[];
    bible_refs?: string[];
    created_at?: string;
    image_url?: string | null;
    /** Opt-in public sharing state. */
    is_public?: boolean;
    share_token?: string | null;
    share_scope?: 'summary' | 'full' | null;
    /** Owner-only "favorite" flag, surfaced via the Starred gallery filter. */
    is_starred?: boolean;
    /** Owner-only interpretation feedback: null = no vote, true/false = latest vote. */
    meaningful?: boolean | null;
    /** Admin-only usage row joined from chatgpt_interactions. */
    _admin_usage?: {
      input_tokens: number | null;
      output_tokens: number | null;
      image_generated: boolean | null;
      image_cost_usd: number | null;
    } | null;
  };
};

// This would come from your API in a real implementation
const BIBLE_VERSES: Record<string, string> = {
  "Genesis 1:1": "In the beginning God created the heaven and the earth.",
  "Psalm 23": "The Lord is my shepherd; I shall not want.",
  "Psalm 23:2": "He maketh me to lie down in green pastures: he leadeth me beside the still waters.",
  "Matthew 5:3": "Blessed are the poor in spirit: for theirs is the kingdom of heaven.",
  "John 3:16": "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
  "John 8:12": "Then spake Jesus again unto them, saying, I am the light of the world: he that followeth me shall not walk in darkness, but shall have the light of life.",
  "Exodus 14:21": "And Moses stretched out his hand over the sea; and the LORD caused the sea to go back by a strong east wind all that night, and made the sea dry land, and the waters were divided.",
  "1 Kings 6:19": "And the oracle he prepared in the house within, to set there the ark of the covenant of the LORD."
};

export default function DreamCard({ empty, loading: initialLoading, dream: initialDream, searchTerms = [], isAdmin = false }: DreamEntryProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Lightbox for the header artwork — the header render is small by design,
  // so this is where the 1024² generation actually gets seen at size.
  const [imageExpanded, setImageExpanded] = useState(false);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(initialLoading || false);
  const [activeTab, setActiveTab] = useState("analysis");
  const [modalHeight, setModalHeight] = useState<number | null>(null);
  const analysisContentRef = useRef<HTMLDivElement>(null);
  const originalContentRef = useRef<HTMLDivElement>(null);
  const [dream, setDream] = useState(initialDream);
  const [isShared, setIsShared] = useState(Boolean(initialDream.is_public));
  const [isStarred, setIsStarred] = useState(Boolean(initialDream.is_starred));
  const [isStarPending, setIsStarPending] = useState(false);
  // One-tap interpretation feedback ("Was this reading meaningful?").
  // null = no vote yet; re-votes overwrite (the API is idempotent).
  const [feedbackChoice, setFeedbackChoice] = useState<boolean | null>(
    initialDream.meaningful ?? null
  );
  const [isFeedbackPending, setIsFeedbackPending] = useState(false);
  const [bibleVerses, setBibleVerses] = useState<Record<string, string>>({});
  // Themed verse citations (HANDOFF-v3.md §5 item 2): reference -> the theme
  // the model matched it on ("crossing waters"). Keyed identically to
  // bibleVerses, both raw and normalized, so getVerseTheme can mirror
  // getVerseText's lookup order. Empty for readings recorded before themes
  // were persisted — those chips render as a bare reference, by design.
  const [verseThemes, setVerseThemes] = useState<Record<string, string>>({});
  // "Read again · 1 credit" (§5 item 4). Cost is stated on the control
  // itself, never after the fact.
  const [isRereading, setIsRereading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(initialDream.image_url || null);
  const [imageError, setImageError] = useState(false);
  // Poll for image if: no image yet AND (card is loading OR dream was created within the last 2 minutes)
  // We poll for any recent dream regardless of whether dream_summary is populated,
  // because the server render may happen before DB writes fully propagate.
  const isRecentDream = initialDream.created_at
    ? (Date.now() - new Date(initialDream.created_at).getTime()) < 2 * 60 * 1000
    : false;
  const [isPollingCardImage, setIsPollingCardImage] = useState(
    !initialDream.image_url && (initialLoading || isRecentDream)
  );

  // Ensure client-side hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Format date as MMM DD
  const dateObj = dream.created_at ? new Date(dream.created_at) : new Date();
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
  
  // Helper function to normalize a Bible reference
  const normalizeReference = (reference: string): string => {
    // Remove extra spaces and standardize format
    return reference.trim().replace(/\s+/g, ' ');
  };
  
  // Helper function to expand verse ranges
  const expandVerseRange = (reference: string): string[] => {
    // Match patterns like "Book XX:YY-ZZ" where YY and ZZ are verse numbers
    const rangeMatch = reference.match(/^((?:\d\s+)?[a-zA-Z]+(?:\s+[a-zA-Z]+)*\s+\d+):(\d+)-(\d+)$/);
    
    if (!rangeMatch) {
      // Not a range, return as is
      return [reference.trim()];
    }
    
    const [, bookChapter, startVerse, endVerse] = rangeMatch;
    const start = parseInt(startVerse, 10);
    const end = parseInt(endVerse, 10);
    
    // Check if it's a valid range
    if (isNaN(start) || isNaN(end) || start > end) {
      debugLog(`⚠️ Invalid verse range: ${reference}`);
      return [reference.trim()];
    }
    
    // Expand the range
    const expandedRefs: string[] = [];
    for (let verse = start; verse <= end; verse++) {
      expandedRefs.push(`${bookChapter}:${verse}`);
    }
    
    debugLog(`Expanded verse range ${reference} into ${expandedRefs.length} individual verses`);
    return expandedRefs;
  };
  
  // Utility function to find verse text with multiple reference formats
  const getVerseText = (reference: string): { text: string, isFallback: boolean, source: string } => {
    // Normalize reference for consistent lookup
    const normalizedRef = normalizeReference(reference);
    let verseText: string | undefined;
    let isFallback = false;
    let source = "";
    
    // Check if this is a verse range
    const isRange = reference.match(/^((?:\d\s+)?[a-zA-Z]+(?:\s+[a-zA-Z]+)*\s+\d+):(\d+)-(\d+)$/);
    
    if (isRange) {
      debugLog(`Processing verse range in component: ${reference}`);
      
      // Step 1: Try to find the full range text directly
      if (bibleVerses[reference]) {
        verseText = bibleVerses[reference];
        source = "exact-range";
        debugLog(`Found exact range match for ${reference}`);
      }
      else if (bibleVerses[normalizedRef]) {
        verseText = bibleVerses[normalizedRef];
        source = "normalized-range";
        debugLog(`Found normalized range match for ${normalizedRef}`);
      }
      // Step 2: Try fallback lookup
      else if (BIBLE_VERSES[reference]) {
        verseText = BIBLE_VERSES[reference];
        isFallback = true;
        source = "fallback-range";
        debugLog(`Using fallback for range ${reference}`);
      }
      else if (BIBLE_VERSES[normalizedRef]) {
        verseText = BIBLE_VERSES[normalizedRef];
        isFallback = true;
        source = "fallback-normalized-range";
        debugLog(`Using fallback for normalized range ${normalizedRef}`);
      }
      // Step 3: Try to build text from individual verses
      else {
        const expandedRefs = expandVerseRange(reference);
        const expandedTexts: string[] = [];
        
        expandedRefs.forEach(expandedRef => {
          // Try finding text for each individual verse
          let expandedVerse: string | undefined;
          
          // Check in biblesVerses
          if (bibleVerses[expandedRef]) {
            expandedVerse = bibleVerses[expandedRef];
          } 
          // Check in fallbacks
          else if (BIBLE_VERSES[expandedRef]) {
            expandedVerse = BIBLE_VERSES[expandedRef];
            isFallback = true;
          }
          
          if (expandedVerse) {
            expandedTexts.push(expandedVerse);
          }
        });
        
        // If we found texts for individual verses, combine them
        if (expandedTexts.length > 0) {
          verseText = expandedTexts.join(" ");
          source = isFallback ? "expanded-fallback" : "expanded";
          debugLog(`Built range ${reference} from ${expandedTexts.length}/${expandedRefs.length} individual verses`);
        }
      }
      
      // If still nothing found for range, use placeholder
      if (!verseText) {
        debugLog(`No verse text found for range ${reference}`);
        source = "missing-range";
      }
    } 
    else {
      // Regular single verse reference
      
      // Step 1: Try exact reference match first (as provided)
      if (bibleVerses[reference]) {
        verseText = bibleVerses[reference];
        source = "exact";
        debugLog(`Found exact verse match for ${reference}`);
      }
      
      // Step 2: Try normalized reference if exact match failed
      else if (bibleVerses[normalizedRef]) {
        verseText = bibleVerses[normalizedRef];
        source = "normalized";
        debugLog(`Found normalized verse match for ${normalizedRef}`);
      }
      
      // Step 3: Try alternative formats
      else {
        // Try without spaces between book and chapter (e.g., "Genesis1:1")
        const noSpaceRef = reference.replace(/\s+/g, '');
        if (bibleVerses[noSpaceRef]) {
          verseText = bibleVerses[noSpaceRef];
          source = "no-space";
          debugLog(`Found no-space verse match for ${noSpaceRef}`);
        }
        
        // Try splitting and reformatting (book name + chapter:verse)
        else {
          const match = reference.match(/((?:\d\s+)?[a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s*(\d+:\d+)/);
          if (match) {
            const [, book, chapterVerse] = match;
            const reformattedRef = `${book.trim()} ${chapterVerse.trim()}`;
            
            if (bibleVerses[reformattedRef]) {
              verseText = bibleVerses[reformattedRef];
              source = "reformatted";
              debugLog(`Found reformatted verse match for ${reformattedRef}`);
            }
          }
          
          // Last resort: fallback to predefined verses
          if (!verseText) {
            // Try exact and normalized in the fallback list
            if (BIBLE_VERSES[reference]) {
              verseText = BIBLE_VERSES[reference];
              isFallback = true; 
              source = "fallback-exact";
              debugLog(`Using fallback verse for ${reference}`);
            }
            else if (BIBLE_VERSES[normalizedRef]) {
              verseText = BIBLE_VERSES[normalizedRef];
              isFallback = true;
              source = "fallback-normalized";
              debugLog(`Using fallback verse for ${normalizedRef}`);
            }
          }
        }
      }
      
      // If still not found, use a loading placeholder
      if (!verseText) {
        debugLog(`No verse text found for ${reference} (normalized: ${normalizedRef})`);
        source = "missing";
      }
    }
    
    return {
      text: verseText || `Verse text not available for ${reference}`,
      isFallback,
      source
    };
  };

  // The theme this verse was matched on, for the "Isaiah 43:2 · crossing
  // waters" chip (HANDOFF-v3.md §5 item 2). Mirrors getVerseText's raw-then-
  // normalized lookup order, since the API keys themes exactly like verses.
  // Returns null — not a placeholder — for readings that predate the theme
  // column; a chip with no theme is the correct render, an invented one is
  // not.
  const getVerseTheme = (reference: string): string | null => {
    const raw = verseThemes[reference];
    if (raw) return raw;
    const normalized = verseThemes[normalizeReference(reference)];
    return normalized || null;
  };

  // Track whether analysis timed out so we can show an error state
  const [analysisTimedOut, setAnalysisTimedOut] = useState(false);

  // Check if this dream is the loading dream (just submitted)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadingDreamId = localStorage.getItem('loadingDreamId');
    const loadingStartedAt = localStorage.getItem('loadingDreamStartedAt');

    // Only poll for the "loading" dream
    if (loadingDreamId !== dream.id) return;

    // Guard against stale loading state from a previous session/page load.
    // If the loading flag was set more than 3 minutes ago, the background job
    // almost certainly failed — stop polling immediately and show an error.
    if (loadingStartedAt) {
      const elapsed = Date.now() - parseInt(loadingStartedAt, 10);
      if (elapsed > 3 * 60 * 1000) {
        debugLog('Stale loadingDreamId detected (>3 min old), clearing');
        localStorage.removeItem('loadingDreamId');
        localStorage.removeItem('loadingDreamStartedAt');
        setIsLoading(false);
        setAnalysisTimedOut(true);
        return;
      }
    }

    debugLog('This dream is loading:', dream.id);
    setIsLoading(true);

    let pollCount = 0;
    const maxPolls = 60; // Maximum 2 minutes of polling (60 * 2s = 120s)

    const interval = setInterval(async () => {
      try {
        pollCount++;
        debugLog(`Polling attempt ${pollCount}/${maxPolls} for dream ${dream.id}`);

        // Stop polling after maximum attempts — show timeout error
        if (pollCount >= maxPolls) {
          debugLog('Maximum polling attempts reached, stopping');
          setIsLoading(false);
          setAnalysisTimedOut(true);
          localStorage.removeItem('loadingDreamId');
          localStorage.removeItem('loadingDreamStartedAt');
          clearInterval(interval);
          return;
        }

        // If dream already has analysis locally, stop polling
        if (dream.dream_summary || dream.analysis_summary ||
            (dream.supporting_points && dream.supporting_points.length > 0)) {
          debugLog('Dream analysis complete locally:', dream.id);
          setIsLoading(false);
          localStorage.removeItem('loadingDreamId');
          localStorage.removeItem('loadingDreamStartedAt');
          clearInterval(interval);
          return;
        }

        // Check dream status via API
        const response = await fetch(`/api/dream-entries?id=${dream.id}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          }
        });

        if (!response.ok) {
          console.error(`API error: ${response.status}`);
          return;
        }

        const data = await response.json();

        if (data && data.dreams && data.dreams.length > 0) {
          const updatedDream = data.dreams[0];

          // Check for analysis error state (fallback text from failed analysis)
          if (updatedDream.dream_summary === "Analysis could not be completed at this time.") {
            debugLog('Dream analysis failed on server, stopping poll');
            setDream(updatedDream);
            setIsLoading(false);
            setAnalysisTimedOut(true);
            localStorage.removeItem('loadingDreamId');
            localStorage.removeItem('loadingDreamStartedAt');
            clearInterval(interval);
            return;
          }

          // When analysis arrives, update state and stop polling
          if (updatedDream.dream_summary || updatedDream.analysis_summary ||
             (updatedDream.supporting_points && updatedDream.supporting_points.length > 0)) {
            debugLog('Dream analysis detected via API, updating state');
            setDream(updatedDream);
            setIsLoading(false);
            setAnalysisTimedOut(false);
            localStorage.removeItem('loadingDreamId');
            localStorage.removeItem('loadingDreamStartedAt');
            clearInterval(interval);

            // Refresh server components without a full page reload
            // (audit M5: reload discarded all client state mid-session).
            router.refresh();
          }
        }
      } catch (err) {
        console.error('Error checking dream status:', err);
        // Continue polling on errors, but count it as an attempt
      }
    }, 2000);

    // Always clear on unmount
    return () => {
      debugLog('Clearing polling interval for dream:', dream.id);
      clearInterval(interval);
    };
  }, [dream.id]); // Removed other dependencies to prevent re-creating interval

  // Poll for dream image if it's not yet available
  useEffect(() => {
    if (!isPollingCardImage || !dream.id) return;
    // Optimistic placeholder ids (e.g. "pending-1729..." before analysis returns)
    // aren't real UUIDs — polling them produces a Supabase filter error / 404.
    if (dream.id.startsWith('pending-')) return;

    debugLog('Starting image polling for dream:', dream.id);
    let pollCount = 0;
    const maxPolls = 12; // 60 seconds (12 * 5s)

    const interval = setInterval(async () => {
      try {
        pollCount++;
        debugLog(`Image polling attempt ${pollCount}/${maxPolls} for dream ${dream.id}`);

        if (pollCount >= maxPolls) {
          debugLog('Max image polling attempts reached');
          setIsPollingCardImage(false);
          setImageError(true);
          clearInterval(interval);
          return;
        }

        // Check if we already have an image URL
        if (cardImageUrl) {
          debugLog('Image URL already available, stopping poll');
          setIsPollingCardImage(false);
          clearInterval(interval);
          return;
        }

        const response = await fetch(`/api/dream-entries?id=${dream.id}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          }
        });

        if (!response.ok) {
          console.error(`Image poll error: ${response.status}`);
          return;
        }

        const data = await response.json();
        if (data && data.dreams && data.dreams.length > 0) {
          const updatedDream = data.dreams[0];
          if (updatedDream.image_url) {
            debugLog('Dream image detected via polling, updating state');
            setCardImageUrl(updatedDream.image_url);
            setDream(updatedDream);
            setIsPollingCardImage(false);
            setImageError(false);
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Error polling for dream image:', err);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [isPollingCardImage, dream.id, cardImageUrl]);
  
  // Calculate and store the maximum height of tab content
  // Fetch Bible verses when the dialog opens
  useEffect(() => {
    if (isOpen && dream.id && dream.bible_refs && dream.bible_refs.length > 0) {
      debugLog("🔍 Fetching Bible verses for dream:", dream.id);
      debugLog("References needed:", dream.bible_refs);
      
      const fetchBibleVerses = async () => {
        try {
          debugLog(`🌐 Making API call to /api/bible-verses/lookup?dreamId=${dream.id}`);
          const response = await fetch(`/api/bible-verses/lookup?dreamId=${dream.id}`);
          
          debugLog(`📊 API response status:`, response.status);
          
          if (response.ok) {
            const data = await response.json();
            debugLog("📚 Fetched Bible verses:", data);
            debugLog("Available reference count:", Object.keys(data).length);
            
            // Log details about which verses we have
            if (dream.bible_refs) {
              debugLog("Checking response for each needed reference:");
              dream.bible_refs.forEach(ref => {
                const normalizedRef = normalizeReference(ref);
                const hasExact = !!data[ref];
                const hasNormalized = !!data[normalizedRef];
                
                debugLog(`  ${ref}: exact=${hasExact}, normalized=${hasNormalized}, value=${
                  hasExact ? data[ref].substring(0, 20) + "..." : 
                  (hasNormalized ? data[normalizedRef].substring(0, 20) + "..." : "not found")
                }`);
              });
            }
            
            // Themes ride along under a reserved key so the response body
            // stays the flat {ref: text} map older clients index directly
            // (see app/api/bible-verses/lookup). Split them back apart here.
            const { _themes: themes, ...verses } = data as Record<string, any>;

            // Important: Create a new object to trigger re-render
            const verseData = { ...verses } as Record<string, string>;
            setBibleVerses(verseData);
            setVerseThemes(
              themes && typeof themes === "object"
                ? (themes as Record<string, string>)
                : {},
            );
            
            // Verify if we got verse text for all references
            if (dream.bible_refs) {
              const matchSummary = {
                total: dream.bible_refs.length,
                found: 0,
                missing: 0
              };
              
              dream.bible_refs.forEach((ref) => {
                const found = data[ref] ? true : false;
                debugLog(`Verse text for ${ref}: ${found ? 'Found' : 'Missing'}`);
                
                if (found) {
                  matchSummary.found++;
                } else {
                  matchSummary.missing++;
                }
              });
              
              debugLog("📊 Bible verse match summary:", matchSummary);
            }
          } else {
            console.error("API error response:", await response.text());
          }
        } catch (error) {
          console.error("Error fetching Bible verses:", error);
        }
      };
      
      fetchBibleVerses();
    }
  }, [isOpen, dream.id, dream.bible_refs]);

  // Keep the tab panel a constant height so switching Analysis <-> Original
  // Dream doesn't resize the dialog. An original dream is often a couple of
  // sentences while its profound analysis runs ~1,000 words, so the panel
  // could collapse by well over a thousand pixels on a tab click — the dialog
  // jumps under the cursor and the scroll position lurches.
  //
  // This replaces an earlier attempt that measured both panels in a 100ms
  // setTimeout and never applied the result. It couldn't have worked: Radix
  // unmounts the inactive TabsContent, so originalContentRef.current was
  // always null and originalHeight was always 0.
  //
  // Analysis is the default tab and effectively always the taller one, so its
  // height is the floor. ResizeObserver rather than a fixed timeout because
  // the height moves as fonts settle and scripture popovers hydrate. Latch to
  // the max seen so late-loading content can grow the floor but never shrink
  // it mid-session, which would reintroduce the jump it exists to prevent.
  useEffect(() => {
    if (!isOpen) {
      setModalHeight(null);
      return;
    }
    const el = analysisContentRef.current;
    if (!el) return;
    const measure = () =>
      setModalHeight((prev) => Math.max(prev ?? 0, el.offsetHeight));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isOpen, activeTab, dream.id]);

  // Analytics: a dream's analysis was opened in the detail dialog. No-ops
  // without consent (see lib/analytics). Skips example/placeholder cards and
  // dreams whose analysis hasn't landed yet.
  useEffect(() => {
    if (!isOpen || empty) return;
    if (!dream.id || dream.id.startsWith("pending-")) return;
    if (!dream.formatted_analysis && !dream.analysis_summary) return;
    track("analysis_viewed", { dream_id: dream.id });
  }, [isOpen, empty, dream.id, dream.formatted_analysis, dream.analysis_summary]);

  // Handle card click to show dialog
  const handleCardClick = () => {
    // Always open dialog, even for placeholder/example dreams
    setIsOpen(true);
  };
  
  // Handle star/unstar — optimistic toggle with rollback on failure.
  const handleToggleStar = async (e: React.MouseEvent) => {
    // Don't let the click bubble up to the card (which opens the dialog).
    e.stopPropagation();
    if (empty || isStarPending) return; // Example/placeholder cards aren't starrable.
    if (dream.id.startsWith('pending-')) return; // Not yet persisted.

    const next = !isStarred;
    setIsStarred(next); // optimistic
    setIsStarPending(true);

    try {
      const response = await fetch('/api/dream-entries/star', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dream.id, starred: next }),
      });

      if (!response.ok) {
        throw new Error('Failed to update star');
      }
      // Keep the page's server-rendered list (and the Starred filter) in sync.
      router.refresh();
    } catch (error) {
      setIsStarred(!next); // rollback
      console.error('Error updating star:', error);
      logClientError("dream_star", error instanceof Error ? error.message : String(error), {
        route: `/api/dream-entries/star`,
      });
      toast.error('Could not update this dream. Please try again.');
    } finally {
      setIsStarPending(false);
    }
  };

  // Handle interpretation feedback — optimistic set with rollback on failure,
  // mirroring the star toggle. Changing the vote is allowed; the server
  // simply overwrites the previous one.
  const handleFeedback = async (value: boolean) => {
    if (empty || isFeedbackPending) return; // Example/placeholder cards aren't ratable.
    if (dream.id.startsWith('pending-')) return; // Not yet persisted.
    if (feedbackChoice === value) return; // Same vote — nothing to change.

    const previous = feedbackChoice;
    setFeedbackChoice(value); // optimistic
    setIsFeedbackPending(true);

    try {
      const response = await fetch(`/api/dream-entries/${dream.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meaningful: value }),
      });

      if (!response.ok) {
        throw new Error('Failed to save feedback');
      }

      // track() is consent-gated and no-ops without a PostHog key,
      // so this is always safe to call.
      try {
        track("interpretation_feedback", {
          meaningful: value,
          dream_id: dream.id,
        });
      } catch {
        // Analytics must never break the feedback moment.
      }
    } catch (error) {
      setFeedbackChoice(previous); // rollback
      console.error('Error saving feedback:', error);
      logClientError("dream_feedback", error instanceof Error ? error.message : String(error), {
        route: `/api/dream-entries/${dream.id}/feedback`,
      });
      toast.error('Could not save your feedback. Please try again.');
    } finally {
      setIsFeedbackPending(false);
    }
  };

  // "Read again · 1 credit" (HANDOFF-v3.md §5 item 4). The cost is on the
  // button face, and the confirm restates it — a re-read is one of the few
  // one-tap actions in the product that spends money, so it gets a beat of
  // friction rather than an undo it cannot offer.
  const handleReadAgain = async () => {
    if (empty || isRereading) return;
    if (dream.id.startsWith('pending-')) return;

    setIsRereading(true);
    try {
      const response = await fetch(`/api/dream-entries/${dream.id}/regenerate`, {
        method: 'POST',
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        // Out of credits is the paywall moment, not an error — same
        // treatment as the composer (see CompactDreamInput).
        if (response.status === 402 && result?.code === 'out_of_credits') {
          toast.error(result.error ?? "You're out of credits.");
          router.push('/pricing');
          return;
        }
        throw new Error(result?.error || `Re-read failed: ${response.status}`);
      }

      if (result?.dream) {
        // Swap the reading in place. The scripture chips are keyed off
        // bible_refs, so clearing the hydrated verse text forces the lookup
        // effect to refetch text AND themes for the new citations rather
        // than showing the previous reading's.
        setDream((prev) => ({ ...prev, ...result.dream }));
        setBibleVerses({});
        setVerseThemes({});
      } else {
        router.refresh();
      }

      // A new reading deserves its own verdict — the old vote rated a
      // reading that no longer exists.
      setFeedbackChoice(null);
      toast.success('A new reading is ready.');
    } catch (error) {
      console.error('Error re-reading dream:', error);
      logClientError("dream_regenerate", error instanceof Error ? error.message : String(error), {
        route: `/api/dream-entries/${dream.id}/regenerate`,
      });
      toast.error(
        error instanceof Error ? error.message : 'Could not start a new reading.',
      );
    } finally {
      setIsRereading(false);
    }
  };

  // Handle delete dream
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteDream = async () => {
    if (empty) return; // Don't allow deleting example dreams
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/dream-entries?id=${dream.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete dream');
      }
      
      // Close the dialog and refresh the page
      setIsOpen(false);
      router.refresh();
      
    } catch (error) {
      console.error('Error deleting dream:', error);
      logClientError("dream_delete", error instanceof Error ? error.message : String(error), {
        route: `/api/dream-entries?id=${dream.id}`,
      });
      toast.error('Failed to delete this dream. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Section headings the server-side composer emits as their own paragraph.
  // Kept in sync with DEEP_SECTIONS / PROFOUND_SECTIONS in lib/dreamAnalysis.ts —
  // matching on the exact strings is deliberate: the composer writes plain text,
  // so this is the only signal that a line is a heading rather than prose.
  const SECTION_HEADINGS = new Set([
    "Dream Symbols",
    "How this might apply to your life right now",
    "Three Lenses on This Dream",
    "For your prayer or journal",
  ]);

  /**
   * Renders a composed analysis with its structure intact.
   *
   * composeAnalysis() in lib/dreamAnalysis.ts joins the core prose and each
   * section with "\n\n", and writes section headings as their own line. Passing
   * that straight into a <div> let HTML collapse every blank line, so a ~1,000
   * word profound reading rendered as ONE paragraph with its three headings
   * buried inline as sentence fragments — i.e. the paid tiers' entire
   * differentiator was invisible. Split on the blank lines and promote the
   * known headings to real <h3>s.
   */
  const renderAnalysis = (text: string | undefined, refs?: string[]) => {
    if (!text) return null;
    const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
    return (
      <div className="space-y-3 text-sm text-muted-foreground max-w-[65ch]">
        {blocks.map((block, i) =>
          SECTION_HEADINGS.has(block) ? (
            <h3
              key={i}
              className="text-sm font-semibold text-foreground pt-2 first:pt-0"
            >
              {block}
            </h3>
          ) : (
            <p key={i} className="whitespace-pre-wrap">
              {formatBibleCitations(block, refs)}
            </p>
          ),
        )}
      </div>
    );
  };

  // Function to format Bible citations in parentheses with tooltips
  const formatBibleCitations = (text: string | undefined, refs?: string[]) => {
    if (!text || !refs || refs.length === 0) return text;
    
    // Add debug logging
    debugLog("Formatting citations in text:", text.substring(0, 50) + "...");
    debugLog("Available references:", refs);
    debugLog("Available verse texts count:", Object.keys(bibleVerses).length);
    debugLog("Bible verses keys:", Object.keys(bibleVerses));
    
    // Create JSX elements with formatted citations and tooltips
    return (
      <TooltipProvider delayDuration={200} skipDelayDuration={0}>
        {text.split(/(\([^)]*\))/).map((part, index) => {
          // Check if this part contains a Bible reference
          // Ranges matter: `[\w\s]` excluded '-', so "(James 1:14-15)" never
          // matched and verse ranges silently lost their tooltip — even though
          // end_verse is a first-class column and expandVerseRange() exists to
          // serve exactly these. lib/bibleLookup.ts also normalizes unicode
          // dashes to ASCII, so accept those here rather than dropping the
          // citation on a stray en-dash.
          const refMatch = part.match(/\(([\w\s]+\d+:\d+(?:\s*[-‐-―−]\s*\d+)?)\)/);
          
          if (refMatch) {
            const reference = refMatch[1];
            const isValidRef = refs.includes(reference);
            
            debugLog(`Found reference in text: ${reference}, is in refs: ${isValidRef}, has verse text: ${bibleVerses[reference] ? 'Yes' : 'No'}`);
            
            // Get the verse text using our utility function
            const { text: verseText, isFallback, source } = getVerseText(reference);
            debugLog(`Verse for reference ${reference}: source=${source}, isFallback=${isFallback}`);
            
            // Only create tooltip if this is a valid reference and we found a verse
            if (isValidRef) {
              return (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">{part}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-[300px] text-xs">
                      <div>{verseText}</div>
                      {isFallback && (
                        <div className="text-[10px] italic text-muted-foreground mt-1">
                          Note: Using standard verse text
                        </div>
                      )}
                      {source === "missing" && (
                        <div className="text-[10px] italic text-destructive mt-1">
                          Warning: No verse text found
                        </div>
                      )}
                      {source === "missing-range" && (
                        <div className="text-[10px] italic text-destructive mt-1">
                          Warning: No verse text found for this range
                        </div>
                      )}
                      {source.startsWith("expanded") && (
                        <div className="text-[10px] italic text-primary mt-1">
                          Note: Combined from individual verses
                        </div>
                      )}
                      {source.includes("range") && !source.includes("missing") && (
                        <div className="text-[10px] italic text-success mt-1">
                          {reference}
                        </div>
                      )}
                      {(process.env.NODE_ENV === 'development' || process.env.DEBUG) && (
                        <div className="text-[8px] opacity-50 mt-1 border-t pt-1">
                          Debug: src={source}, ref={reference}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            }
          }
          
          // If no match or not a valid reference, return the part as is
          
          return <span key={index}>{part}</span>;
        })}
      </TooltipProvider>
    );
  };

  // Handler to retry analysis for a timed-out dream
  const handleRetryAnalysis = async () => {
    setAnalysisTimedOut(false);
    setIsLoading(true);

    // Set loading state in localStorage so polling resumes
    localStorage.setItem('loadingDreamId', dream.id);
    localStorage.setItem('loadingDreamStartedAt', Date.now().toString());

    try {
      // Re-submit the dream text for analysis
      const response = await fetch('/api/dream-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dream_text: dream.original_text }),
      });

      if (!response.ok) {
        throw new Error(`Retry failed: ${response.status}`);
      }

      // The polling effect will pick up from here on re-render
      router.refresh();
    } catch (err) {
      console.error('Error retrying analysis:', err);
      setIsLoading(false);
      setAnalysisTimedOut(true);
      localStorage.removeItem('loadingDreamId');
      localStorage.removeItem('loadingDreamStartedAt');
    }
  };

  // Handler to retry image generation for a failed dream image
  const handleRetryImageGeneration = async () => {
    setImageError(false);
    setIsPollingCardImage(true);

    try {
      // Call the dream-image API to regenerate the image
      const response = await fetch('/api/dream-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamId: dream.id,
          title: dream.title,
          summary: dream.analysis_summary || dream.dream_summary || dream.personalized_summary,
          topicSentence: dream.topic_sentence,
        }),
      });

      if (!response.ok) {
        throw new Error(`Image generation request failed: ${response.status}`);
      }

      debugLog('Image generation retry requested for dream:', dream.id);
      // Polling will resume automatically via setIsPollingCardImage(true)
    } catch (err) {
      console.error('Error retrying image generation:', err);
      setIsPollingCardImage(false);
      setImageError(true);
    }
  };

  // Render timeout error state
  if (analysisTimedOut && !isLoading) {
    return (
      <Card className="overflow-hidden transition-all aspect-square border-destructive/50">
        <CardHeader className="p-3 pb-1">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-sm leading-5 flex-1 min-w-0">
              <div className="break-words">{dream.title || "Dream"}</div>
            </CardTitle>
            <div className="flex items-center text-xs text-muted-foreground flex-shrink-0">
              <CalendarIcon className="h-3 w-3 mr-1" />
              <span className="whitespace-nowrap">{formattedDate}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 pt-1 space-y-2">
          <p className="text-xs text-destructive">
            Analysis timed out. The AI service may have been temporarily unavailable.
          </p>
          <Button
            className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleRetryAnalysis}
          >
            Retry Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Render loading skeleton if in loading state
  if (isLoading) {
    return (
      <Card className="overflow-hidden transition-all aspect-square relative">
        {/* Shimmer background */}
        {/* Flat resting surface; only the travelling sweep is a gradient.
            See DreamImageShimmer above. */}
        <div className="absolute inset-0 bg-muted overflow-hidden">
          <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/15 dark:via-white/5 to-transparent" />
        </div>

        <div className="relative flex flex-col h-full">
          <CardHeader className="p-3 pb-1">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-[60%]" />
              <Skeleton className="h-3 w-[50px]" />
            </div>
          </CardHeader>

          <CardContent className="p-3 pt-1 space-y-2 flex-1 flex flex-col justify-end">
            {/* Summary Skeleton */}
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-[85%]" />
            </div>

            {/* Tags Skeleton */}
            <div className="flex flex-wrap gap-1">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-full" />
              <Skeleton className="h-4 w-14 rounded-full" />
            </div>

            <p className="text-xs text-muted-foreground text-center animate-pulse">
              Analyzing your dream...
            </p>
          </CardContent>
        </div>
      </Card>
    );
  }

  // Whether the analysis tab has real interpretation content — mirrors the
  // render branches inside the analysis TabsContent. Gates the AI-transparency
  // label and the feedback prompt so neither shows on a pending/blank tab.
  const hasInterpretation = Boolean(
    dream.formatted_analysis ||
    dream.analysis_summary ||
    dream.topic_sentence ||
    (dream.supporting_points && dream.supporting_points.length > 0) ||
    dream.conclusion_sentence
  );

  return (
    <>
      <Card
        className={cn(
          "overflow-hidden transition-all aspect-square cursor-pointer hover:shadow-lg hover:scale-[1.01] will-change-transform focus-visible:ring-2 focus-visible:ring-ring relative flex flex-col group",
          searchTerms.length > 0 && "ring-1 ring-primary"
        )}
        // Stable hook for e2e. The class selector the specs used,
        // [class*="aspect-square"], also matches the loading skeleton, the
        // analysis-timeout card and two modal image containers — so .first()
        // could resolve to a shimmer with no title or date, which is exactly
        // how those specs were failing.
        data-testid="dream-card"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
          }
        }}
      >
        {/* Background: image, loading shimmer, error state, or solid fallback */}
        {cardImageUrl ? (
          <div className="absolute inset-0">
            {/* next/image instead of raw background-image (audit H7):
                lazy loading + responsive resizing instead of shipping the
                full-resolution original for every card in the grid. */}
            <Image
              src={cardImageUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
              // Serve the Supabase signed URL directly instead of routing it
              // through the Next image optimizer. The optimizer intermittently
              // fails to fetch private signed URLs (query-token auth), which
              // left cards blank on load.
              //
              // ⚠️ COST NOTE (2026-07-31): generation moved 512² → 1024², so
              // `sizes` above is inert while this is set and every card in the
              // grid now downloads the full 1024² original — ~4× the bytes of
              // when this tradeoff was made. Revisit if mobile data or Vercel
              // Fast Origin Transfer becomes a constraint; the fix is a signed
              // -URL-aware loader, not simply dropping `unoptimized`.
              unoptimized
              onError={() => setImageError(true)}
            />
            {/* Scrim is darkest at the bottom but the title/date sit at the top
                over only 20% black — white-on-pale artwork fails WCAG AA there.
                Added a matching top stop rather than darkening the whole image. */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />
          </div>
        ) : isPollingCardImage ? (
          // "Generating image…" tile. Flat Navy 900 (rule 2), not a slate
          // gradient — this is the card face while artwork renders, so it is
          // brand chrome, not a photo scrim. Fixed navy in both themes: it is
          // replaced by artwork under a dark scrim either way, so nothing
          // flashes on the swap. Label lifted from white/60 (2.9:1 on navy,
          // a contrast failure) to white/80.
          <div className="absolute inset-0 bg-navy-900 overflow-hidden">
            <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 text-white/80 text-xs">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Generating image…</span>
              </div>
            </div>
          </div>
        ) : imageError ? (
          <div className="absolute inset-0 bg-card/90 dark:bg-card/95 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-2 text-center">
              <RefreshCwIcon className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Image unavailable</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  handleRetryImageGeneration();
                }}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-card/90 dark:bg-card/95 backdrop-blur-sm" />
        )}

        {/* Shared badge — visible when this dream has an active public link */}
        {isShared && (
          <div
            className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm"
            title="This dream has an active share link"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Shared
          </div>
        )}

        <div className={cn(
          "relative flex flex-col h-full flex-1",
          (cardImageUrl || isPollingCardImage) && "text-white"
        )}>
          <CardHeader className="p-3 pb-1">
            <div className="flex justify-between items-start gap-2">
              {/* Editorial scale: the grid should read like a magazine index,
                  not a file list. DM Serif Display matches the dialog title
                  this card opens, so the two share one voice at two sizes.
                  drop-shadow rather than a heavier scrim — at this size the
                  title covers more of the artwork, and darkening the whole
                  top band to guarantee contrast would bury the image. */}
              <CardTitle className={cn(
                "font-serif text-lg leading-tight flex-1 min-w-0",
                (cardImageUrl || isPollingCardImage) &&
                  "text-white [text-shadow:0_1px_3px_rgb(0_0_0_/_0.55)]"
              )}>
                <div className="break-words line-clamp-2">
                  {searchTerms.length > 0
                    ? highlightMatches(dream.title || "", searchTerms)
                    : dream.title
                  }
                </div>
              </CardTitle>
              <div className={cn(
                "flex items-center gap-1.5 text-xs flex-shrink-0",
                (cardImageUrl || isPollingCardImage) ? "text-white/70" : "text-muted-foreground"
              )}>
                {!empty && (
                  <button
                    type="button"
                    onClick={handleToggleStar}
                    disabled={isStarPending}
                    aria-pressed={isStarred}
                    aria-label={isStarred ? "Remove star" : "Star this dream"}
                    title={isStarred ? "Starred" : "Star this dream"}
                    className={cn(
                      "rounded-full p-0.5 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isStarred
                        ? "text-violet-light"
                        : (cardImageUrl || isPollingCardImage)
                          ? "text-white/70 hover:text-white"
                          : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <StarIcon className="h-3.5 w-3.5" filled={isStarred} />
                  </button>
                )}
                <CalendarIcon className="h-3 w-3 mr-1" />
                <span className="whitespace-nowrap" data-testid="dream-card-date">
                  {formattedDate}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-3 pt-1 space-y-1.5 flex-1 flex flex-col justify-end overflow-hidden">
            {/* Summary */}
            {(dream.personalized_summary || dream.dream_summary) && (
              <div>
                <p className={cn(
                  "text-xs leading-4 break-words line-clamp-2",
                  (cardImageUrl || isPollingCardImage) ? "text-white/80" : "text-muted-foreground"
                )}>
                  {searchTerms.length > 0
                    ? highlightMatches(dream.personalized_summary || dream.dream_summary || "", searchTerms)
                    : (dream.personalized_summary || dream.dream_summary)
                  }
                </p>
              </div>
            )}

            {/* Blank/pending state placeholder */}
            {!dream.personalized_summary && !dream.dream_summary && !dream.analysis_summary &&
             (!dream.supporting_points || dream.supporting_points.length === 0) && !isLoading && (
              <div className="flex flex-col items-center justify-center py-4 text-center flex-1">
                <CloudMoonIcon className={cn(
                  "h-6 w-6 mb-2",
                  (cardImageUrl || isPollingCardImage) ? "text-white/50" : "text-muted-foreground"
                )} />
                <p className={cn(
                  "text-xs",
                  (cardImageUrl || isPollingCardImage) ? "text-white/50" : "text-muted-foreground"
                )}>
                  Analysis pending…
                </p>
              </div>
            )}

            {/* Tags */}
            {dream.tags && dream.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 overflow-hidden max-h-[3.5rem]">
                {dream.tags.slice(0, 3).map((tag, index) => {
                  const isTagMatch = searchTerms.some(term =>
                    term && tag.toLowerCase().includes(term.toLowerCase())
                  );

                  return (
                    <Badge key={index} variant="secondary" className={cn(
                      "text-xs px-1.5 py-0.5 leading-4 truncate max-w-[8rem]",
                      isTagMatch && "bg-primary/10",
                      (cardImageUrl || isPollingCardImage) && "bg-white/20 text-white border-white/20"
                    )}>
                      {isTagMatch
                        ? highlightMatches(tag, searchTerms)
                        : tag
                      }
                    </Badge>
                  );
                })}
                {dream.tags.length > 3 && (
                  <Badge variant="secondary" className={cn(
                    "text-xs px-1.5 py-0.5 leading-4",
                    (cardImageUrl || isPollingCardImage) && "bg-white/20 text-white border-white/20"
                  )}>
                    +{dream.tags.length - 3} more
                  </Badge>
                )}
              </div>
            )}

            {/* Original text preview (shown only when there's a search match and no summary) */}
            {searchTerms.length > 0 && !dream.personalized_summary && !dream.dream_summary && (
              <div className={cn(
                "text-xs line-clamp-2",
                cardImageUrl ? "text-white/80" : "text-muted-foreground"
              )}>
                {highlightMatches(dream.original_text, searchTerms)}
              </div>
            )}

            {/* "Tap to view" affordance - visible on hover */}
            {(dream.personalized_summary || dream.dream_summary || dream.analysis_summary ||
              (dream.supporting_points && dream.supporting_points.length > 0)) && (
              <div className={cn(
                "text-[10px] text-right mt-1 opacity-0 group-hover:opacity-100 transition-opacity",
                (cardImageUrl || isPollingCardImage) ? "text-white/60" : "text-muted-foreground"
              )}>
                View analysis →
              </div>
            )}
          </CardContent>
        </div>

        {/* Admin-only cost footer.
            Renders as an absolute-positioned strip across the bottom of the card
            so it doesn't reflow the existing layout or break the square aspect
            ratio. Shows input/output tokens, image cost, and an estimated USD
            total computed in utils/pricing.ts. Pending rows (no usage logged yet)
            show a dim placeholder so admins know data is on the way. */}
        {isAdmin && (() => {
          const usage = initialDream._admin_usage;
          // If we have nothing at all to show (no row joined), skip it.
          if (!usage) return null;
          const cost = buildDreamCost(usage);
          const hasOpenAi = cost.inputTokens != null || cost.outputTokens != null;
          if (!hasOpenAi && !cost.imageGenerated) return null;
          return (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 inset-x-0 z-20 px-2 py-1 bg-black/70 text-white/90 backdrop-blur-sm flex items-center justify-between gap-2 text-[10px] font-mono tabular-nums select-text cursor-default"
              title={`OpenAI: ${formatUsd(cost.openAiCostUsd)} · Image: ${formatUsd(cost.imageGenerated ? (cost.imageCostUsd ?? 0) : 0)}`}
            >
              <span className="truncate">
                {hasOpenAi ? (
                  <>
                    in <span className="text-success">{cost.inputTokens ?? 0}</span>
                    {" / out "}
                    <span className="text-warning">{cost.outputTokens ?? 0}</span>
                  </>
                ) : (
                  <span className="text-white/50">tokens pending…</span>
                )}
                {cost.imageGenerated && (
                  <span className="ml-2 text-violet-300">+img</span>
                )}
              </span>
              <span className="font-semibold whitespace-nowrap">
                {formatUsd(cost.totalCostUsd)}
              </span>
            </div>
          );
        })()}
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          data-testid="dream-modal"
          className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto pb-8"
        >
          {/* Split header: title/date/tags on the left, artwork on the right.
              Previously the square artwork was full-bleed above everything —
              on a 600px dialog that is a ~600px image, so the entire viewport
              was filled before a single word of interpretation. Side-by-side
              cuts the art to ~215px and lifts roughly four lines of analysis
              above the fold, without going back to the h-80 crop that threw
              away half the 1024² render.

              Stacks below sm: a 38% column on a phone is ~130px, too small to
              be worth looking at and it squeezes the title to a few words per
              line. Image goes first when stacked so it still reads as the
              visual anchor. */}
          <DialogHeader className="space-y-0">
            <div className="flex flex-col-reverse sm:grid sm:grid-cols-[minmax(0,1fr)_38%] gap-3 sm:gap-4 items-start">
              <div className="min-w-0 w-full">
                <div className="flex items-start justify-between gap-2">
                  {/* font-serif = DM Serif Display, the headline face from the
                      v2 Moonwater rollout. Editorial scale — this sits directly
                      above the interpretation, so it should carry the weight of
                      an article headline rather than a UI label. Steps down on
                      mobile, where 28px of serif over a ~200px column wraps to
                      four or five lines. */}
                  <DialogTitle className="font-serif text-2xl sm:text-3xl leading-[1.15] tracking-tight">
                    {dream.title}
                  </DialogTitle>
                  <span className="text-[10px] text-muted-foreground border border-muted-foreground rounded px-1.5 py-0.5 whitespace-nowrap flex items-center h-fit shrink-0">esc</span>
                </div>
                <DialogDescription className="sr-only">Dream analysis details</DialogDescription>
                <div className="flex items-center text-xs text-muted-foreground mt-1.5">
                  <CalendarIcon className="h-3 w-3 mr-1 shrink-0" />
                  {dateObj.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                {/* Tags promoted out of the dialog footer. They used to sit
                    below the entire analysis, so on a profound reading you had
                    to scroll ~1,800px to see them. Here they also fill the
                    vertical space a short title leaves beside a square image. */}
                {dream.tags && dream.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {dream.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs capitalize">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {(cardImageUrl || isPollingCardImage) && (
                <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-muted">
                  {cardImageUrl ? (
                    // Click to expand: the header render is only ~215px, and
                    // the artwork is half of what a subscriber is paying for —
                    // the 1024² upgrade has to be visible somewhere at size.
                    <button
                      type="button"
                      onClick={() => setImageExpanded(true)}
                      className="group absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`View full-size artwork for “${dream.title}”`}
                    >
                      <Image
                        src={cardImageUrl}
                        alt={`AI-generated artwork for the dream “${dream.title}”`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, 230px"
                        // unoptimized for the same reason as the card face: the
                        // Next optimizer intermittently fails to fetch private
                        // Supabase signed URLs (query-token auth) and leaves the
                        // image blank. The card was fixed for this; the dialog
                        // never was.
                        unoptimized
                      />
                      <span className="absolute bottom-1.5 right-1.5 rounded bg-black/55 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        <MaximizeIcon className="h-3 w-3" />
                      </span>
                    </button>
                  ) : (
                    <DreamImageShimmer />
                  )}
                </div>
              )}
            </div>
          </DialogHeader>
          
          <Tabs
            defaultValue="analysis"
            className="w-full"
            value={activeTab}
            onValueChange={(value: string) => setActiveTab(value)}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="analysis" className="flex items-center gap-1 data-[state=active]:shadow-sm"><PuzzleIcon className="h-3 w-3" />Analysis</TabsTrigger>
              <FeatureHint
                id="dream-tabs"
                title="Read your original dream"
                body="Flip to ‘Original Dream’ anytime to see exactly what you wrote, before interpretation."
                side="bottom"
                align="center"
              >
                <TabsTrigger value="original" className="data-[state=active]:shadow-sm">Original Dream</TabsTrigger>
              </FeatureHint>
            </TabsList>

            {/* minHeight pins the panel to the analysis height so the shorter
                Original Dream tab can't collapse the dialog. See the
                ResizeObserver effect above. */}
            <div style={modalHeight ? { minHeight: modalHeight } : undefined}>
              <TabsContent value="analysis" className="space-y-4 p-1 min-h-0">
                <div ref={analysisContentRef}>
                  {/* AI disclosure — ABOVE the reading, with the mark
                      (HANDOFF-v3.md §5 item 1). It used to sit underneath,
                      which is a footnote, not a disclosure: by the time you
                      read it you have already taken the reading as given. */}
                  {hasInterpretation && (
                    <AiDisclosure
                      verseCount={dream.bible_refs?.length}
                      className="mb-4 max-w-[65ch]"
                    />
                  )}

                  {dream.formatted_analysis ? (
                    renderAnalysis(dream.formatted_analysis, dream.bible_refs)
                  ) : dream.analysis_summary ? (
                    renderAnalysis(dream.analysis_summary, dream.bible_refs)
                  ) : (
                    <div className="space-y-2 max-w-[65ch]">
                      {dream.topic_sentence && (
                        <div className="text-sm text-muted-foreground font-medium">
                          {dream.topic_sentence}
                        </div>
                      )}
                      {dream.supporting_points && dream.supporting_points.length > 0 && (
                        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                          {dream.supporting_points.map((point, index) => (
                            <li key={index}>{formatBibleCitations(point, dream.bible_refs)}</li>
                          ))}
                        </ul>
                      )}
                      {dream.conclusion_sentence && (
                        <div className="text-sm text-muted-foreground mt-2">
                          {dream.conclusion_sentence}
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* One-tap feedback (§5 item 5) + "Read again" (§5 item 4).
                    Owner-only — never on the public share page — and skipped
                    for example cards and optimistic placeholders that don't
                    exist in the DB yet. They sit together on purpose: "Not
                    really" is a dead end without a way to act on it. */}
                {hasInterpretation && !empty && !dream.id.startsWith('pending-') && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t pt-3.5">
                    <span className="text-xs text-muted-foreground">
                      Did this reading feel meaningful?
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleFeedback(true)}
                        disabled={isFeedbackPending}
                        aria-pressed={feedbackChoice === true}
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          feedbackChoice === true
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFeedback(false)}
                        disabled={isFeedbackPending}
                        aria-pressed={feedbackChoice === false}
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          feedbackChoice === false
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        Not really
                      </button>
                    </div>
                    {feedbackChoice !== null && (
                      <span
                        className="text-[11px] text-muted-foreground opacity-70"
                        role="status"
                      >
                        Thank you.
                      </span>
                    )}

                    {/* Re-generation, with the cost on the button face
                        (§5 item 4). Never "Read again" alone — a control that
                        spends money says so before it is pressed, not after.
                        The confirm restates it because there is no undo. */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          disabled={isRereading}
                          className="ml-auto rounded-full border border-input px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {isRereading ? 'Reading again…' : 'Read again · 1 credit'}
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Read this dream again?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This uses 1 credit and replaces the interpretation
                            and its verses with a fresh reading. Your dream
                            itself is never changed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleReadAgain} disabled={isRereading}>
                            Read again · 1 credit
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="original" className="space-y-4 p-1 min-h-0">
                <div ref={originalContentRef} className="text-sm whitespace-pre-wrap max-w-[65ch]">
                  {searchTerms.length > 0
                    ? highlightMatches(dream.original_text, searchTerms)
                    : dream.original_text
                  }
                </div>
              </TabsContent>
            </div>
          </Tabs>
          
          {/* Social Share Row */}
          <FeatureHint
            id="share-dream"
            title="Share your interpretation"
            body="Sharing is off by default. When you create a link you choose what it reveals, and you can turn it off anytime."
            side="top"
            align="end"
          >
          <div className="flex justify-end items-center mb-4">
            <ShareDreamButton
              dreamId={dream.id}
              title={dream.title}
              dreamSummary={dream.dream_summary}
              dreamText={dream.original_text}
              initialShared={isShared}
              initialToken={dream.share_token ?? null}
              initialScope={dream.share_scope ?? null}
              onSharedChange={setIsShared}
            />
          </div>
          </FeatureHint>

          {/* Footer: bible refs, actions — stacked on mobile, side-by-side on desktop.
              Tags moved up into the dialog header (see the split header above),
              where they're visible without scrolling past the whole analysis. */}
          <div className="pt-4 border-t space-y-3">

            {dream.bible_refs && dream.bible_refs.length > 0 && isMounted && (
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                  Scripture
                </div>
                {/* Popover, not Tooltip. Radix Tooltip opens on hover/focus
                    only — it never opens on touch, and Badge renders a <div>
                    (not focusable), so the hydrated KJV text was unreachable
                    for every mobile and keyboard user. On a product whose core
                    claim is scripture grounding, that is the scripture being
                    invisible to most of its readers. Popover opens on click,
                    which works on every input method. */}
                <div className="flex flex-wrap gap-1.5">
                  {dream.bible_refs.map((ref, index) => {
                    const { text: verseText, isFallback, source } = getVerseText(ref);
                    const missing = source === "missing" || source === "missing-range";
                    // The theme this verse was matched on, rendered inline as
                    // "Isaiah 43:2 · crossing waters" (HANDOFF-v3.md §5 item
                    // 2). A component contract, not a tooltip: the reason a
                    // verse is here is part of the citation, and a reason you
                    // have to hover to see is a reason most readers never see.
                    const theme = getVerseTheme(ref);
                    return (
                      <Popover key={index}>
                        <PopoverTrigger asChild>
                          {/* Scripture chip reads as a quoted reference —
                              Mist surface, Indigo/Violet Light text (AA
                              ≥4.5:1, auto-swaps in dark mode), Mist-2
                              hairline border. Now a real <button> so it
                              is keyboard-reachable and has a 24px tap target. */}
                          <button
                            type="button"
                            aria-label={
                              theme ? `Read ${ref}, matched on ${theme}` : `Read ${ref}`
                            }
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold min-h-[24px] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              missing
                                ? "bg-muted text-muted-foreground border-muted-foreground/30"
                                : "bg-mist text-primary border-mist-2"
                            }`}
                          >
                            <BookIcon className="h-2 w-2" />
                            {ref}
                            {theme && (
                              // Weight, not italics, carries the de-emphasis
                              // (§3: "emphasis is weight 500, never italic").
                              <span className="font-normal opacity-75">· {theme}</span>
                            )}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="max-w-[300px] text-xs" side="top">
                          {missing ? (
                            // Pastoral, not dev-flavoured. A citation we could
                            // not resolve should read as a pointer to look it
                            // up, never as an error message.
                            <div className="text-muted-foreground italic">
                              We couldn’t load the text for {ref} — it’s worth
                              looking up in your own Bible.
                            </div>
                          ) : (
                            <>
                              <div>{verseText}</div>
                              {isFallback && (
                                <div className="text-[10px] italic text-muted-foreground mt-1">
                                  Note: Using standard verse text
                                </div>
                              )}
                              {source.startsWith("expanded") && (
                                <div className="text-[10px] italic text-primary mt-1">
                                  Note: Combined from individual verses
                                </div>
                              )}
                              {source.includes("range") && (
                                <div className="text-[10px] italic text-muted-foreground mt-1">
                                  {ref}
                                </div>
                              )}
                            </>
                          )}
                        </PopoverContent>
                      </Popover>
                    );
                  })}
                </div>
              </div>
            )}

            {!empty && (
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Delete this dream"
                    >
                      <Trash2Icon className="h-4 w-4 mr-1" />
                      <span className="text-xs">Delete</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure you want to delete this dream?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your dream and all associated analysis.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteDream}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting..." : "Delete Dream"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Artwork lightbox. The header render is deliberately small so the
          interpretation clears the fold, so this is where a 1024² generation
          is actually seen at full size. Nested outside the detail Dialog so
          closing it doesn't close the dream. */}
      <Dialog open={imageExpanded} onOpenChange={setImageExpanded}>
        <DialogContent
            data-testid="dream-image-modal"
            className="sm:max-w-[min(90vw,900px)] p-0 overflow-hidden bg-transparent border-0 shadow-none"
          >
          <DialogTitle className="sr-only">
            Full-size artwork for “{dream.title}”
          </DialogTitle>
          <DialogDescription className="sr-only">
            AI-generated artwork accompanying this dream. Press escape to close.
          </DialogDescription>
          {cardImageUrl && (
            <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-muted">
              <Image
                src={cardImageUrl}
                alt={`AI-generated artwork for the dream “${dream.title}”`}
                fill
                className="object-contain"
                sizes="(max-width: 640px) 100vw, 900px"
                unoptimized
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}