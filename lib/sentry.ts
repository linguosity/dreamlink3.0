/**
 * Sentry configuration and initialization for DreamRiver.
 *
 * SETUP REQUIRED:
 * 1. Run: npm install @sentry/nextjs
 * 2. Run: npx @sentry/wizard@latest -i nextjs
 *    (This will auto-create sentry.client.config.ts, sentry.server.config.ts,
 *     sentry.edge.config.ts, and update next.config.mjs)
 * 3. Add to .env: SENTRY_DSN, SENTRY_ORG, SENTRY_PROJECT
 * 4. Add to next.config.mjs: withSentryConfig wrapper (wizard does this automatically)
 *
 * MANUAL ALTERNATIVE (if wizard doesn't work):
 * Create these three files at the project root:
 *
 * --- sentry.client.config.ts ---
 * import * as Sentry from "@sentry/nextjs";
 * Sentry.init({
 *   dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
 *   tracesSampleRate: 0.1,
 *   replaysSessionSampleRate: 0.1,
 *   replaysOnErrorSampleRate: 1.0,
 *   integrations: [Sentry.replayIntegration()],
 * });
 *
 * --- sentry.server.config.ts ---
 * import * as Sentry from "@sentry/nextjs";
 * Sentry.init({
 *   dsn: process.env.SENTRY_DSN,
 *   tracesSampleRate: 0.2,
 * });
 *
 * --- sentry.edge.config.ts ---
 * import * as Sentry from "@sentry/nextjs";
 * Sentry.init({
 *   dsn: process.env.SENTRY_DSN,
 *   tracesSampleRate: 0.2,
 * });
 *
 * Then wrap next.config.mjs:
 * import { withSentryConfig } from "@sentry/nextjs";
 * export default withSentryConfig(nextConfig, { silent: true });
 */

/**
 * Structured error logger that can be used throughout the app.
 * Falls back to console.error when Sentry isn't installed yet.
 */
export function captureError(
  error: unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    level?: "fatal" | "error" | "warning" | "info";
  }
) {
  // Attempt to use Sentry if available
  try {
    // Dynamic import to avoid errors when @sentry/nextjs isn't installed
    const Sentry = require("@sentry/nextjs");
    if (Sentry?.captureException) {
      Sentry.withScope((scope: any) => {
        if (context?.tags) {
          Object.entries(context.tags).forEach(([key, value]) => {
            scope.setTag(key, value);
          });
        }
        if (context?.extra) {
          Object.entries(context.extra).forEach(([key, value]) => {
            scope.setExtra(key, value);
          });
        }
        if (context?.level) {
          scope.setLevel(context.level);
        }
        Sentry.captureException(error);
      });
      return;
    }
  } catch {
    // Sentry not installed — fall through to console
  }

  // Fallback: structured console logging
  const errorMessage = error instanceof Error ? error.message : String(error);
  const logEntry = {
    timestamp: new Date().toISOString(),
    error: errorMessage,
    ...(context?.tags && { tags: context.tags }),
    ...(context?.extra && { extra: context.extra }),
    level: context?.level || "error",
  };
  console.error("[DreamRiver Error]", JSON.stringify(logEntry));
}

/**
 * Log a breadcrumb for debugging context.
 */
export function addBreadcrumb(message: string, data?: Record<string, unknown>) {
  try {
    const Sentry = require("@sentry/nextjs");
    if (Sentry?.addBreadcrumb) {
      Sentry.addBreadcrumb({
        message,
        data,
        level: "info",
      });
      return;
    }
  } catch {
    // Sentry not installed
  }

  // Fallback
  if (process.env.NODE_ENV === "development") {
    console.log("[Breadcrumb]", message, data || "");
  }
}
