import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getStripe, PLAN_PRICES } from "@/lib/stripe";
import { captureServerEvent } from "@/lib/analytics-server";
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

    // ---- Pre-launch gate (2026-07-22) --------------------------------------
    // Until Stripe passes end-to-end testing, only admins can start a live
    // checkout. Flip by setting ALLOW_PUBLIC_CHECKOUT=true in Vercel — no
    // code change needed at launch. Server-side on purpose: a UI-only
    // disable could be bypassed with a direct POST.
    if (process.env.ALLOW_PUBLIC_CHECKOUT !== "true") {
      const { data: profile } = await supabase
        .from("profile")
        .select("is_admin")
        .eq("user_id", user.id)
        .single();
      if (!(profile as { is_admin?: boolean } | null)?.is_admin) {
        return NextResponse.json(
          { error: "Subscriptions are opening soon — thanks for your patience!" },
          { status: 403 }
        );
      }
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
    // VERCEL_URL is the deployment host (…vercel.app), NOT the custom domain.
    // Success/cancel must return to dreamriver.io or the customer lands on a
    // domain where their session cookies don't exist.
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? "https://dreamriver.io"
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

    // First-party operational analytics, captured regardless of cookie
    // consent — NOTE(Justin): confirm this stance in the privacy policy
    // (see lib/analytics-server.ts). priceKey is e.g. "visionary_monthly".
    const [plan, interval] = String(priceKey).split("_");
    // after(), not await: the Stripe session already exists by this point and
    // the user is waiting to be sent to it. An analytics write should not hold
    // a payment redirect.
    after(() =>
      captureServerEvent(user.id, "checkout_started", {
        price_key: String(priceKey),
        plan: plan ?? null,
        interval: interval ?? null,
      }),
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Checkout creation failed";
    console.error("Stripe checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
