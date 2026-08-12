"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { toggleComingSoonAction } from "../actions";

interface ComingSoonToggleProps {
  initialEnabled: boolean;
}

export default function ComingSoonToggle({ initialEnabled }: ComingSoonToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  function onCheckedChange(next: boolean) {
    // Optimistic update; revert on failure.
    const prev = enabled;
    setEnabled(next);

    startTransition(async () => {
      const result = await toggleComingSoonAction(next);
      if ("error" in result) {
        setEnabled(prev);
        toast.error(`Failed to update flag: ${result.error}`);
        return;
      }
      toast.success(
        result.enabled
          ? "Coming-soon mode is ON. Public visitors will see the splash."
          : "Coming-soon mode is OFF. Site is publicly accessible.",
      );
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Switch
        checked={enabled}
        onCheckedChange={onCheckedChange}
        disabled={isPending}
        aria-label="Coming-soon mode"
      />
      <span className="text-sm font-medium">
        {enabled ? "ON — splash visible to public" : "OFF — site is open"}
      </span>
    </div>
  );
}
