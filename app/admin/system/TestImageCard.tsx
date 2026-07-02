"use client";

// Admin "Test image generation" card. Runs the real BFL (FLUX) submit+poll
// round-trip via /api/admin/test-image and shows the result — a green check
// with the generated image, or a red error explaining exactly what failed
// (bad key, out of credits, rate limited, timeout, network). Costs ~1.5¢/run.

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Result =
  | { ok: true; sampleUrl: string; cost: number | null; elapsedMs: number }
  | { ok: false; stage?: string; httpStatus?: number; error: string };

export function TestImageCard() {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<Result | null>(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/test-image", { method: "POST" });
      setResult((await res.json()) as Result);
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Image Generation (FLUX / Black Forest Labs)</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Runs a live submit → poll round-trip against BFL to confirm the key, credits, and
          pipeline work. Costs a fraction of a cent per run; nothing is saved.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={run} disabled={loading}>
          {loading ? "Generating… (a few seconds)" : "Run image generation test"}
        </Button>

        {result?.ok && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-green-600 dark:text-green-400 font-medium">
                Success — image generated in {(result.elapsedMs / 1000).toFixed(1)}s
                {result.cost != null ? ` · reported cost ${result.cost}` : ""}
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.sampleUrl}
              alt="BFL test generation"
              className="w-40 h-40 rounded-lg object-cover border"
            />
            <p className="text-xs text-muted-foreground">
              Generation is working. If images still don&rsquo;t show in the app, the issue is
              display (rendering), not generation.
            </p>
          </div>
        )}

        {result && !result.ok && (
          <div className="rounded-lg border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-3">
            <div className="flex items-center gap-2 text-sm mb-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-600 dark:text-red-400 font-medium">
                Failed{result.stage ? ` at: ${result.stage}` : ""}
                {"httpStatus" in result && result.httpStatus ? ` (HTTP ${result.httpStatus})` : ""}
              </span>
            </div>
            <p className="text-xs text-red-700 dark:text-red-300">{result.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
