"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Send, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { ImageAesthetic } from "@/schema/imageAesthetic";
import { ReadingLevel } from "@/schema/profile";
import { logClientError } from "@/utils/errorLogger";
import PaywallDialog from "./PaywallDialog";

interface CompactDreamInputProps {
  userId: string;
}

const MAX_CHARS = 8000;

// localStorage key holding a dream that hit the out-of-credits paywall. The
// text survives the trip to /pricing (or a reload) and is restored into the
// composer on return; the next successful submission clears it.
const PENDING_DREAM_KEY = "dr_pending_dream";

// Shape of GET /api/credits — fetched once per mount so the cost line can
// tell the user what a submission spends BEFORE they spend it.
interface CreditsInfo {
  plan: string;
  remaining: number;
  limit: number;
  unlimited: boolean;
  is_admin: boolean;
}

export default function CompactDreamInput({ userId }: CompactDreamInputProps) {
  const [dream, setDream] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);
  const [isMac, setIsMac] = useState(false);
  // null until /api/credits answers; the cost line renders nothing (inside a
  // fixed-height slot) until then, so late data never shifts the layout.
  const [credits, setCredits] = useState<CreditsInfo | null>(null);
  // Live text of the reading while it streams from the server. null = no
  // stream in flight; "" = stream open but no prose yet.
  const [liveReading, setLiveReading] = useState<string | null>(null);
  const lastDeltaField = useRef<string | null>(null);
  const userAesthetic = useRef<string>(ImageAesthetic.PHOTOREALISTIC_VISION);
  const userReadingLevel = useRef<string>(ReadingLevel.CELESTIAL_INSIGHT);
  const router = useRouter();

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

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.userAgent ?? ''));
    const dismissed = localStorage.getItem('dreamriver-tip-dismissed');
    if (dismissed === 'true') {
      setTipDismissed(true);
    }
    // Restore a dream stashed at the paywall (see PENDING_DREAM_KEY) so the
    // user never has to retype it after visiting /pricing or upgrading.
    const pending = localStorage.getItem(PENDING_DREAM_KEY);
    if (pending) {
      setDream((current) => current || pending);
    }
  }, []);

  // Credit-cost transparency (fetched once per mount, cached in state).
  // Purely informational — a failure here silently hides the line and never
  // touches the submit flow or the paywall.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/credits")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data || typeof data.remaining !== "number") return;
        setCredits({
          plan: String(data.plan ?? "free"),
          remaining: data.remaining,
          limit: typeof data.limit === "number" ? data.limit : 0,
          unlimited: Boolean(data.unlimited),
          is_admin: Boolean(data.is_admin),
        });
      })
      .catch(() => {
        // Quietly skip the cost line — never block the composer.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePermanentDismiss = () => {
    setTipDismissed(true);
    localStorage.setItem('dreamriver-tip-dismissed', 'true');
  };

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

    const submitted = await submitDream(dream);
    // Only clear the composer on success — a failed submission (especially
    // the out-of-credits paywall) must never eat the user's words.
    if (submitted) setDream("");
  };

  // Common submission logic with retry for auth timing issues.
  // Resolves true only when the dream was accepted by the API.
  const submitDream = async (dreamText: string, retryCount = 0): Promise<boolean> => {
    setIsSubmitting(true);

    // Optimistically show a placeholder card in the grid immediately
    if (retryCount === 0) {
      const placeholderId = `pending-${Date.now()}`;
      window.dispatchEvent(
        new CustomEvent("dreamriver:dream-submitting", {
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
          // Ask for the streaming response. The server only streams for
          // single-combo submissions; test-mode fan-out answers with plain
          // JSON, which the content-type check below routes correctly.
          stream: true,
        }),
      });

      const isStream =
        response.ok &&
        (response.headers.get("content-type") ?? "").includes("ndjson") &&
        response.body != null;

      let result;
      if (isStream) {
        // NDJSON: one JSON event per line. Deltas paint the live-reading
        // panel; "done" carries the exact payload the JSON path returns, so
        // everything below this block is shared between both transports.
        setLiveReading("");
        lastDeltaField.current = null;
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let lineBuf = "";
        let payload: unknown = null;
        let streamError: string | null = null;
        const handleEvent = (evt: { type?: string; field?: string; text?: string; payload?: unknown; error?: string }) => {
          if (evt.type === "delta" && typeof evt.text === "string") {
            const field = String(evt.field ?? "");
            setLiveReading((prev) => {
              const sep =
                prev && lastDeltaField.current !== field ? "\n\n" : "";
              lastDeltaField.current = field;
              return (prev ?? "") + sep + evt.text;
            });
          } else if (evt.type === "done") {
            payload = evt.payload;
          } else if (evt.type === "error") {
            streamError = evt.error || "Analysis failed";
          }
        };
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          lineBuf += decoder.decode(value, { stream: true });
          let nl;
          while ((nl = lineBuf.indexOf("\n")) !== -1) {
            const line = lineBuf.slice(0, nl).trim();
            lineBuf = lineBuf.slice(nl + 1);
            if (!line) continue;
            try {
              handleEvent(JSON.parse(line));
            } catch {
              // A malformed line is dropped; the stream carries on.
            }
          }
        }
        if (streamError) throw new Error(streamError);
        if (!payload) throw new Error("Stream ended without a result");
        result = payload;
      } else {
      // Get the response text first to ensure we can see the error even if it's not valid JSON
      const responseText = await response.text();

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

      // Free credits exhausted → the paywall moment, not an error toast.
      // The user's dream is written and worth protecting: stash it so it
      // survives the trip to /pricing, drop the optimistic placeholder card
      // (no analysis is coming), and open the upgrade dialog.
      if (response.status === 402 && result?.code === "out_of_credits") {
        try {
          localStorage.setItem(PENDING_DREAM_KEY, dreamText);
        } catch {
          // Storage unavailable (private mode) — the composer still holds
          // the text in memory.
        }
        window.dispatchEvent(new CustomEvent("dreamriver:dream-failed"));
        setShowPaywall(true);
        return false;
      }

      if (!response.ok) {
        console.error("API error details:", result);

        if (response.status === 401) {
          throw new Error("Authentication error. Please try refreshing the page and logging in again.");
        }

        throw new Error(result.error || "Failed to submit dream");
      }
      } // end JSON (non-stream) path

      if (result.id) {
        toast.success("Dream recorded! Analysis on its way…");

        localStorage.removeItem('loadingDreamId');
        localStorage.removeItem('loadingDreamStartedAt');
        // A successful submit means any dream stashed at a previous paywall
        // is obsolete (this WAS that dream, or the user has moved on).
        localStorage.removeItem(PENDING_DREAM_KEY);

        // Keep the cost line honest without refetching: one accepted
        // submission = one credit spent.
        setCredits((c) =>
          c ? { ...c, remaining: Math.max(0, c.remaining - 1) } : c,
        );

        // Matrix-aware image generation: dedupe by aesthetic so we only
        // burn one image per unique aesthetic in a comparison group.
        // Server-side, /api/dream-image fans the resulting URL out to all
        // rows that share that aesthetic + comparisonGroupId.
        const entries: Array<{
          id: string;
          analysis: any;
          analysis_depth?: string;
          reading_level_used?: string;
          image_aesthetic_used?: string;
        }> = result.entries ?? [
          { id: result.id, analysis: result.analysis, image_aesthetic_used: userAesthetic.current },
        ];
        const comparisonGroupId: string | null = result.comparisonGroupId ?? null;

        const seenAesthetics = new Set<string>();
        for (const entry of entries) {
          if (!entry.analysis) continue;
          const aesthetic = entry.image_aesthetic_used ?? userAesthetic.current;
          if (seenAesthetics.has(aesthetic)) continue;
          seenAesthetics.add(aesthetic);

          fetch("/api/dream-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dreamId: entry.id,
              title: entry.analysis.dreamTitle || "",
              summary: entry.analysis.analysis || "",
              topicSentence: entry.analysis.topicSentence || "",
              aesthetic,
              comparisonGroupId,
            }),
            keepalive: true,
          })
            .then(async (res) => {
              // fetch only rejects on network failure — an HTTP 400 resolves
              // normally. Without this check the route could answer "Invalid
              // request body" on every single submission and nothing anywhere
              // would say so. That is exactly what it was doing.
              if (!res.ok) {
                const detail = await res.text().catch(() => "");
                console.error(
                  `Image generation rejected (${res.status}) for dream ${entry.id}:`,
                  detail,
                );
              }
            })
            .catch((err) => console.error("Image generation request failed:", err));
        }

        // Notify the grid for each entry so any optimistic placeholder can
        // swap to real content. For matrix mode, multiple events fire.
        for (const entry of entries) {
          window.dispatchEvent(
            new CustomEvent("dreamriver:dream-analyzed", {
              detail: { id: entry.id, analysis: entry.analysis },
            }),
          );
        }
      }

      // Small delay to ensure DB writes have fully propagated before refresh
      await new Promise(resolve => setTimeout(resolve, 500));
      router.refresh();
      return true;
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
      // The submission produced no card — clear the optimistic placeholder.
      window.dispatchEvent(new CustomEvent("dreamriver:dream-failed"));
      return false;
    } finally {
      setLiveReading(null);
      lastDeltaField.current = null;
      setIsSubmitting(false);
    }
  };

  const hasContent = dream.trim().length > 0;

  // What the next submission costs, shown BEFORE the credit is spent.
  // Admins bypass the credit gate entirely, so they get no line. Free plan
  // shows the live remaining count (lifetime credits, see /api/credits);
  // paid plans just confirm the flat cost.
  const creditCostLine = !credits || credits.is_admin
    ? null
    : credits.plan === "free"
      ? credits.remaining > 0
        ? `This will use 1 of your ${credits.remaining} remaining free interpretation${credits.remaining === 1 ? "" : "s"}`
        : `You've used all ${credits.limit} of your free interpretations`
      : "Uses 1 credit";

  // Dots for the credit meter. Only for plans with a countable allowance —
  // an unlimited plan has nothing to meter, and admins bypass the gate. Capped
  // at 5 dots so a 50-credit plan doesn't render a ribbon; past the cap the
  // sentence beside it carries the real number.
  const METER_MAX_DOTS = 5;
  const creditMeterDots =
    !credits || credits.is_admin || credits.unlimited || credits.limit <= 0
      ? null
      : (() => {
          const total = Math.min(credits.limit, METER_MAX_DOTS);
          const filled = Math.round(
            (Math.max(0, credits.remaining) / credits.limit) * total,
          );
          return { total, filled };
        })();

  return (
    <div className="w-full sm:max-w-2xl sm:mx-auto space-y-2">
      <form onSubmit={handleSubmit}>
        {/* Credit-cost line — sits directly above the submit button's column.
            The slot has a fixed height and renders from first paint, so the
            text arriving from /api/credits never shifts the composer, and it
            lives entirely outside the paywall dialog's flow. */}
        <div
          className="h-4 mb-1 px-1 flex items-center justify-end gap-2"
          aria-live="polite"
        >
          {/* Credit meter — the brand sheet's own component (§5, "Credit
              meter: always visible before a spend, never only after"). Filled
              dots for credits remaining, hollow for spent, capped at 5 so a
              50-credit plan doesn't render a dot ribbon. Decorative: the
              sentence beside it already carries the count for screen readers. */}
          {creditMeterDots !== null && (
            <span className="flex items-center gap-1" aria-hidden="true">
              {Array.from({ length: creditMeterDots.total }, (_, i) => (
                <span
                  key={i}
                  className={`h-[7px] w-[7px] rounded-full ${
                    i < creditMeterDots.filled ? "bg-primary" : "bg-border"
                  }`}
                />
              ))}
            </span>
          )}
          {creditCostLine && (
            <span className="text-xs text-muted-foreground opacity-70">
              {creditCostLine}
            </span>
          )}
        </div>

        {/* Textarea container with inset send button.
            `field-sizing: content` lets the browser grow the textarea
            natively — no JS measure/resize cycle on every keystroke, so
            keystrokes can't be dropped. */}
        <div className="relative">
          <label htmlFor="dream-input" className="sr-only">Describe your dream</label>
          <textarea
            id="dream-input"
            placeholder="Describe your dream — a word, a feeling, or the whole story…"
            value={dream}
            onChange={(e) => setDream(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            maxLength={MAX_CHARS}
            disabled={isSubmitting}
            // `block` removes the inline-block baseline descender gap so the
            // wrapper height equals the textarea height — without it the
            // absolutely-positioned send button centers on a wrapper that's
            // ~3px taller than the field and sits slightly low. With `block`,
            // top-1/2 + translateY(-50%) is exact in every browser.
            className="block w-full resize-none overflow-y-auto rounded-xl border border-input bg-background px-4 py-3 pr-14 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [field-sizing:content] min-h-[60px] max-h-[200px]"
          />

          <Button
            type="submit"
            size="icon"
            disabled={!hasContent || isSubmitting}
            aria-label={isSubmitting ? "Processing dream" : "Submit dream"}
            // Vertically center the send button using the bulletproof
            // auto-margin technique: `inset-y-0` (top:0 + bottom:0) plus
            // `my-auto` on a fixed-height element centers it in the wrapper
            // with NO percentages and NO transform — so it can't be thrown off
            // by the Tailwind transform utility being tree-shaken (older
            // Chrome) or by sub-pixel rounding. Paired with the textarea's
            // `block` (which makes the wrapper exactly the field height), this
            // is exact across every browser and device.
            className={`absolute right-2.5 inset-y-0 my-auto z-10 h-11 w-11 rounded-lg transition-opacity duration-200 ${
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
            {isMac ? '⌘↵ to submit' : 'Ctrl+↵ to submit'}
          </span>
        </div>
      </form>

      {/* Live reading — prose streamed from the model while the analysis is
          still being generated. Serif to match the reading it becomes. */}
      {liveReading !== null && liveReading.length > 0 && (
        <div
          aria-live="polite"
          className="mt-3 rounded-xl border border-border bg-card/60 p-4 text-sm leading-relaxed animate-fade-in"
        >
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Your reading is forming…
          </div>
          <p className="whitespace-pre-wrap font-serif">
            {liveReading}
            <span
              aria-hidden="true"
              className="ml-0.5 inline-block h-4 w-[7px] animate-pulse rounded-[1px] bg-primary/70 align-text-bottom"
            />
          </p>
        </div>
      )}

      {/* Gentle hint for short dreams */}
      {hasContent && dream.trim().length < 20 && !tipDismissed && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-accent bg-accent/30">
          <div className="flex-shrink-0 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <circle cx="12" cy="12" r="10"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>
          <p className="flex-1 text-base text-foreground leading-relaxed">
            <span className="font-medium">Tip:</span> Adding more details will help generate a more insightful analysis.
          </p>
          <button
            onClick={handlePermanentDismiss}
            className="flex-shrink-0 p-1 rounded-full hover:bg-accent transition-colors group"
            aria-label="Dismiss tip permanently"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground group-hover:text-foreground">
              <path d="m18 6-12 12"/>
              <path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
      )}

      {/* Credit-exhaustion upsell — opened when the API answers 402
          out_of_credits. The dream text stays in the composer and in
          localStorage (PENDING_DREAM_KEY) while the user decides. */}
      <PaywallDialog open={showPaywall} onOpenChange={setShowPaywall} />
    </div>
  );
}
