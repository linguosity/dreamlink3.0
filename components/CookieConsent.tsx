"use client";

// components/CookieConsent.tsx
//
// Real consent gating (not just a dismissible notice): the banner choice is
// persisted and actually controls whether PostHog analytics initializes.
// Accept → lib/analytics boots PostHog; Decline → essential cookies only,
// PostHog never loads (or opts out if it was previously running). The choice
// can be revisited later via openCookiePreferences() / <CookiePreferencesLink>.

import { useState, useEffect } from "react";
import Link from "next/link";
import { getStoredConsent, setStoredConsent } from "@/lib/analytics";

/** Window event that reopens the banner so a visitor can change their choice. */
export const COOKIE_PREFERENCES_EVENT = "dreamriver:open-cookie-preferences";

/**
 * Reopen the consent banner from anywhere in the client app (e.g. a footer
 * "Cookie Preferences" link). Safe to call on any page — the banner is
 * mounted globally in app/layout.tsx.
 */
export function openCookiePreferences(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COOKIE_PREFERENCES_EVENT));
}

/** Small footer-style link that reopens the consent banner. */
export function CookiePreferencesLink({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openCookiePreferences} className={className}>
      Cookie Preferences
    </button>
  );
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getStoredConsent();
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
    // Note: for returning visitors who already accepted, PostHog is booted by
    // the analytics bootstrap in app/providers.tsx — nothing to do here.
  }, []);

  // Let "Cookie Preferences" links reopen the banner to change the choice.
  useEffect(() => {
    const reopen = () => setVisible(true);
    window.addEventListener(COOKIE_PREFERENCES_EVENT, reopen);
    return () => window.removeEventListener(COOKIE_PREFERENCES_EVENT, reopen);
  }, []);

  useEffect(() => {
    if (visible) {
      document.body.dataset.cookieBanner = "visible";
    } else {
      delete document.body.dataset.cookieBanner;
    }
    return () => {
      delete document.body.dataset.cookieBanner;
    };
  }, [visible]);

  const accept = () => {
    setStoredConsent("accepted"); // persists + initializes PostHog
    setVisible(false);
  };

  const decline = () => {
    setStoredConsent("declined"); // persists + keeps/turns PostHog off
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed z-40 left-4 right-4 bottom-4
                 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm
                 rounded-2xl shadow-xl ring-1 ring-black/5
                 border border-border
                 bg-card/95 backdrop-blur-sm
                 p-4 sm:p-5 animate-fade-in"
    >
      <p className="text-sm text-muted-foreground leading-relaxed">
        We use essential cookies to keep you signed in and make the app work.
        With your permission, we&apos;d also like to use privacy-respecting
        analytics to understand how DreamRiver is used — never advertising or
        cross-site tracking cookies. Learn more in our{" "}
        <Link
          href="/privacy"
          className="underline text-primary hover:text-primary-hover focus-ring rounded"
        >
          Privacy Policy
        </Link>
        .
      </p>
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={accept}
          className="tap inline-flex items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors focus-ring"
        >
          Allow analytics
        </button>
        <button
          onClick={decline}
          className="tap inline-flex items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors focus-ring"
        >
          Essential only
        </button>
      </div>
    </div>
  );
}
