"use client";

// Card chrome for the Trends page with an expand control: every chart card
// can open as a large modal for a closer look. Children are passed straight
// through, so server-rendered charts (heatmap, momentum, volume) and the
// client streamgraph all work in both places — the streamgraph re-measures
// its container, so it fills the dialog on its own.
//
// NOTE: DialogContent portals to <body>, which is OUTSIDE the page's
// .trends-scope wrapper — the dialog carries the class itself so the
// --trend-1…6 tokens keep resolving inside the popup.

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function ExpandableCard({
  title,
  sub,
  children,
  className = "",
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section
      className={`rounded-[var(--radius-lg)] border bg-card p-5 shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[13px] font-semibold">{title}</h2>
          <p className="text-[11.5px] text-muted-foreground mt-0.5">{sub}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Expand"
          aria-label={`Expand ${title}`}
          className="shrink-0 w-7 h-7 grid place-items-center rounded-md border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {children}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="trends-scope max-w-[min(1160px,94vw)] bg-card rounded-[var(--radius-lg)]">
          <DialogHeader className="text-left">
            <DialogTitle className="text-[15px] font-semibold">
              {title}
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              {sub}
            </DialogDescription>
          </DialogHeader>
          {/* Re-render (not move) the same children at dialog width */}
          {open && <div className="mt-1">{children}</div>}
        </DialogContent>
      </Dialog>
    </section>
  );
}
