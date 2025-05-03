"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareIcon } from "lucide-react";
import dynamic from 'next/dynamic';

// Import UI components with error handling
let Card: any, CardContent: any, CardHeader: any, CardTitle: any;
try {
  const cardModule = require("@/components/ui/card");
  Card = cardModule.Card;
  CardContent = cardModule.CardContent;
  CardHeader = cardModule.CardHeader;
  CardTitle = cardModule.CardTitle;
} catch (e) {
  console.error("Failed to load card components:", e);
  // Fallback implementations
  Card = ({ className = "", children, ...props }: any) => (
    <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`} {...props}>{children}</div>
  );
  CardHeader = ({ className = "", children, ...props }: any) => (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>{children}</div>
  );
  CardContent = ({ className = "", children, ...props }: any) => (
    <div className={`p-6 pt-0 ${className}`} {...props}>{children}</div>
  );
  CardTitle = ({ className = "", children, ...props }: any) => (
    <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`} {...props}>{children}</h3>
  );
}

// Import badge component with error handling
let Badge: any;
try {
  const badgeModule = require("@/components/ui/badge");
  Badge = badgeModule.Badge;
} catch (e) {
  console.error("Failed to load badge component:", e);
  Badge = ({ className = "", children, variant = "default", ...props }: any) => (
    <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`} {...props}>{children}</div>
  );
}

// Import button component with error handling
let Button: any;
try {
  const buttonModule = require("@/components/ui/button");
  Button = buttonModule.Button;
} catch (e) {
  console.error("Failed to load button component:", e);
  Button = ({ className = "", children, variant = "default", size = "default", ...props }: any) => (
    <button className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background ${className}`} {...props}>{children}</button>
  );
}

import { CalendarIcon, BookIcon, PuzzleIcon, Trash2Icon, ShareIcon, MessageSquare } from "lucide-react";

// Import dialog components with error handling
let Dialog: any, DialogContent: any, DialogHeader: any, DialogTitle: any, DialogTrigger: any, DialogDescription: any, DialogFooter: any;
try {
  const dialogModule = require("@/components/ui/dialog");
  Dialog = dialogModule.Dialog;
  DialogContent = dialogModule.DialogContent;
  DialogHeader = dialogModule.DialogHeader;
  DialogTitle = dialogModule.DialogTitle;
  DialogTrigger = dialogModule.DialogTrigger;
  DialogDescription = dialogModule.DialogDescription;
  DialogFooter = dialogModule.DialogFooter;
} catch (e) {
  console.error("Failed to load dialog components:", e);
  // Simple fallback implementations
  Dialog = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  DialogContent = ({ children, ...props }: any) => <div className="fixed inset-0 z-50 flex items-center justify-center" {...props}>{children}</div>;
  DialogHeader = ({ children, ...props }: any) => <div className="flex flex-col space-y-2 text-center sm:text-left" {...props}>{children}</div>;
  DialogTitle = ({ children, ...props }: any) => <h2 className="text-lg font-semibold leading-none tracking-tight" {...props}>{children}</h2>;
  DialogTrigger = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  DialogDescription = ({ children, ...props }: any) => <p className="text-sm text-muted-foreground" {...props}>{children}</p>;
  DialogFooter = ({ children, ...props }: any) => <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2" {...props}>{children}</div>;
}

// Import tabs components with error handling
let Tabs: any, TabsContent: any, TabsList: any, TabsTrigger: any;
try {
  const tabsModule = require("@/components/ui/tabs");
  Tabs = tabsModule.Tabs;
  TabsContent = tabsModule.TabsContent;
  TabsList = tabsModule.TabsList;
  TabsTrigger = tabsModule.TabsTrigger;
} catch (e) {
  console.error("Failed to load tabs components:", e);
  // Simple fallback implementations
  Tabs = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  TabsList = ({ children, ...props }: any) => <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground" {...props}>{children}</div>;
  TabsTrigger = ({ children, ...props }: any) => <button className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm" {...props}>{children}</button>;
  TabsContent = ({ children, ...props }: any) => <div className="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" {...props}>{children}</div>;
}

