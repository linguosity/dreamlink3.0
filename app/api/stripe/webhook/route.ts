import { NextRequest, NextResponse } from "next/server";
import { getStripe, stripePriceToPlan } from "@/lib/stripe";
import { getAdminClient } from "@/utils/supabase/admin";
import Stripe from "stripe";

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
        const firstItem = subscription.items.data[0];
        const priceId = firstItem?.price?.id || "";
        const plan = stripePriceToPlan(priceId);
        // In API version 2026-02-25.clover, period fields moved from
        // Subscription to SubscriptionItem.
        const periodEnd = firstItem?.current_period_end;

        await admin.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            plan,
            current_period_end: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const firstItem = subscription.items.data[0];
        const priceId = firstItem?.price?.id || "";
        const plan = stripePriceToPlan(priceId);
        // In API version 2026-02-25.clover, period fields moved from
        // Subscription to SubscriptionItem.
        const periodEnd = firstItem?.current_period_end;

        await admin
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
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await admin
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        // In API version 2026-02-25.clover, Invoice.subscription was replaced
        // by Invoice.parent.subscription_details.subscription.
        const subscriptionRef =
          invoice.parent?.subscription_details?.subscription;
        if (!subscriptionRef) break;

        // Record payment
        await admin.from("payments").insert({
          user_id: null, // Will be looked up via subscription
          stripe_invoice_id: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: "succeeded",
          created_at: new Date().toISOString(),
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        await admin.from("payments").insert({
          user_id: null,
          stripe_invoice_id: invoice.id,
          amount: invoice.amount_due,
          currency: invoice.currency,
          status: "failed",
          created_at: new Date().toISOString(),
        });
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
