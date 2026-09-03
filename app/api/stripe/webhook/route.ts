import { NextRequest, NextResponse } from "next/server";
import { getStripe, stripePriceToPlan } from "@/lib/stripe";
import { LIFETIME_GRANTS_PLAN } from "@/lib/tierConfig";
import { getAdminClient } from "@/utils/supabase/admin";
import { captureServerEvent } from "@/lib/analytics-server";
import {
  getUserEmailById,
  sendPaymentFailedEmail,
  sendCancellationConfirmedEmail,
} from "@/lib/emails/send";
import Stripe from "stripe";

// Stripe 2026-02-25 moved `current_period_end` off the top-level Subscription
// onto each item. Older payloads still carry it at the top; check both.
function readPeriodEnd(subscription: Stripe.Subscription): number | null {
  const legacy = (subscription as unknown as { current_period_end?: number })
    .current_period_end;
  if (typeof legacy === "number") return legacy;
  const item = subscription.items.data[0] as unknown as {
    current_period_end?: number;
  };
  return typeof item?.current_period_end === "number"
    ? item.current_period_end
    : null;
}

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events to sync subscription state to Supabase.
 *
 * SETUP: In Stripe Dashboard → Developers → Webhooks, add endpoint:
 * https://your-domain.com/api/stripe/webhook
 *
 * Events to subscribe to:
 * - checkout.session.completed
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = getAdminClient();

  // Idempotency (Bug 4): Stripe re-delivers events. Claim the event id before
  // doing any work; if we've seen it, acknowledge and bail so a replayed
  // invoice.payment_succeeded can't insert a duplicate payment row.
  const { error: claimError } = await admin
    .from("stripe_events")
    .insert({ event_id: event.id, type: event.type });
  if (claimError) {
    if ((claimError as { code?: string }).code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Can't guarantee idempotency — let Stripe retry rather than risk a dupe.
    console.error("Stripe event claim failed:", claimError.message);
    return NextResponse.json({ error: "Event claim failed" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (!userId) break;

        // ---- Founder's Lifetime (one-time, mode: "payment") ----------------
        // No Subscription object exists, so grant access straight from the
        // session: an ACTIVE subscriptions row with the lifetime plan and a
        // NULL stripe_subscription_id (see isLifetimeRow in lib/tierConfig).
        // No invoice.payment_succeeded follows a one-time Checkout payment,
        // so the payments row is written here too.
        if (session.mode === "payment") {
          if (session.metadata?.purchase !== "lifetime") break;
          // Async payment methods can complete with payment_status "unpaid";
          // we only accept cards, but never grant on an unpaid session.
          if (session.payment_status !== "paid") break;

          const customerId =
            typeof session.customer === "string"
              ? session.customer
              : session.customer?.id ?? null;
          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? session.id;

          const { error: lifetimeError } = await admin
            .from("subscriptions")
            .upsert(
              {
                user_id: userId,
                stripe_subscription_id: null,
                stripe_customer_id: customerId,
                status: "active",
                plan: LIFETIME_GRANTS_PLAN,
                current_period_end: null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" }
            );
          if (lifetimeError)
            throw new Error(`lifetime subscriptions upsert: ${lifetimeError.message}`);

          const { error: payError } = await admin.from("payments").insert({
            user_id: userId,
            stripe_payment_id: paymentIntentId,
            amount: session.amount_total ?? 0,
            currency: session.currency ?? "usd",
            status: "succeeded",
            created_at: new Date().toISOString(),
          });
          if (payError) throw new Error(`payment insert (lifetime): ${payError.message}`);

          await captureServerEvent(userId, "subscribed", {
            plan: LIFETIME_GRANTS_PLAN,
            interval: "lifetime",
          });
          break;
        }

        if (!session.subscription) break;

        const stripe = getStripe();
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const priceId = subscription.items.data[0]?.price?.id || "";
        const plan = stripePriceToPlan(priceId);
        // Stripe 2026-02-25 moved `current_period_end` off the top-level
        // Subscription object onto individual subscription items. Read the
        // first item's window; fall back to the (still-present on older
        // payloads) top-level field for forward/backward compatibility.
        const periodEnd = readPeriodEnd(subscription);

        const { error: upsertError } = await admin.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string, // Bug 5
            status: subscription.status,
            plan,
            current_period_end: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
        if (upsertError) throw new Error(`subscriptions upsert: ${upsertError.message}`);

        // First-party operational analytics, captured regardless of cookie
        // consent — NOTE(Justin): confirm this stance in the privacy policy
        // (see lib/analytics-server.ts). Idempotent because duplicate events
        // are rejected by the stripe_events claim above.
        await captureServerEvent(userId, "subscribed", {
          plan,
          interval: subscription.items.data[0]?.price?.recurring?.interval ?? null,
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price?.id || "";
        const plan = stripePriceToPlan(priceId);
        const periodEnd = readPeriodEnd(subscription);

        const { error: updateError } = await admin
          .from("subscriptions")
          .update({
            status: subscription.status,
            plan,
            current_period_end: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
        if (updateError) throw new Error(`subscription update: ${updateError.message}`);

        // Lifecycle email — the app's only cancellation paths (billing portal,
        // account deletion) schedule cancel_at_period_end, which arrives as
        // this event. Deduped per (subscription, period) via notification_log
        // (`<sub>:<period_end>`): replays and later same-period updates skip,
        // and the eventual customer.subscription.deleted reuses the same key
        // so it can't double-send. Email failures never fail the event.
        if (subscription.cancel_at_period_end) {
          try {
            const { data: subRow } = await admin
              .from("subscriptions")
              .select("user_id")
              .eq("stripe_subscription_id", subscription.id)
              .maybeSingle();
            if (subRow?.user_id) {
              const email = await getUserEmailById(subRow.user_id);
              if (email) {
                await sendCancellationConfirmedEmail(subRow.user_id, email, {
                  accessUntil: periodEnd ? new Date(periodEnd * 1000) : null,
                  dedupeKey: `${subscription.id}:${periodEnd ?? "unknown"}`,
                });
              }
            }
          } catch (err) {
            console.error("cancellation_confirmed email failed (non-fatal):", err);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const { error: deleteError } = await admin
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
        if (deleteError) throw new Error(`subscription cancel: ${deleteError.message}`);

        // Lifecycle email — covers cancellations that never passed through a
        // cancel_at_period_end update (e.g. immediate cancellation from the
        // Stripe dashboard). For portal/account-delete cancellations the
        // `<sub>:<period_end>` key was already claimed when the scheduled
        // cancellation was confirmed above, so this dedupes to nothing.
        try {
          const { data: subRow } = await admin
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_subscription_id", subscription.id)
            .maybeSingle();
          if (subRow?.user_id) {
            const email = await getUserEmailById(subRow.user_id);
            if (email) {
              const periodEnd = readPeriodEnd(subscription);
              const endedAt =
                typeof subscription.ended_at === "number"
                  ? subscription.ended_at
                  : null;
              const accessUntilEpoch = endedAt ?? periodEnd;
              await sendCancellationConfirmedEmail(subRow.user_id, email, {
                accessUntil: accessUntilEpoch
                  ? new Date(accessUntilEpoch * 1000)
                  : null,
                dedupeKey: `${subscription.id}:${periodEnd ?? "unknown"}`,
              });
            }
          }
        } catch (err) {
          console.error("cancellation_confirmed email failed (non-fatal):", err);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        // Stripe 2026-02-25 removed `subscription` from the top-level Invoice
        // shape; the link now lives on parent.subscription_details. Read both
        // so we tolerate either payload version.
        const rawSub =
          (invoice as unknown as { subscription?: string | { id: string } | null }).subscription ??
          invoice.parent?.subscription_details?.subscription ??
          null;
        const subscriptionId = typeof rawSub === "string" ? rawSub : rawSub?.id ?? null;
        if (!subscriptionId) break;

        // Bug 3: attribute the payment to a user via the subscription row.
        const { data: subRow } = await admin
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        // Record payment (Bug 2: column is stripe_payment_id, not _invoice_id).
        const { error: payError } = await admin.from("payments").insert({
          user_id: subRow?.user_id ?? null,
          stripe_payment_id: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: "succeeded",
          created_at: new Date().toISOString(),
        });
        if (payError) throw new Error(`payment insert (succeeded): ${payError.message}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const rawSub =
          (invoice as unknown as { subscription?: string | { id: string } | null }).subscription ??
          invoice.parent?.subscription_details?.subscription ??
          null;
        const subscriptionId = typeof rawSub === "string" ? rawSub : rawSub?.id ?? null;

        const { data: subRow } = subscriptionId
          ? await admin
              .from("subscriptions")
              .select("user_id")
              .eq("stripe_subscription_id", subscriptionId)
              .maybeSingle()
          : { data: null };

        const { error: payError } = await admin.from("payments").insert({
          user_id: subRow?.user_id ?? null,
          stripe_payment_id: invoice.id,
          amount: invoice.amount_due,
          currency: invoice.currency,
          status: "failed",
          created_at: new Date().toISOString(),
        });
        if (payError) throw new Error(`payment insert (failed): ${payError.message}`);

        // Lifecycle email — Stripe re-fires invoice.payment_failed on every
        // Smart Retry attempt; notification_log dedupes on the invoice id so
        // the user hears about a failing card once per invoice, not once per
        // retry. Email failures never fail the event.
        if (subRow?.user_id && invoice.id) {
          try {
            const email = await getUserEmailById(subRow.user_id);
            if (email) {
              await sendPaymentFailedEmail(subRow.user_id, email, {
                invoiceId: invoice.id,
              });
            }
          } catch (err) {
            console.error("payment_failed email failed (non-fatal):", err);
          }
        }
        break;
      }

      default:
        // Unhandled event type — just acknowledge it
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    // Release the claim (best-effort) so Stripe's retry can actually
    // re-attempt the work instead of being short-circuited by the duplicate
    // check above. Mirrors the claim-release pattern in lib/emails/send.ts.
    try {
      await admin.from("stripe_events").delete().eq("event_id", event.id);
    } catch {
      /* swallow — never propagate; at-most-once is the fallback */
    }
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