// Import tooltip components with error handling
let Tooltip: any, TooltipContent: any, TooltipProvider: any, TooltipTrigger: any;
try {
  const tooltipModule = require("@/components/ui/tooltip");
  Tooltip = tooltipModule.Tooltip;
  TooltipContent = tooltipModule.TooltipContent;
  TooltipProvider = tooltipModule.TooltipProvider;
  TooltipTrigger = tooltipModule.TooltipTrigger;
} catch (e) {
  console.error("Failed to load tooltip components:", e);
  // Simple fallback implementations
  Tooltip = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  TooltipContent = ({ children, ...props }: any) => <div className="z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2" {...props}>{children}</div>;
  TooltipProvider = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  TooltipTrigger = ({ children, asChild, ...props }: any) => <div {...props}>{children}</div>;
}

// Import skeleton component with error handling
let Skeleton: any;
try {
  const skeletonModule = require("@/components/ui/skeleton");
  Skeleton = skeletonModule.Skeleton;
} catch (e) {
  console.error("Failed to load skeleton component:", e);
  Skeleton = ({ className = "", ...props }: any) => (
    <div className={`animate-pulse rounded-md bg-muted ${className}`} {...props} />
  );
}

// Import alert dialog components with error handling
let AlertDialog: any, AlertDialogAction: any, AlertDialogCancel: any, AlertDialogContent: any, 
    AlertDialogDescription: any, AlertDialogFooter: any, AlertDialogHeader: any, 
    AlertDialogTitle: any, AlertDialogTrigger: any;
try {
  const alertDialogModule = require("@/components/ui/alert-dialog");
  AlertDialog = alertDialogModule.AlertDialog;
  AlertDialogAction = alertDialogModule.AlertDialogAction;
  AlertDialogCancel = alertDialogModule.AlertDialogCancel;
  AlertDialogContent = alertDialogModule.AlertDialogContent;
  AlertDialogDescription = alertDialogModule.AlertDialogDescription;
  AlertDialogFooter = alertDialogModule.AlertDialogFooter;
  AlertDialogHeader = alertDialogModule.AlertDialogHeader;
  AlertDialogTitle = alertDialogModule.AlertDialogTitle;
  AlertDialogTrigger = alertDialogModule.AlertDialogTrigger;
} catch (e) {
  console.error("Failed to load alert dialog components:", e);
  // Simple fallback implementations
  AlertDialog = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  AlertDialogContent = ({ children, ...props }: any) => <div className="fixed inset-0 z-50 flex items-center justify-center" {...props}>{children}</div>;
  AlertDialogHeader = ({ children, ...props }: any) => <div className="flex flex-col space-y-2 text-center sm:text-left" {...props}>{children}</div>;
  AlertDialogFooter = ({ children, ...props }: any) => <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2" {...props}>{children}</div>;
  AlertDialogTitle = ({ children, ...props }: any) => <h2 className="text-lg font-semibold leading-none tracking-tight" {...props}>{children}</h2>;
  AlertDialogDescription = ({ children, ...props }: any) => <p className="text-sm text-muted-foreground" {...props}>{children}</p>;
  AlertDialogAction = ({ children, ...props }: any) => <button className="inline-flex h-10 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" {...props}>{children}</button>;
  AlertDialogCancel = ({ children, ...props }: any) => <button className="mt-2 inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:mt-0" {...props}>{children}</button>;
  AlertDialogTrigger = ({ children, ...props }: any) => <div {...props}>{children}</div>;
}

type DreamEntryProps = {
  empty?: boolean;
  loading?: boolean;
  dream: {
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
  };
};

// This would come from your API in a real implementation
const BIBLE_VERSES = {
  "Genesis 1:1": "In the beginning God created the heaven and the earth.",
  "Psalm 23": "The Lord is my shepherd; I shall not want.",
  "Psalm 23:2": "He maketh me to lie down in green pastures: he leadeth me beside the still waters.",
  "Matthew 5:3": "Blessed are the poor in spirit: for theirs is the kingdom of heaven.",
  "John 3:16": "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
  "John 8:12": "Then spake Jesus again unto them, saying, I am the light of the world: he that followeth me shall not walk in darkness, but shall have the light of life.",
  "Exodus 14:21": "And Moses stretched out his hand over the sea; and the LORD caused the sea to go back by a strong east wind all that night, and made the sea dry land, and the waters were divided.",
  "1 Kings 6:19": "And the oracle he prepared in the house within, to set there the ark of the covenant of the LORD."
};

