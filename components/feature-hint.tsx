"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { useHints } from "@/lib/hints/dismissed-context";
import type { HintId } from "@/lib/hints/types";

type Side = "top" | "right" | "bottom" | "left";
type Align = "start" | "center" | "end";

type Props = {
  id: HintId;
  title: string;
  body: string;
  side?: Side;
  align?: Align;
  /** Render the anchor child but skip the popover (e.g. for guests / SSR). */
  enabled?: boolean;
  /**
   * Single React element used as the popover anchor. Anchor is attached via
   * `asChild` so layout is untouched — no wrapper span, no display surprises.
   */
  children: React.ReactElement;
};

/**
 * One-shot coach mark. Auto-opens once on first registered render, then never
 * again after dismissal. Anchored to its own children so layout stays intact.
 */
export function FeatureHint({
  id,
  title,
  body,
  side = "bottom",
  align = "center",
  enabled = true,
  children,
}: Props) {
  const { isActive, dismiss, register } = useHints();
  // Avoid rendering the popover during SSR / before mount — prevents a flash
  // of the hint on pages that hydrate slowly.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!enabled || !mounted) return;
    return register(id);
  }, [enabled, mounted, register, id]);

  const open = enabled && mounted && isActive(id);

  return (
    <Popover open={open}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent
        side={side}
        align={align}
        // Don't steal focus — the user is mid-task.
        onOpenAutoFocus={(e) => e.preventDefault()}
        // Click-outside dismisses; keep the user in flow.
        onInteractOutside={() => dismiss(id)}
        onEscapeKeyDown={() => dismiss(id)}
        className="w-[18rem] p-0"
      >
        <div className="relative p-4">
          <button
            type="button"
            onClick={() => dismiss(id)}
            aria-label="Dismiss hint"
            className="absolute right-2 top-2 rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="pr-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
              Tip
            </p>
            <p className="mt-1 text-sm font-semibold leading-snug">{title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {body}
            </p>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => dismiss(id)}
              className="text-[11px] font-semibold uppercase tracking-wider text-primary hover:text-primary/80"
            >
              Got it
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
