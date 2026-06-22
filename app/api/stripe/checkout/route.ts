import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getStripe, PLAN_PRICES } from "@/lib/stripe";
import type Stripe from "stripe";

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout session for subscription purchase.
 *
 * Body: { priceKey: "visionary_monthly" | "visionary_yearly" | "prophet_monthly" | "prophet_yearly" }
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

    const { priceKey } = await request.json();
    const priceId = PLAN_PRICES[priceKey];

    if (!priceId || priceId === "price_REPLACE_ME") {
      return NextResponse.json(
        {
          error:
            "Invalid plan or Stripe prices not configured. Check PLAN_PRICES in lib/stripe.ts.",
        },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    // Reuse the existing Stripe customer and block double-subscribing (Bug 5).
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("status, stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing?.status === "active") {
      return NextResponse.json(
        { error: "You already have an active subscription. Manage it from Settings." },
        { status: 409 }
      );
    }

    const sessionParams: Record<string, unknown> = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/settings?checkout=success`,
      cancel_url: `${baseUrl}/pricing?checkout=cancelled`,
      metadata: { user_id: user.id },
      // Carry the user id on the subscription object too, not just the session.
      subscription_data: { metadata: { user_id: user.id } },
      // Reuse the Stripe customer when we have one; otherwise key to email.
      ...(existing?.stripe_customer_id
        ? { customer: existing.stripe_customer_id }
        : { customer_email: user.email }),
    };

    const session = await stripe.checkout.sessions.create(
      sessionParams as Stripe.Checkout.SessionCreateParams
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Checkout creation failed";
    console.error("Stripe checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
