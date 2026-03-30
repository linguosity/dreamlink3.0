"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "./ui/button";
import { Send, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { ImageAesthetic } from "@/schema/imageAesthetic";
import { ReadingLevel } from "@/schema/profile";
import { logClientError } from "@/utils/errorLogger";

interface CompactDreamInputProps {
  userId: string;
}

const MAX_CHARS = 8000;
const MAX_HEIGHT_PX = 200; // ~8 lines, then scroll

export default function CompactDreamInput({ userId }: CompactDreamInputProps) {
  const [dream, setDream] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const userAesthetic = useRef<string>(ImageAesthetic.PHOTOREALISTIC_VISION);
  const userReadingLevel = useRef<string>(ReadingLevel.CELESTIAL_INSIGHT);
  const router = useRouter();

  // Fetch user's preferred image aesthetic and reading level from profile
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('profile')
      .select('image_aesthetic, reading_level')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (data?.image_aesthetic) userAesthetic.current = data.image_aesthetic;
        if (data?.reading_level) userReadingLevel.current = data.reading_level;
      });
  }, [userId]);

  // Check localStorage for persistent tip dismissal on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('dreamlink-tip-dismissed');
      if (dismissed === 'true') {
        setTipDismissed(true);
      }
    }
  }, []);

  // Auto-resize textarea to fit content
  const autoResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [dream, autoResize]);

  // Handle permanent tip dismissal
  const handlePermanentDismiss = () => {
    setTipDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dreamlink-tip-dismissed', 'true');
    }
  };

  // Keyboard: Cmd/Ctrl+Enter to submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (dream.trim() && !isSubmitting) {
        handleSubmit();
      }
    }
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (!dream.trim()) return;

    await submitDream(dream);
    setDream("");
    // Reset textarea height after clearing
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Common submission logic with retry for auth timing issues
  const submitDream = async (dreamText: string, retryCount = 0) => {
    setIsSubmitting(true);

    // Optimistically show a placeholder card in the grid immediately
    if (retryCount === 0) {
      const placeholderId = `pending-${Date.now()}`;
      window.dispatchEvent(
        new CustomEvent("dreamlink:dream-submitting", {
          detail: {
            id: placeholderId,
            original_text: dreamText,
            created_at: new Date().toISOString(),
          },
        })
      );
    }

    try {
      const response = await fetch("/api/dream-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dream_text: dreamText,
          reading_level: userReadingLevel.current,
        }),
      });

      // Get the response text first to ensure we can see the error even if it's not valid JSON
      const responseText = await response.text();

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse API response as JSON:", responseText);
        throw new Error("Invalid API response format");
      }

      // Handle 401 auth errors with retry logic
      if (response.status === 401 && retryCount < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSubmitting(false);
        return await submitDream(dreamText, retryCount + 1);
      }

      if (!response.ok) {
        console.error("API error details:", result);

        if (response.status === 401) {
          throw new Error("Authentication error. Please try refreshing the page and logging in again.");
        }

        throw new Error(result.error || "Failed to submit dream");
      }

      if (result.id) {
        toast.success("Dream recorded! Analysis on its way…");

        localStorage.removeItem('loadingDreamId');
        localStorage.removeItem('loadingDreamStartedAt');

        // Fire off image generation in the background (non-blocking)
        if (result.analysis) {
          const imageBody = JSON.stringify({
            dreamId: result.id,
            title: result.analysis.dreamTitle || "",
            summary: result.analysis.analysis || "",
            topicSentence: result.analysis.topicSentence || "",
            aesthetic: userAesthetic.current,
          });
          fetch("/api/dream-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: imageBody,
            keepalive: true,
          }).catch((err) => console.error("Image generation request failed:", err));
        }
      }

      router.refresh();
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("Error submitting dream:", err);

      logClientError("dream_submission", err.message, {
        route: "/api/dream-entries",
        retryCount,
        dreamText: dreamText,
      });

      let userMessage = err.message;
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        userMessage = "Please wait a moment and try again. If the issue persists, try refreshing the page.";
      }

      toast.error(`Failed to submit your dream: ${userMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasContent = dream.trim().length > 0;

  return (
    <div className="w-full sm:max-w-2xl sm:mx-auto space-y-2">
      <form onSubmit={handleSubmit}>
        {/* Textarea container with inset send button */}
        <div className="relative">
          <label htmlFor="dream-input" className="sr-only">Describe your dream</label>
          <textarea
            id="dream-input"
            ref={textareaRef}
            placeholder="Describe your dream — a word, a feeling, or the whole story…"
            value={dream}
            onChange={(e) => setDream(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            maxLength={MAX_CHARS}
            disabled={isSubmitting}
            className="w-full resize-none overflow-y-auto rounded-xl border border-input bg-background px-4 py-3 pr-14 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ maxHeight: `${MAX_HEIGHT_PX}px` }}
          />

          {/* Send button — bottom-right inside textarea */}
          <Button
            type="submit"
            size="icon"
            disabled={!hasContent || isSubmitting}
            aria-label={isSubmitting ? "Processing dream" : "Submit dream"}
            className={`absolute bottom-2.5 right-2.5 h-11 w-11 rounded-lg transition-opacity ${
              hasContent ? "opacity-100" : "opacity-30"
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Footer row: char count + submit hint */}
        <div className="flex items-center justify-between px-1">
          <span className={`text-xs transition-opacity ${hasContent ? "opacity-60" : "opacity-0"}`}>
            {dream.length}/{MAX_CHARS}
          </span>
          <span className="text-xs text-muted-foreground opacity-50">
            {typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent ?? '')
              ? '⌘↵ to submit'
              : 'Ctrl+↵ to submit'}
          </span>
        </div>
      </form>

      {/* Gentle hint for short dreams */}
      {hasContent && dream.trim().length < 20 && !tipDismissed && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-blue-100 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/20">
          <div className="flex-shrink-0 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 dark:text-blue-400">
              <circle cx="12" cy="12" r="10"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>
          <p className="flex-1 text-sm text-blue-600 dark:text-blue-300 leading-relaxed">
            <span className="font-medium">Tip:</span> Adding more details will help generate a more insightful analysis.
          </p>
          <button
            onClick={handlePermanentDismiss}
            className="flex-shrink-0 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors group"
            aria-label="Dismiss tip permanently"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 group-hover:text-blue-600 dark:text-blue-500 dark:group-hover:text-blue-300">
              <path d="m18 6-12 12"/>
              <path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
