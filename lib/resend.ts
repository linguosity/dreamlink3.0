// lib/resend.ts
//
// Server-only Resend client. The API key is read from RESEND_API_KEY (set in
// .env) — never hardcode it, and never import this into a client component or
// anything that ships to the browser, or the key would leak.

import { Resend } from "resend";

let client: Resend | null = null;

/** Lazily construct the Resend client; throws a clear error if the key is unset. */
export function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to your environment (.env / Vercel).",
    );
  }
  if (!client) client = new Resend(key);
  return client;
}

/**
 * True when RESEND_API_KEY is configured. The lifecycle email helpers in
 * lib/emails/send.ts silently no-op when this is false, so email stays an
 * optional subsystem — a missing key must never break signup, dream
 * submission, or Stripe webhook processing.
 */
export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Sender identity for lifecycle emails. Override with EMAIL_FROM; the default
 * requires dreamriver.io to be verified as a sending domain in Resend.
 */
export function getEmailFrom(): string {
  return process.env.EMAIL_FROM || "DreamRiver <hello@dreamriver.io>";
}

/** Support address used as Reply-To and in email footers. Override with SUPPORT_EMAIL. */
export function getSupportEmail(): string {
  return process.env.SUPPORT_EMAIL || "support@dreamriver.io";
}
