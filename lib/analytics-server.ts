// lib/analytics-server.ts
//
// Technical explanation:
// Server-side PostHog client (posthog-node) for first-party product events
// fired from API routes and Stripe webhooks. Dark launch: without a
// POSTHOG_KEY env var every function here is a silent no-op, so this ships
// safely before the PostHog project exists.
//
// CONSENT STANCE — NOTE(Justin): server events are captured regardless of the
// visitor's cookie-banner choice. Rationale: these are first-party
// OPERATIONAL analytics tied to the account and to billing (signup funnel,
// credits, subscriptions) — not cross-site tracking, and no cookies are
// involved. Justin must confirm this stance is accurately reflected in the
// privacy policy (see app/privacy/page.tsx, "Cookies & Analytics") before
// launch.
//
// Analogy:
// The front-of-house guestbook (client analytics) is signed only by guests
// who agree; this is the kitchen's order log — the restaurant has to keep it
// to run the business, but it should still say so on the menu.

import { PostHog } from "posthog-node";

export type ServerAnalyticsEvent =
  | "first_dream_submitted"
  | "credits_exhausted"
  | "checkout_started"
  | "subscribed";

export type ServerEventProps = Record<string, string | number | boolean | null>;

let client: PostHog | null = null;

function getClient(): PostHog | null {
  const key = process.env.POSTHOG_KEY;
  if (!key) return null;
  if (!client) {
    client = new PostHog(key, {
      host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
      // Serverless-safe: no long-lived process exists to batch/flush in the
      // background, so send every event as its own request immediately.
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}

/**
 * Capture a server-side product event for a known user. Awaits delivery
 * (captureImmediate) because Vercel can freeze the function right after the
 * response is returned — a fire-and-forget capture would silently vanish.
 * Never throws: a failed analytics call must not break dream creation,
 * checkout, or webhook processing.
 */
export async function captureServerEvent(
  userId: string,
  event: ServerAnalyticsEvent,
  properties?: ServerEventProps,
): Promise<void> {
  const posthog = getClient();
  if (!posthog) return;
  try {
    await posthog.captureImmediate({ distinctId: userId, event, properties });
  } catch (err) {
    console.error(`[analytics-server] capture failed for "${event}":`, err);
  }
}

/**
 * Flush pending events and close the shared client. Not needed on the
 * per-request serverless path (captureImmediate already awaits delivery);
 * call from long-running scripts/tests for a graceful shutdown.
 */
export async function shutdownServerAnalytics(): Promise<void> {
  if (!client) return;
  try {
    await client.shutdown();
  } catch (err) {
    console.error("[analytics-server] shutdown failed:", err);
  } finally {
    client = null;
  }
}
