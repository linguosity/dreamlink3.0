"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Check, ArrowLeft } from "lucide-react";
import AuthNavigation from "@/components/AuthNavigation";
import { toast } from "sonner";

type BillingPeriod = "monthly" | "yearly";

interface Plan {
  name: string;
  monthly: string;
  yearly: string;
  /** Note shown under the price on the yearly toggle (e.g. effective /mo). */
  yearlyNote?: string;
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
    name: "Seeker",
    monthly: "Free",
    yearly: "Free",
    description: "Begin your spiritual journey with essential dream insights",
    credits: "3 / month",
    features: [
      "3 AI dream analyses per month",
      "Dream art + biblical interpretation",
      "Standard reading levels",
      "Dream journal storage & search",
    ],
    cta: "Start Free",
    priceBase: null,
    popular: false,
    color: "bg-gray-50 dark:bg-gray-900",
  },
  {
    name: "Visionary",
    monthly: "$12.99",
    yearly: "$99.99",
    yearlyNote: "$8.33/mo, billed yearly",
    description: "Unlock deeper spiritual insights with enhanced AI analysis",
    credits: "50 / month",
    features: [
      "50 AI dream analyses per month",
      "Deeper analysis + all reading levels",
      "Five image styles",
      "Export your dream journal",
      "Dream sharing",
      "Priority processing",
    ],
    cta: "Upgrade to Visionary",
    priceBase: "visionary",
    popular: true,
    color: "bg-primary/5 dark:bg-primary/10 border-primary/20",
  },
  {
    name: "Prophet",
    monthly: "$29",
    yearly: "$290",
    description: "Unlimited access to divine wisdom and premium features",
    credits: "Unlimited",
    features: [
      "Unlimited AI dream analyses",
      "Deepest theological interpretations",
      "All eight image styles",
      "Early access to new features",
      "API access",
      "Priority support",
    ],
    cta: "Coming Soon",
    priceBase: "prophet",
    popular: false,
    comingSoon: true,
    color: "bg-gradient-to-br from-accent/40 to-secondary",
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function startCheckout(plan: Plan) {
    if (!plan.priceBase) return;
    const priceKey = `${plan.priceBase}_${billing}`;
    setLoadingPlan(plan.name);
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

      <div className="container max-w-7xl mx-auto px-4 py-16">
        {/* Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
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
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4 text-xs font-medium">
            Choose Your Path
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Unlock Divine Insights
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Choose the subscription tier that aligns with your spiritual journey.
            Each plan offers deeper access to AI-powered biblical dream interpretation.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
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
            Yearly <span className="text-xs opacity-80">· save ~36%</span>
          </button>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const price = billing === "monthly" ? plan.monthly : plan.yearly;
            const isFree = plan.priceBase === null;
            const period = isFree ? "forever" : billing === "monthly" ? "month" : "year";
            return (
              <Card
                key={plan.name}
                className={`relative p-8 transition-all duration-300 hover:shadow-2xl hover:scale-105 ${plan.color} ${
                  plan.popular ? "ring-2 ring-primary shadow-xl transform scale-105" : "hover:shadow-lg"
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1">
                    Most Popular
                  </Badge>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    {plan.description}
                  </p>

                  <div className="mb-2">
                    <span className="text-4xl font-bold">{price}</span>
                    {price !== "Free" && (
                      <span className="text-muted-foreground">/{period}</span>
                    )}
                  </div>
                  {billing === "yearly" && plan.yearlyNote && (
                    <p className="text-xs text-muted-foreground mb-4">{plan.yearlyNote}</p>
                  )}

                  <div className="mt-6 mb-6 p-4 bg-background/50 rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Monthly Dream Analyses
                    </p>
                    <p className="text-2xl font-bold text-primary">{plan.credits}</p>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isFree ? (
                  <Link href="/sign-up" className="block">
                    <Button
                      className="w-full py-3 text-base font-medium bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                      variant="outline"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    onClick={() => startCheckout(plan)}
                    disabled={plan.comingSoon || loadingPlan === plan.name}
                    className="w-full py-3 text-base font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl"
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

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h3>
          <div className="space-y-6">
            <div className="p-6 bg-muted/20 rounded-lg">
              <h4 className="font-semibold mb-2">Can I change my plan anytime?</h4>
              <p className="text-sm text-muted-foreground">
                Yes — upgrade, downgrade, or cancel anytime from Settings. Changes take effect at
                the next billing cycle.
              </p>
            </div>
            <div className="p-6 bg-muted/20 rounded-lg">
              <h4 className="font-semibold mb-2">What happens to unused credits?</h4>
              <p className="text-sm text-muted-foreground">
                Credits reset at the start of each month and don't roll over. Pick the plan that
                matches your regular journaling.
              </p>
            </div>
            <div className="p-6 bg-muted/20 rounded-lg">
              <h4 className="font-semibold mb-2">Is the free plan really free?</h4>
              <p className="text-sm text-muted-foreground">
                Yes — the Seeker plan is permanently free with 3 dream analyses every month. Upgrade
                anytime for more.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
