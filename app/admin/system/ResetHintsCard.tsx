"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { resetMyHintsAction } from "@/app/actions/dismiss-hint";
import { HINT_IDS, type HintId } from "@/lib/hints/types";

const HINT_LABELS: Record<HintId, string> = {
  "depth-tier": "Depth tier (Settings discovery)",
  "dream-tabs": "Dream card tabs (Original / Analysis)",
  "share-dream": "Share dream row",
};

export function ResetHintsCard({
  initialDismissed,
}: {
  initialDismissed: HintId[];
}) {
  const [dismissed, setDismissed] = useState<HintId[]>(initialDismissed);
  const [pending, startTransition] = useTransition();

  function onReset() {
    startTransition(async () => {
      const result = await resetMyHintsAction();
      if ("error" in result) {
        toast.error(`Reset failed: ${result.error}`);
        return;
      }
      setDismissed([]);
      toast.success("Hints reset. Refresh any page to see them again.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Onboarding Hints (yours)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-1.5 text-sm">
          {HINT_IDS.map((id) => {
            const isDismissed = dismissed.includes(id);
            return (
              <li key={id} className="flex items-center gap-3">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isDismissed ? "bg-muted-foreground/40" : "bg-green-500"
                  }`}
                  aria-hidden
                />
                <span className="flex-1">{HINT_LABELS[id]}</span>
                <span
                  className={`text-xs ${
                    isDismissed
                      ? "text-muted-foreground"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {isDismissed ? "Dismissed" : "Eligible"}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Resets only your own hints. Refresh any page after to re-trigger.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={onReset}
            disabled={pending || dismissed.length === 0}
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            {pending ? "Resetting…" : "Reset hints"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
