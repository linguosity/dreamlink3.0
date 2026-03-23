/**
 * Stripe client initialization and helper utilities.
 *
 * SETUP REQUIRED:
 * 1. Run: npm install stripe
 * 2. Add to .env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
 * 3. Create products/prices in Stripe Dashboard matching the plan IDs below
 * 4. Set up webhook in Stripe Dashboard pointing to: https://your-domain.com/api/stripe/webhook
 *    Events to listen for: checkout.session.completed, customer.subscription.updated,
 *    customer.subscription.deleted, invoice.payment_succeeded, invoice.payment_failed
 */

import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to your environment variables."
    );
  }

  stripeInstance = new Stripe(key, {
    apiVersion: "2024-12-18.acacia",
    typescript: true,
  });

  return stripeInstance;
}

/**
 * Map your Dreamlink subscription plans to Stripe Price IDs.
 * Update these after creating products in the Stripe Dashboard.
 */
export const PLAN_PRICES: Record<string, string> = {
  visionary_monthly: process.env.STRIPE_PRICE_VISIONARY_MONTHLY || "price_REPLACE_ME",
  visionary_yearly: process.env.STRIPE_PRICE_VISIONARY_YEARLY || "price_REPLACE_ME",
  prophet_monthly: process.env.STRIPE_PRICE_PROPHET_MONTHLY || "price_REPLACE_ME",
  prophet_yearly: process.env.STRIPE_PRICE_PROPHET_YEARLY || "price_REPLACE_ME",
};

/**
 * Map Stripe price IDs back to Dreamlink plan names.
 */
export function stripePriceToPlan(priceId: string): string {
  for (const [plan, id] of Object.entries(PLAN_PRICES)) {
    if (id === priceId) return plan.split("_")[0]; // "visionary" or "prophet"
  }
  return "free";
}
