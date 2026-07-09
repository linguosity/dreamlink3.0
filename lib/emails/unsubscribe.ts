// lib/emails/unsubscribe.ts
//
// Tokenized one-click unsubscribe links for recurring lifecycle email
// (morning reminders, weekly digest). The token is
// HMAC-SHA256("unsubscribe:v1:<userId>:<type>") keyed with CRON_SECRET, so
// links can be verified statelessly — no login, no DB read — by
// app/api/email/unsubscribe/route.ts.
//
// Fail-safe like the rest of the email subsystem: when CRON_SECRET is unset
// (the same env var that gates the cron routes), builders return null and
// templates simply omit the one-click link — the "Manage email preferences"
// footer link to /settings still works.
//
// Server-only: never import into client components (secret-derived tokens).

import { createHmac, timingSafeEqual } from "crypto";
import { PREF_KEY_BY_EMAIL_TYPE, type UnsubscribeEmailType } from "@/lib/emails/preferences";

// Hardcoded prod origin, same convention as lib/emails/templates.ts SITE_URL —
// email links must always point at the canonical domain, never a preview URL.
const SITE_URL = "https://dreamriver.io";

function getUnsubscribeSecret(): string | null {
  return process.env.CRON_SECRET || null;
}

export function isUnsubscribeEmailType(
  value: string | null | undefined,
): value is UnsubscribeEmailType {
  return typeof value === "string" && value in PREF_KEY_BY_EMAIL_TYPE;
}

/** Hex HMAC token for (userId, type); null when CRON_SECRET is unset. */
export function signUnsubscribeToken(
  userId: string,
  type: UnsubscribeEmailType,
): string | null {
  const secret = getUnsubscribeSecret();
  if (!secret || !userId) return null;
  return createHmac("sha256", secret)
    .update(`unsubscribe:v1:${userId}:${type}`)
    .digest("hex");
}

/** Constant-time verification of a token from an unsubscribe link. */
export function verifyUnsubscribeToken(
  userId: string,
  type: UnsubscribeEmailType,
  token: string | null | undefined,
): boolean {
  const expected = signUnsubscribeToken(userId, type);
  if (!expected || !token) return false;
  const expectedBuf = Buffer.from(expected, "hex");
  // Buffer.from(.., "hex") stops at the first invalid character, so malformed
  // input yields a short buffer and fails the length check below.
  const providedBuf = Buffer.from(token.trim().toLowerCase(), "hex");
  if (expectedBuf.length === 0 || expectedBuf.length !== providedBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, providedBuf);
}

/**
 * Absolute one-click unsubscribe URL for an email footer, or null when
 * CRON_SECRET is unset (callers omit the link).
 */
export function buildUnsubscribeUrl(
  userId: string,
  type: UnsubscribeEmailType,
): string | null {
  const token = signUnsubscribeToken(userId, type);
  if (!token) return null;
  const params = new URLSearchParams({ uid: userId, type, token });
  return `${SITE_URL}/api/email/unsubscribe?${params.toString()}`;
}
