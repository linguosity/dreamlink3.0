"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Check, ArrowLeft, Sparkles } from "lucide-react";
import AuthNavigation from "@/components/AuthNavigation";
import { toast } from "sonner";

type BillingPeriod = "monthly" | "yearly";

interface Plan {
  name: string;
  monthly: string;
  yearly: string;
  /** Numeric prices for accurate savings/effective-monthly math (omit for free). */
  monthlyNum?: number;
  yearlyNum?: number;
  description: string;
  credits: string;
  features: string[];
  cta: string;
  /** Stripe priceKey base; null = free tier or not-yet-available. */
  priceBase: "visionary" | "prophet" | null;
  popular: boolean;
  comingSoon?: boolean;
  color: string;
}

const plans: Plan[] = [
  {
    name: "Discovery",
    monthly: "Free",
    yearly: "Free",
    description: "Begin your spiritual journey with essential dream insights",
    credits: "3 to start",
    features: [
      "3 AI dream analyses when you sign up",
      "Dream art + biblical interpretation",
      "Standard reading levels",
      "Dream journal storage & search",
      "Dream sharing",
    ],
    cta: "Start Free",
    priceBase: null,
    popular: false,
    color: "bg-muted",
  },
  {
    name: "Insight",
    monthly: "$12.99",
    yearly: "$99.99",
    monthlyNum: 12.99,
    yearlyNum: 99.99,
    description: "Unlock deeper spiritual insights with enhanced AI analysis",
    credits: "30 / month",
    features: [
      "30 AI dream analyses per month",
      "Deeper analysis + all reading levels",
      "Five image styles",
      "Dream sharing",
    ],
    cta: "Upgrade to Insight",
    priceBase: "visionary",
    popular: true,
    color: "bg-primary/5 dark:bg-primary/10 border-primary/20",
  },
  {
    name: "Journey",
    monthly: "$19.99",
    yearly: "$179.99",
    monthlyNum: 19.99,
    yearlyNum: 179.99,
    description: "Unlimited access to divine wisdom and premium features",
    credits: "Unlimited",
    features: [
      "Unlimited AI dream analyses",
      "Deepest theological interpretations",
      "All eight image styles",
      "Dream sharing",
      "Early access to new features",
      "API access",
      "Priority support",
    ],
    cta: "Coming Soon",
    priceBase: "prophet",
    popular: false,
    comingSoon: true,
    color: "bg-secondary",
  },
];

// Founder's Lifetime — one payment, Insight tier forever. The charge itself
// comes from the Stripe price behind STRIPE_PRICE_LIFETIME; this copy must
// match it. What the tier unlocks is LIFETIME_GRANTS_PLAN in lib/tierConfig.
const LIFETIME = {
  name: "Founder's Lifetime",
  price: "$399",
  priceKey: "lifetime",
  description:
    "Pay once, keep Insight for life. No renewals, no price increases — ever.",
  features: [
    "Everything in Insight, forever",
    "30 AI dream analyses every month",
    "One payment — never billed again",
    "Directly supports DreamRiver's launch",
  ],
  cta: "Become a Founder",
};

// Yearly savings vs. paying month-to-month, rounded to a whole percent.
function yearlySavingsPct(monthly: number, yearly: number): number {
  if (!monthly || !yearly) return 0;
  return Math.round((1 - yearly / (monthly * 12)) * 100);
}

