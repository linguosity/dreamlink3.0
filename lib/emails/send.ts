// lib/emails/send.ts
//
// Lifecycle (transactional) email sender. Fail-safe by design:
//
//   - Silent no-op when RESEND_API_KEY is unset — email is an optional
//     subsystem and its absence must never change product behavior.
//   - NEVER throws. Callers in the auth callback, dream-entries route, and
//     Stripe webhook just `await sendXEmail(...)`; a Resend outage or DB
//     hiccup logs and moves on. (Awaited rather than fire-and-forget because
//     Vercel can freeze the function right after the response returns — same
//     reasoning as lib/analytics-server.ts.)
//   - At-most-once per (user, type, dedupe_key): we INSERT into
//     notification_log FIRST and only send when that claim succeeds. A 23505
//     unique violation means "already sent" → skip. Same claim-first pattern
//     as the stripe_events idempotency ledger. If the Resend call itself
//     fails, the claim is released (best-effort) so a later trigger can
//     retry.
//
// Server-only: imports the service-role admin client. Never import from
// client components.

import {
  getResend,
  isResendConfigured,
  getEmailFrom,
  getSupportEmail,
} from "@/lib/resend";
import { getAdminClient } from "@/utils/supabase/admin";
import {
  welcomeEmail,
  creditsExhaustedEmail,
  paymentFailedEmail,
  cancellationConfirmedEmail,
  type EmailContent,
} from "@/lib/emails/templates";

export type LifecycleEmailType =
  | "welcome"
  | "credits_exhausted"
  | "payment_failed"
  | "cancellation_confirmed";

/**
 * Look up a user's email address via the service-role client. Returns null on
 * any failure; never throws — used inside webhook handlers where an email
 * lookup failure must not fail the event.
 */
export async function getUserEmailById(userId: string): Promise<string | null> {
  try {
    const { data, error } = await getAdminClient().auth.admin.getUserById(userId);
    if (error) {
      console.error(`[emails] user lookup failed for ${userId}:`, error.message);
      return null;
    }
    return data.user?.email ?? null;
  } catch (err) {
    console.error(`[emails] user lookup threw for ${userId}:`, err);
    return null;
  }
}

async function sendLifecycleEmail(args: {
  userId: string;
  to: string;
  type: LifecycleEmailType;
  dedupeKey: string;
  content: EmailContent;
}): Promise<void> {
  if (!isResendConfigured()) return;
  const { userId, to, type, dedupeKey, content } = args;

  try {
    const admin = getAdminClient();

    // Claim first: unique violation = already sent = skip silently.
    const { error: claimError } = await admin.from("notification_log").insert({
      user_id: userId,
      type,
      dedupe_key: dedupeKey,
    });
    if (claimError) {
      if ((claimError as { code?: string }).code !== "23505") {
        console.error(
          `[emails] ${type} claim failed for user ${userId}:`,
          claimError.message,
        );
      }
      // Duplicate OR claim failure → don't send. Never send an unclaimed
      // email; a dedupe we can't record is worse than a missed email.
      return;
    }

    const { error: sendError } = await getResend().emails.send({
      from: getEmailFrom(),
      to,
      replyTo: getSupportEmail(),
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
    if (sendError) {
      throw new Error(sendError.message || "Resend send failed");
    }
  } catch (err) {
    console.error(`[emails] ${type} send failed for user ${userId}:`, err);
    // Release the claim (best-effort) so the next trigger can retry a
    // transient failure. If this delete also fails we stay at-most-once.
    try {
      await getAdminClient()
        .from("notification_log")
        .delete()
        .match({ user_id: userId, type, dedupe_key: dedupeKey });
    } catch {
      /* swallow — never propagate */
    }
  }
}

/**
 * Welcome email at first authenticated arrival. Once per user, ever
 * (dedupe_key "once").
 */
export async function sendWelcomeEmail(userId: string, to: string): Promise<void> {
  await sendLifecycleEmail({
    userId,
    to,
    type: "welcome",
    dedupeKey: "once",
    content: welcomeEmail(),
  });
}

/**
 * "You've used your 3 free interpretations." Free credits are lifetime and
 * never refresh, so this is once per user, ever (dedupe_key "once").
 */
export async function sendCreditsExhaustedEmail(
  userId: string,
  to: string,
): Promise<void> {
  await sendLifecycleEmail({
    userId,
    to,
    type: "credits_exhausted",
    dedupeKey: "once",
    content: creditsExhaustedEmail(),
  });
}

/**
 * Card-failed notice. Deduped per Stripe invoice — Stripe emits
 * invoice.payment_failed on every retry attempt, but one email per invoice
 * is enough.
 */
export async function sendPaymentFailedEmail(
  userId: string,
  to: string,
  opts: { invoiceId: string },
): Promise<void> {
  await sendLifecycleEmail({
    userId,
    to,
    type: "payment_failed",
    dedupeKey: opts.invoiceId,
    content: paymentFailedEmail(),
  });
}

/**
 * Cancellation confirmation with the access-until date. Deduped per
 * subscription period via the caller-supplied key
 * (`<subscription_id>:<period_end_epoch>`), so webhook replays and later
 * mid-period subscription updates don't re-send.
 */
export async function sendCancellationConfirmedEmail(
  userId: string,
  to: string,
  opts: { accessUntil: Date | null; dedupeKey: string },
): Promise<void> {
  await sendLifecycleEmail({
    userId,
    to,
    type: "cancellation_confirmed",
    dedupeKey: opts.dedupeKey,
    content: cancellationConfirmedEmail({ accessUntil: opts.accessUntil }),
  });
}
