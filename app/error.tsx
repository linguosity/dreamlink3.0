"use client";

import { useEffect } from "react";
import Link from "next/link";
import { captureError } from "@/lib/sentry";
import { BrandIcon } from "@/components/brand/BrandIcon";

/**
 * Error boundary for pages inside the root layout — the navbar and chrome stay
 * put, so this only fills the content area.
 *
 * Tone follows app/not-found.tsx: the river metaphor carries the bad news, but
 * lightly. Someone reading this has just lost what they were doing, so the
 * copy stays short and the actions stay obvious. `digest` is surfaced because
 * it is the one string that lets us find their specific failure in Sentry —
 * without it a support message is "it broke", which is unactionable.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, {
      tags: { boundary: "page" },
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center space-y-6 max-w-lg">
        <div className="flex justify-center">
          <BrandIcon size={56} alt="" />
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-foreground">
            The current broke
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            Something went wrong on our end — an unexpected error, not anything
            you did. Your dreams are safe and nothing was lost.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium w-full sm:w-auto"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-xl border border-border text-foreground hover:bg-accent transition-colors font-medium w-full sm:w-auto"
          >
            Back to my dreams
          </Link>
        </div>

        {/* The one detail worth showing: it turns "it broke" into a report we
            can trace. Muted and small — there for the person who needs it,
            invisible to the person who doesn't. */}
        {error.digest && (
          <p className="text-xs text-muted-foreground pt-2">
            If you tell us about this, include{" "}
            <code className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted text-foreground">
              {error.digest}
            </code>
          </p>
        )}
      </div>
    </div>
  );
}
