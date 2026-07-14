"use client";

// components/PaywallDialog.tsx
//
// The credit-exhaustion moment. Shown by CompactDreamInput when
// POST /api/dream-entries answers 402 { code: "out_of_credits" } — i.e. the
// user just wrote a dream (their 4th on the free plan) and we couldn't
// interpret it. The dream itself is preserved (composer state + the
// dr_pending_dream localStorage stash), so the dialog sells the unlock, not
// a do-over.

import { useEffect } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { track } from "@/lib/analytics";

const PRICING_HREF =
  "/pricing?utm_source=app&utm_medium=paywall&utm_campaign=credits_exhausted";

interface PaywallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PaywallDialog({ open, onOpenChange }: PaywallDialogProps) {
  useEffect(() => {
    if (!open) return;
    try {
      // track() is consent-gated and no-ops without a PostHog key,
      // so this is always safe to call.
      track("paywall_viewed");
    } catch {
      // Analytics must never break the paywall moment.
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent sm:mx-0">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <DialogTitle className="pt-1">
            Your dream is written — unlock its interpretation
          </DialogTitle>
          <DialogDescription>
            You&apos;ve used your 3 free interpretations. Your journal stays
            free forever — and the dream you just wrote is saved right here,
            waiting. Upgrade to receive biblically-grounded interpretation for
            it and every dream after.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button asChild>
            <Link href={PRICING_HREF}>Unlock interpretation</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
