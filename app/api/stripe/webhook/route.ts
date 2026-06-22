import { NextRequest, NextResponse } from "next/server";
import { getStripe, stripePriceToPlan } from "@/lib/stripe";
import { getAdminClient } from "@/utils/supabase/admin";
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
        if (!userId || !session.subscription) break;

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
        break;
      }

      default:
        // Unhandled event type — just acknowledge it
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
