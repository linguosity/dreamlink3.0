import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  getStripe,
  PLAN_PRICES,
  LIFETIME_PRICE_KEY,
  LIFETIME_PRICE_ID,
} from "@/lib/stripe";
import { isLifetimeRow } from "@/lib/tierConfig";
import { captureServerEvent } from "@/lib/analytics-server";
import type Stripe from "stripe";

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout session for a subscription OR the one-time
 * Founder's Lifetime purchase.
 *
 * Body: { priceKey: "visionary_monthly" | "visionary_yearly" | "prophet_monthly"
 *                 | "prophet_yearly" | "lifetime" }
 *
 * Stripe Tax: every session is created with automatic_tax enabled, for both
 * subscription and payment modes. Stripe works out the jurisdiction from the
 * billing address it collects at checkout, and the tax code comes from the
 * Dashboard preset (SaaS – Personal Use). Never hardcode a rate here.
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
    const isLifetime = priceKey === LIFETIME_PRICE_KEY;
    const priceId = isLifetime ? LIFETIME_PRICE_ID : PLAN_PRICES[priceKey];

    if (!priceId || priceId === "price_REPLACE_ME") {
      return NextResponse.json(
        {
          error:
            "Invalid plan or Stripe prices not configured. Check PLAN_PRICES / STRIPE_PRICE_LIFETIME in lib/stripe.ts.",
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
        {
          error: isLifetimeRow(existing)
            ? "You already have Founder's Lifetime access — nothing more to buy."
            : "You already have an active subscription. Manage it from Settings.",
        },
        { status: 409 }
      );
    }

    const sessionParams: Record<string, unknown> = {
      mode: isLifetime ? "payment" : "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/settings?checkout=success`,
      cancel_url: `${baseUrl}/pricing?checkout=cancelled`,
      // `purchase` is what the webhook keys on to tell a lifetime payment
      // apart from any other future one-time charge.
      metadata: { user_id: user.id, purchase: isLifetime ? "lifetime" : "subscription" },
      ...(isLifetime
        ? {
            // Payment mode has no invoice by default — turn one on so the
            // founder gets a proper tax invoice, not just a card receipt.
            invoice_creation: { enabled: true },
          }
        : {
            // Carry the user id on the subscription object too, not just the session.
            subscription_data: { metadata: { user_id: user.id } },
          }),
      // Stripe Tax computes the rate from the customer's billing location.
      // Rates live in the Stripe dashboard (product tax codes + registrations),
      // never hardcoded here — a literal rate goes stale the moment a
      // jurisdiction changes and silently under-collects.
      automatic_tax: { enabled: true },
      // Reuse the Stripe customer when we have one; otherwise key to email.
      ...(existing?.stripe_customer_id
        ? {
            customer: existing.stripe_customer_id,
            // Without this, the address collected at checkout is discarded and
            // automatic_tax falls back to whatever is already on the customer
            // record — which for an existing customer is often nothing.
            customer_update: { address: "auto" },
          }
        : {
            customer_email: user.email,
            // Payment mode only creates a Customer "if required"; we always
            // want one so the address Stripe Tax used stays on record and the
            // founder can open the billing portal for their invoice. (Stripe
            // rejects customer_creation alongside an explicit `customer`, and
            // it is not accepted in subscription mode, hence the guard.)
            ...(isLifetime ? { customer_creation: "always" } : {}),
          }),
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
