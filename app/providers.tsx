'use client';

import React, { Suspense, useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { usePathname, useSearchParams } from 'next/navigation';
import { SearchProvider } from '@/context/search-context';
import { TooltipProvider } from '@/components/ui/tooltip';
import { createClient } from '@/utils/supabase/client';
import {
  CONSENT_CHANGED_EVENT,
  capturePageview,
  getStoredConsent,
  identifyUser,
  initAnalytics,
  trackSignedUpOnce,
} from '@/lib/analytics';

// Boots PostHog for visitors who already accepted the cookie banner (or the
// moment they accept it), ties the session to the Supabase user id, and fires
// `signed_up` once for freshly created accounts. Everything inside is a no-op
// without NEXT_PUBLIC_POSTHOG_KEY + stored consent (see lib/analytics.ts).
function AnalyticsBootstrap() {
  useEffect(() => {
    const sync = async () => {
      if (getStoredConsent() !== 'accepted') return;
      initAnalytics();
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        identifyUser(user.id);
        trackSignedUpOnce(user.id, user.created_at);
      }
    };
    void sync();
    // Re-run when the banner choice changes (accept after landing anonymous),
    // and capture the page the visitor accepted on — the route-change effect
    // below won't re-fire until the next navigation.
    const onConsentChanged = () => {
      void sync().then(() => capturePageview(window.location.href));
    };
    window.addEventListener(CONSENT_CHANGED_EVENT, onConsentChanged);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onConsentChanged);
  }, []);
  return null;
}

// Manual $pageview on App Router route changes (posthog-js only auto-captures
// full page loads). Must sit under <Suspense> because of useSearchParams.
function AnalyticsPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    initAnalytics(); // idempotent — guards against effect-ordering races
    const search = searchParams?.toString();
    capturePageview(
      window.location.origin + pathname + (search ? `?${search}` : ''),
    );
  }, [pathname, searchParams]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider delayDuration={200} skipDelayDuration={0}>
        <SearchProvider>
          <AnalyticsBootstrap />
          <Suspense fallback={null}>
            <AnalyticsPageview />
          </Suspense>
          {children}
        </SearchProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