// Highest savings across paid plans — used for the "save up to X%" toggle badge.
const MAX_SAVINGS = Math.max(
  0,
  ...plans
    .filter((p) => p.monthlyNum && p.yearlyNum)
    .map((p) => yearlySavingsPct(p.monthlyNum as number, p.yearlyNum as number)),
);

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function startCheckout(plan: Plan) {
    if (!plan.priceBase) return;
    await startCheckoutWithKey(`${plan.priceBase}_${billing}`, plan.name);
  }

  async function startCheckoutWithKey(priceKey: string, label: string) {
    setLoadingPlan(label);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceKey }),
      });
      if (res.status === 401) {
        // Not signed in — send them to create an account first.
        window.location.href = "/sign-up";
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not start checkout");
      }
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start checkout");
      setLoadingPlan(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center bg-fixed opacity-30 blur-[3px]"
          style={{ backgroundImage: "url('/images/background.jpg')" }}
        />
        <div className="absolute inset-0 bg-background/80" />
      </div>

      {/* py-8 (was 16) + tightened header stack below: goal is the billing
          toggle AND the top of all three cards visible without scrolling. */}
      <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/sign-up"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sign Up
            </Link>
            <div className="flex-1 max-w-md mx-4">
              <AuthNavigation variant="compact" />
            </div>
            <div className="w-20" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-foreground">
            Unlock Divine Insights
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Choose the tier that fits your journey — each plan goes deeper into
            biblical dream interpretation.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              billing === "monthly"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("yearly")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              billing === "yearly"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly <span className="text-xs opacity-80">· save up to {MAX_SAVINGS}%</span>
          </button>
        </div>

        {/* Pricing Cards */}
        {/* grid-cols-1 matters: without it the mobile column is auto-sized
            (min-content), and the nowrap CTA buttons force the cards wider
            than the phone viewport. minmax(0,1fr) lets them shrink. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const price = billing === "monthly" ? plan.monthly : plan.yearly;
            const isFree = plan.priceBase === null;
            const period = isFree ? "forever" : billing === "monthly" ? "month" : "year";
            return (
              <Card
                key={plan.name}
                className={`relative p-6 transition-all duration-300 hover:shadow-2xl hover:scale-105 ${plan.color} ${
                  plan.popular ? "ring-2 ring-primary shadow-xl transform scale-105" : "hover:shadow-lg"
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1">
                    Most Popular
                  </Badge>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {plan.description}
                  </p>

                  <div className="mb-2">
                    <span className="text-4xl font-bold">{price}</span>
                    {price !== "Free" && (
                      <span className="text-muted-foreground">/{period}</span>
                    )}
                  </div>
                  {billing === "yearly" && plan.monthlyNum && plan.yearlyNum && (
                    <p className="text-xs text-muted-foreground mb-4">
                      ≈ ${(plan.yearlyNum / 12).toFixed(2)}/mo · save{" "}
                      {yearlySavingsPct(plan.monthlyNum, plan.yearlyNum)}%
                    </p>
                  )}

                  <div className="mt-4 mb-2 px-4 py-2.5 bg-background/50 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-0.5">
                      {isFree ? "Dream Analyses" : "Monthly Dream Analyses"}
                    </p>
                    <p className="text-xl font-bold text-primary">{plan.credits}</p>
                  </div>
                </div>

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-base leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isFree ? (
                  <Link href="/sign-up" className="block">
                    <Button
                      className="w-full py-3 text-base font-medium whitespace-normal h-auto bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                      variant="outline"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    onClick={() => startCheckout(plan)}
                    disabled={plan.comingSoon || loadingPlan === plan.name}
                    className="w-full py-3 text-base font-medium whitespace-normal h-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl"
                  >
                    {plan.comingSoon
                      ? "Coming Soon"
                      : loadingPlan === plan.name
                        ? "Redirecting…"
                        : plan.cta}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>

        {/* Founder's Lifetime */}
        <div className="mt-12 max-w-6xl mx-auto">
          <Card className="relative overflow-hidden p-6 md:p-8 border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background">
            <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="text-2xl font-bold">{LIFETIME.name}</h3>
                  <Badge variant="outline" className="border-primary/40 text-primary">
                    Limited
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {LIFETIME.description}
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {LIFETIME.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
                      <span className="text-sm leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="md:w-56 text-center md:text-right">
                <div className="mb-1">
                  <span className="text-4xl font-bold">{LIFETIME.price}</span>
                  <span className="text-muted-foreground"> once</span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Plus applicable tax · ≈ 4 years of Insight
                </p>
                <Button
                  onClick={() => startCheckoutWithKey(LIFETIME.priceKey, LIFETIME.name)}
                  disabled={loadingPlan === LIFETIME.name}
                  className="w-full py-3 text-base font-medium whitespace-normal h-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl"
                >
                  {loadingPlan === LIFETIME.name ? "Redirecting…" : LIFETIME.cta}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h3>
          <div className="space-y-6">
            <div className="p-6 bg-muted/20 rounded-lg">
              <h4 className="font-semibold mb-2">Can I change my plan anytime?</h4>
              <p className="text-base text-muted-foreground">
                Yes — upgrade, downgrade, or cancel anytime from Settings. Changes take effect at
                the next billing cycle.
              </p>
            </div>
            <div className="p-6 bg-muted/20 rounded-lg">
              <h4 className="font-semibold mb-2">What happens to unused credits?</h4>
              <p className="text-base text-muted-foreground">
                Your monthly credits reset at the start of each billing month — unused credits do
                not roll over. Pick the plan that matches your regular journaling.
              </p>
            </div>
            <div className="p-6 bg-muted/20 rounded-lg">
              <h4 className="font-semibold mb-2">Is the free plan really free?</h4>
              <p className="text-base text-muted-foreground">
                Yes — the Discovery plan is free and includes 3 dream interpretations to start, with no
                credit card required. Your journal stays free forever; upgrade anytime for more interpretations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
