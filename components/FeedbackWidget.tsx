"use client";

// components/FeedbackWidget.tsx
//
// Floating "Feedback" bubble for signed-in users. app/layout.tsx mounts it
// only when a user session exists; because the root layout persists across
// client-side navigations, the widget also gates itself by pathname so it
// never floats over public/marketing/legal surfaces (shared dreams, landing,
// blog, terms, …). Submits to POST /api/feedback, which relays to the
// support inbox via Resend.

import { useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MessageSquarePlus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
  { value: "other", label: "Other" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

// Mirrors the validation in app/api/feedback/route.ts.
const MIN_CHARS = 10;
const MAX_CHARS = 2000;

// Public / marketing / legal routes where the bubble would be noise. Prefix
// match, so /shared/dream/[id] etc. are covered.
const HIDDEN_PREFIXES = [
  "/shared",
  "/landing",
  "/blog",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/auth",
  "/welcome",
];

export default function FeedbackWidget() {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("idea");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const hidden = HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (hidden) return null;

  const trimmedLength = message.trim().length;
  const canSubmit =
    trimmedLength >= MIN_CHARS && trimmedLength <= MAX_CHARS && !isSending;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSending(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: message.trim(),
          path: pathname,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          result?.error || "Something went wrong. Please try again.",
        );
      }

      toast.success("Thank you — your feedback is on its way.");
      setMessage("");
      setCategory("idea");
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send feedback.",
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* z-30: below dialogs/toasts (z-50) and the cookie banner (z-40). */}
        <Button
          type="button"
          variant="outline"
          aria-label="Send feedback"
          className="fixed bottom-4 right-4 z-30 h-11 w-11 gap-2 rounded-full p-0 shadow-lg bg-background/95 backdrop-blur sm:w-auto sm:px-4"
        >
          <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Feedback</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Send feedback</DialogTitle>
            <DialogDescription>
              Spotted a bug or have an idea? It goes straight to the people
              building DreamRiver.
            </DialogDescription>
          </DialogHeader>

          {/* Category pills — friendlier than a select on mobile. */}
          <div
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="Feedback category"
          >
            {CATEGORIES.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={category === option.value}
                onClick={() => setCategory(option.value)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  category === option.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <label htmlFor="feedback-message" className="sr-only">
              Your feedback
            </label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                category === "bug"
                  ? "What happened, and what did you expect instead?"
                  : "Tell us what's on your mind…"
              }
              rows={4}
              maxLength={MAX_CHARS}
              disabled={isSending}
              className="resize-none"
            />
            <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
              <span>
                {trimmedLength > 0 && trimmedLength < MIN_CHARS
                  ? `At least ${MIN_CHARS} characters`
                  : " "}
              </span>
              <span className={trimmedLength > 0 ? "opacity-60" : "opacity-0"}>
                {message.length}/{MAX_CHARS}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Sending…
                </>
              ) : (
                "Send feedback"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
