'use client';

// ShareDreamButton
// ----------------
// Opt-in sharing for a single dream with an explicit consent step.
//
// Dreams are private by default. Tapping "Share" opens a dialog that:
//   1. Warns the user that anyone with the link can view the dream.
//   2. Lets them choose what the link reveals — summary + analysis only,
//      or the full dream including the verbatim text they wrote.
//   3. Only after they confirm do we call the server to enable sharing,
//      mint a token, and surface the actual share targets (SMS, social,
//      copy link). A "Stop sharing" control revokes the link instantly.

import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

type Scope = 'summary' | 'full';

interface ShareDreamButtonProps {
  dreamId: string;
  title?: string | null;
  dreamSummary?: string | null;
  /** The dreamer's own words — included in the share message to entice the
   *  recipient to try DreamRiver. */
  dreamText?: string | null;
  /** Current share state from the server, so the dialog reflects an
   *  already-shared dream instead of minting a duplicate link. */
  initialShared?: boolean;
  initialToken?: string | null;
  initialScope?: Scope | null;
  /** Notifies the parent (card) so the "Shared" badge updates live. */
  onSharedChange?: (shared: boolean) => void;
}

const ShareIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

export default function ShareDreamButton({
  dreamId,
  title,
  dreamSummary,
  dreamText,
  initialShared = false,
  initialToken = null,
  initialScope = null,
  onSharedChange,
}: ShareDreamButtonProps) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>(initialScope ?? 'summary');
  const [busy, setBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(() => {
    if (initialShared && initialToken && typeof window !== 'undefined') {
      return `${window.location.origin}/shared/dream/${initialToken}`;
    }
    return null;
  });

  // Landing page — the acquisition target for shared messages. Unauthed
  // visitors who hit "/" are routed to /landing anyway, but link it directly.
  const landingUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/landing`
      : 'https://dreamriver.io/landing';

  // Generic, conversion-oriented share copy: frame it as a dream someone
  // wants you to see, include the dream in the sender's own words, and invite
  // the recipient to try DreamRiver free. Deliberately does NOT name the
  // sender (kept generic) and links to the landing/sign-up page.
  const shareText = (() => {
    const body = (dreamText || dreamSummary || title || '').trim();
    const clipped =
      body.length > 400 ? `${body.substring(0, 400).trimEnd()}…` : body;
    const quoted = clipped ? `\n\n“${clipped}”\n\n` : ' ';
    return `A dream was shared with you on DreamRiver 🌙${quoted}Discover what it means — and start your own free dream journal:`;
  })();

  const resetAndClose = () => {
    setOpen(false);
    // Keep shareUrl so re-opening shows the existing link; reset busy.
    setBusy(false);
  };

  const enableSharing = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/dream-entries/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dreamId, scope }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Could not enable sharing');
      }
      const origin =
        typeof window !== 'undefined' ? window.location.origin : 'https://dreamriver.io';
      setShareUrl(`${origin}/shared/dream/${data.share_token}`);
      onSharedChange?.(true);
      toast.success('Share link created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not enable sharing');
    } finally {
      setBusy(false);
    }
  };

  const revokeSharing = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/dream-entries/share?id=${dreamId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Could not stop sharing');
      }
      setShareUrl(null);
      onSharedChange?.(false);
      toast.success('Sharing turned off. The link no longer works.');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not stop sharing');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  // Native share sheet (Web Share API) — on mobile this opens the OS share
  // sheet (Messages, WhatsApp, etc.) in one tap. Falls back to copy on
  // desktop browsers without navigator.share.
  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const nativeShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.share({
        title: title || 'A dream on DreamRiver',
        text: shareText,
        url: shareUrl,
      });
    } catch (err) {
      // AbortError = user dismissed the sheet — not an error.
      if (err instanceof Error && err.name !== 'AbortError') {
        await copyLink();
      }
    }
  };

  const enc = encodeURIComponent;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring rounded"
        aria-label="Share this dream"
      >
        <ShareIcon className="h-4 w-4" />
        Share
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          {!shareUrl ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Share this dream?</AlertDialogTitle>
                <AlertDialogDescription>
                  Creating a link makes this dream viewable by{' '}
                  <strong>anyone who has the link</strong> — no account or subscription
                  needed. Only share it with people you trust, and turn sharing off
                  whenever you want.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="my-2 space-y-2">
                <p className="text-sm font-medium">What should the link show?</p>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setScope('summary')}
                    className={
                      'text-left rounded-md border p-3 text-sm transition-colors ' +
                      (scope === 'summary'
                        ? 'border-primary ring-1 ring-primary bg-primary/5'
                        : 'border-input hover:bg-muted')
                    }
                  >
                    <span className="font-medium">Summary &amp; analysis only</span>
                    <span className="block text-xs text-muted-foreground">
                      Title, dream summary, and interpretation. Your original dream text
                      stays private.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('full')}
                    className={
                      'text-left rounded-md border p-3 text-sm transition-colors ' +
                      (scope === 'full'
                        ? 'border-primary ring-1 ring-primary bg-primary/5'
                        : 'border-input hover:bg-muted')
                    }
                  >
                    <span className="font-medium">Full dream</span>
                    <span className="block text-xs text-muted-foreground">
                      Includes the exact dream you wrote, plus the summary and analysis.
                    </span>
                  </button>
                </div>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
                <Button onClick={enableSharing} disabled={busy}>
                  {busy ? 'Creating…' : 'Create share link'}
                </Button>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Your share link is ready</AlertDialogTitle>
                <AlertDialogDescription>
                  Anyone with this link can view{' '}
                  {scope === 'full' ? 'the full dream' : 'the summary and analysis'}.
                  Send it only to people you trust.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="my-2 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 rounded-md border border-input bg-muted px-2 py-1.5 text-xs"
                  />
                  <Button size="sm" variant="secondary" onClick={copyLink}>
                    Copy
                  </Button>
                </div>

                {canNativeShare && (
                  <Button size="sm" className="w-full" onClick={nativeShare}>
                    <ShareIcon className="h-3.5 w-3.5 mr-1.5" />
                    Share via text, WhatsApp &amp; more
                  </Button>
                )}

                {/* Only the Text option for now — social channels
                    (Telegram / X / Facebook) will be added back later once the
                    per-channel formatting is designed. */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs text-muted-foreground">Send via:</span>
                  <a
                    href={`sms:?body=${enc(`${shareText} ${landingUrl}`)}`}
                    className="text-xs underline hover:no-underline"
                  >
                    Text
                  </a>
                </div>
              </div>

              <AlertDialogFooter className="sm:justify-between">
                <Button
                  variant="ghost"
                  onClick={revokeSharing}
                  disabled={busy}
                  className="text-destructive hover:text-destructive"
                >
                  {busy ? 'Working…' : 'Stop sharing'}
                </Button>
                <Button variant="outline" onClick={resetAndClose} disabled={busy}>
                  Done
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
