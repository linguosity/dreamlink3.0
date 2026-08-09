"use client";

// Bulk cover generation for posts that don't have one.
//
// This exists because generation is deliberately NOT part of the import flow.
// Each image is a BFL submit plus polling — tens of seconds — so generating
// inline would push an eight-article import well past any sensible server
// action timeout, and a slow image service would take the whole import down
// with it. Import stays fast and always succeeds; covers come after.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { generateMissingCoversAction } from "../actions";

export function GenerateCovers({ missingCount }: { missingCount: number }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  // Nothing to do — say nothing rather than showing a disabled control that
  // makes the page look like it has an unfinished job.
  if (missingCount === 0) return null;

  async function run() {
    setRunning(true);
    try {
      const res = await generateMissingCoversAction();
      if ("error" in res) {
        toast.error(res.error);
        return;
      }

      if (res.generated.length === 0 && res.failed.length === 0) {
        toast.info("No articles were missing a cover.");
        return;
      }

      // Report the whole outcome, including what was skipped. A run that
      // quietly stops at its cap and says "done" reads as "all of them".
      const parts: string[] = [];
      if (res.generated.length > 0) {
        parts.push(
          `Generated ${res.generated.length} cover${res.generated.length === 1 ? "" : "s"}`
        );
      }
      if (res.failed.length > 0) parts.push(`${res.failed.length} failed`);
      if (res.remaining > 0) parts.push(`${res.remaining} still to go — run again`);

      const message = parts.join(" · ");
      if (res.failed.length > 0) {
        toast.warning(message, {
          description: res.failed
            .map((f) => `${f.title}: ${f.reason}`)
            .join("\n"),
        });
      } else {
        toast.success(message);
      }
      router.refresh();
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div>
          <p className="text-sm font-medium">
            {missingCount} article{missingCount === 1 ? " has" : "s have"} no
            cover image
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Generates one per article in the shared house style. Runs a few at a
            time — press again for the rest.
          </p>
        </div>
        <Button onClick={run} disabled={running} variant="outline">
          <Sparkles className={`size-4 ${running ? "animate-pulse" : ""}`} />
          <span className="ml-2">
            {running ? "Drawing…" : "Generate covers"}
          </span>
        </Button>
      </CardContent>
    </Card>
  );
}
