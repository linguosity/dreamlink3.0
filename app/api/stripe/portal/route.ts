import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getStripe } from "@/lib/stripe";

/**
 * POST /api/stripe/portal
 * Creates a Stripe Customer Portal session so users can manage
 * their own subscription (upgrade, downgrade, cancel, update payment method).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's Stripe subscription to find the customer
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!subscription?.stripe_subscription_id && !subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    const stripe = getStripe();

    // Founder's Lifetime rows have no subscription, only a customer — the
    // portal still works for them (invoice download, card on file).
    let customerId = subscription.stripe_customer_id as string | null;
    if (!customerId && subscription.stripe_subscription_id) {
      // Retrieve the subscription to get the customer ID
      const stripeSub = await stripe.subscriptions.retrieve(
        subscription.stripe_subscription_id
      );
      customerId =
        typeof stripeSub.customer === "string"
          ? stripeSub.customer
          : stripeSub.customer.id;
    }
    if (!customerId) {
      return NextResponse.json(
        { error: "No billing account found" },
        { status: 404 }
      );
    }

    // VERCEL_URL is the deployment host (…vercel.app), not dreamriver.io —
    // the portal must return customers to the domain their session lives on.
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? "https://dreamriver.io"
        : "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Portal session creation failed";
    console.error("Stripe portal error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
