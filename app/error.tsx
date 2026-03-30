"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/sentry";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * Error boundary for pages within the root layout.
 * Catches page-level errors and reports to Sentry while keeping the layout intact.
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
    <div className="container flex items-center justify-center py-20">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground">
          This page encountered an error. You can try again or go back to your
          dream journal.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => reset()} variant="default">
            Try Again
          </Button>
          <Link href="/">
            <Button variant="outline">Go Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