export default function DreamCard({ empty, loading: initialLoading, dream: initialDream }: DreamEntryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(initialLoading || false);
  const [activeTab, setActiveTab] = useState("analysis");
  const [modalHeight, setModalHeight] = useState<number | null>(null);
  const analysisContentRef = useRef<HTMLDivElement>(null);
  const originalContentRef = useRef<HTMLDivElement>(null);
  const [dream, setDream] = useState(initialDream);
  
  // Format date as MMM DD
  const dateObj = dream.created_at ? new Date(dream.created_at) : new Date();
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
  
  // Check if this dream is the loading dream (just submitted)
  useEffect(() => {
    const loadingDreamId = typeof window !== 'undefined' ? 
      localStorage.getItem('loadingDreamId') : null;
    
    // Only poll for the "loading" dream
    if (loadingDreamId !== dream.id) return;
    
    console.log('This dream is loading:', dream.id);
    setIsLoading(true);
    
    const interval = setInterval(async () => {
      try {
        // If dream already has analysis locally, stop polling
        if (dream.dream_summary || dream.analysis_summary || 
            (dream.supporting_points && dream.supporting_points.length > 0)) {
          console.log('Dream analysis complete:', dream.id);
          setIsLoading(false);
          localStorage.removeItem('loadingDreamId');
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
        
        const data = await response.json();
        
        if (data && data.dreams && data.dreams.length > 0) {
          const updatedDream = data.dreams[0];
          
          // When analysis arrives, update state and stop polling
          if (updatedDream.dream_summary || updatedDream.analysis_summary || 
             (updatedDream.supporting_points && updatedDream.supporting_points.length > 0)) {
            console.log('Dream analysis detected via API, updating state');
            setDream(updatedDream);
            setIsLoading(false);
            localStorage.removeItem('loadingDreamId');
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Error checking dream status:', err);
        // Optionally clear interval after repeated failures
      }
    }, 2000);
    
    // Always clear on unmount
    return () => clearInterval(interval);
  }, [dream.id, dream.dream_summary, dream.analysis_summary, dream.supporting_points]);
  
  // Calculate and store the maximum height of tab content
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const analysisHeight = analysisContentRef.current?.offsetHeight || 0;
        const originalHeight = originalContentRef.current?.offsetHeight || 0;
        const maxHeight = Math.max(analysisHeight, originalHeight);
        setModalHeight(maxHeight);
      }, 100);
    }
  }, [isOpen, dream]);

  // Handle card click to show dialog
  const handleCardClick = () => {
    // Always open dialog, even for placeholder/example dreams
    setIsOpen(true);
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
      alert('Failed to delete this dream. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to format Bible citations in parentheses with tooltips
  const formatBibleCitations = (text: string | undefined, refs?: string[]) => {
    if (!text || !refs || refs.length === 0) return text;
    
    // Create JSX elements with formatted citations and tooltips
    return (
      <TooltipProvider>
        {text.split(/(\([^)]*\))/).map((part, index) => {
          // Check if this part contains a Bible reference
          const refMatch = part.match(/\(([\w\s]+\d+:\d+)\)/);
          
          if (refMatch && refs.includes(refMatch[1])) {
            const reference = refMatch[1];
            return (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <span className="cursor-help">{part}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[300px] text-xs">{BIBLE_VERSES[reference as keyof typeof BIBLE_VERSES] || "Verse content"}</p>
                </TooltipContent>
              </Tooltip>
            );
          }
          
          return <span key={index}>{part}</span>;
        })}
      </TooltipProvider>
    );
  };

  // Render loading skeleton if in loading state
  if (isLoading) {
    return (
      <Card className="overflow-hidden transition-all h-full">
        <CardHeader className="p-3 pb-1">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-[150px]" />
            <Skeleton className="h-3 w-[60px]" />
          </div>
        </CardHeader>
        
        <CardContent className="p-3 pt-1 space-y-2">
          {/* Summary Skeleton */}
          <div>
            <Skeleton className="h-3 w-full mb-1" />
            <Skeleton className="h-3 w-[80%]" />
          </div>
          
          {/* Tags Skeleton */}
          <div className="flex flex-wrap gap-1">
            <Skeleton className="h-4 w-12 rounded-full" />
            <Skeleton className="h-4 w-14 rounded-full" />
            <Skeleton className="h-4 w-10 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generate a shareable text for social sharing
  const getShareableText = () => {
    const title = dream.title || "My Dream";
    const summary = dream.dream_summary || "";
    return `${title}: ${summary.substring(0, 100)}${summary.length > 100 ? '...' : ''}`;
  };
  
  const getShareUrl = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://dreamlink.app';
    return `${baseUrl}/shared/dream/${dream.id}`;
  };
  
  return (
    <>
      <Card 
        className="overflow-hidden transition-all h-full cursor-pointer hover:shadow-md will-change-transform"
        onClick={handleCardClick}
      >
        <CardHeader className="p-3 pb-1">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm line-clamp-2">{dream.title}</CardTitle>
            <div className="flex items-center text-xs text-muted-foreground">
              <CalendarIcon className="h-3 w-3 mr-1" />
              {formattedDate}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-3 pt-1 space-y-2">
          {/* Summary */}
          {dream.dream_summary && (
            <div>
              <p className="text-xs text-muted-foreground line-clamp-15">
                {dream.dream_summary}
              </p>
            </div>
          )}
          
          {/* Tags */}
          {dream.tags && dream.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {dream.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs px-1 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Bible References - removed from card view */}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{dream.title}</DialogTitle>
            <div className="flex items-center text-xs text-muted-foreground">
              <CalendarIcon className="h-3 w-3 mr-1" />
              {dateObj.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </DialogHeader>
          
          <Tabs 
            defaultValue="analysis" 
            className="w-full"
            value={activeTab}
            onValueChange={(value: string) => setActiveTab(value)}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="analysis" className="flex items-center gap-1"><PuzzleIcon className="h-3 w-3" />Analysis</TabsTrigger>
              <TabsTrigger value="original">Original Dream</TabsTrigger>
            </TabsList>
            
            <div style={{ minHeight: modalHeight ? `${modalHeight}px` : 'auto' }}>
              <TabsContent value="analysis" className="space-y-4 p-1">
                <div ref={analysisContentRef}>
                  {dream.dream_summary && (
                    <div className="space-y-2 mb-4">
                      <h4 className="text-sm font-medium">Summary</h4>
                      <p className="text-sm text-muted-foreground">
                        {dream.dream_summary}
                      </p>
                    </div>
                  )}
                  
                  {dream.formatted_analysis ? (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Analysis</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatBibleCitations(dream.formatted_analysis, dream.bible_refs)}
                      </p>
                    </div>
                  ) : dream.analysis_summary ? (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Analysis</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatBibleCitations(dream.analysis_summary, dream.bible_refs)}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Analysis</h4>
                      {dream.topic_sentence && (
                        <p className="text-sm text-muted-foreground font-medium">
                          {dream.topic_sentence}
                        </p>
                      )}
                      {dream.supporting_points && dream.supporting_points.length > 0 && (
                        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                          {dream.supporting_points.map((point, index) => (
                            <li key={index}>{formatBibleCitations(point, dream.bible_refs)}</li>
                          ))}
                        </ul>
                      )}
                      {dream.conclusion_sentence && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {dream.conclusion_sentence}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="original" className="space-y-4 p-1">
                <div ref={originalContentRef} className="text-sm whitespace-pre-wrap">
                  {dream.original_text}
                </div>
              </TabsContent>
            </div>
          </Tabs>
          
          {/* Social Share Row */}
          <div className="flex justify-end items-center mb-4">
            <div className="text-xs text-muted-foreground mr-2">Share:</div>
            <div className="flex items-center space-x-2">
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`} target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#3b5998" className="rounded-full">
                  <path d="M18 2h-12c-2.21 0-4 1.79-4 4v12c0 2.21 1.79 4 4 4h12c2.21 0 4-1.79 4-4v-12c0-2.21-1.79-4-4-4zm0 4v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v7h-3v-7h-2v-3h2v-2.5c0-1.93 1.57-3.5 3.5-3.5h2.5z"/>
                </svg>
              </a>
              <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent(getShareableText())}`} target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#1DA1F2" className="rounded-full">
                  <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05-.78-.83-1.9-1.36-3.16-1.36-2.35 0-4.27 1.92-4.27 4.29 0 .34.03.67.11.98-3.56-.18-6.73-1.89-8.84-4.48-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21-.36.1-.74.15-1.13.15-.27 0-.54-.03-.8-.08.54 1.69 2.11 2.95 4 2.98-1.46 1.16-3.31 1.84-5.33 1.84-.34 0-.68-.02-1.02-.06 1.9 1.22 4.16 1.93 6.58 1.93 7.88 0 12.21-6.54 12.21-12.21 0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                </svg>
              </a>
              <a href={`viber://forward?text=${encodeURIComponent(getShareableText() + " " + getShareUrl())}`} target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#7360f2" className="rounded-full">
                  <path d="M12 1c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-2.238 7.525c2.246.235 3.455 1.512 3.667 3.824.039.433-.28.857-.75.857-.458 0-.85-.34-.885-.797-.149-1.604-.85-2.354-2.092-2.521-.389-.053-.695-.368-.695-.76 0-.415.366-.776.755-.603zm.31-1.97c3.252.306 5.212 2.374 5.499 5.666.029.337-.252.665-.585.665-.327 0-.596-.265-.626-.601-.211-2.609-1.69-4.153-4.209-4.405-.335-.033-.591-.321-.591-.656 0-.355.327-.673.682-.622.377-.04.422-.053.422-.053s-.045.013-.422.053c-.051-.006-.091-.029-.137-.045.437.065-.01.044-.059.044-.345 0-.627-.291-.627-.64 0-.35.282-.642.626-.642.168 0 .32.066.435.174.032-.016.119-.062.119-.062s-.086.045-.119.062v-.001zm.536-1.56c4.23.283 6.766 2.862 7.081 7.215.015.21-.31.437-.491.437-.261 0-.49-.213-.506-.47-.267-3.705-2.276-5.761-5.871-6.003-.348-.023-.611-.306-.611-.658 0-.336.273-.625.602-.625.188.001.362.081.486.214.047-.021.103-.045.103-.045s-.056.023-.103.045v.001zm9.022 12.114c-.597-.893-1.13-1.878-1.676-2.84-.741-1.309-1.929-.303-2.454.3-.536.616-1.032.674-1.362.27-.981-1.195-1.615-2.071-2.38-3.634 0 0-.3-.61-.873-1.641l-.014-.029c-.3-.61-.273-.913.045-1.289.309-.37 1.464-1.591.9-3.178-.535-1.505-2.565-5.802-3.618-5.148-1.061.658-1.357 1.41-1.352 2.11.005.7.194 1.339.374 1.862.172.5.316.958.316 1.363 0 .255-.043.49-.118.695-.127.347-.322.582-.508.808-.199.244-.38.458-.536.798-.151.333-.211.704-.211 1.102 0 1.008.619 2.674 1.125 3.589.399.731.81 1.359 1.246 1.887.859 1.044 1.893 1.893 2.834 2.507 1.451.948 3.082 1.608 4.999 1.608 1.072 0 1.96-.244 2.674-.732.366-.249.666-.559.916-.914.229-.328.401-.702.489-1.102.088-.4.096-.8.033-1.196-.065-.416-.176-.821-.291-1.211-.104-.35-.237-.695-.237-1.067 0-.39.124-.876.675-1.591.088-.115.999-1.179 1.271-1.499.272-.32.743-1.111.25-1.888z"/>
                </svg>
              </a>
              <a href={`https://t.me/share/url?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent(getShareableText())}`} target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#0088cc" className="rounded-full">
                  <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-1.041 16.737c-.26 0-.215-.198-.306-.396l-.762-2.512 5.859-3.671-6.659 3.939-2.833-.726c-.613-.151-.613-.586.306-.879l11.08-4.581c.504-.302.909.151.706.879l-1.867 8.823c-.151.528-.628.654-1.01.4l-2.833-2.08-1.365 1.376c-.151.152-.306.228-.316.328z"/>
                </svg>
              </a>
              <a
                href={`sms:?body=${encodeURIComponent(`${getShareableText()} ${getShareUrl()}`)}`}
                className="opacity-50 hover:opacity-100 transition-opacity"
                aria-label="Share via SMS"
              >
                <MessageSquareIcon className="h-6 w-6 text-gray-600" />
              </a>
            </div>
          </div>

          {/* Footer with tags and biblical references */}
          <div className="pt-4 border-t">
            <div className="flex justify-between items-start">
              <div className="flex flex-wrap gap-2">
                {dream.tags && dream.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {dream.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {dream.bible_refs && dream.bible_refs.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <TooltipProvider>
                      {dream.bible_refs.map((ref, index) => (
                        <Tooltip key={index}>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <BookIcon className="h-2 w-2" />
                              {ref}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <span className="max-w-[300px] text-xs">{BIBLE_VERSES[ref as keyof typeof BIBLE_VERSES] || "Verse content"}</span>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </TooltipProvider>
                  </div>
                )}
              </div>
              
              {/* Delete Button with Confirmation */}
              {!empty && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
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
                        className="bg-red-500 hover:bg-red-600"
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting..." : "Delete Dream"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}