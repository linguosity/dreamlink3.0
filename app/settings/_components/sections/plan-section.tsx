"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { SubscriptionPlan } from "@/schema/profile";
import { SectionHead } from "../section-head";

const PLANS: Array<{
  id: SubscriptionPlan;
  name: string;
  price: string;
  per: string;
  features: string[];
  cta: string;
  featured?: boolean;
}> = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    per: "forever",
    features: [
      "3 analyses / month",
      "Shallow analysis",
      "2 free image styles",
      "Limited scripture references",
    ],
    cta: "Current plan",
  },
  {
    id: "visionary",
    name: "Visionary",
    price: "$12.99",
    per: "per month · $99.99/yr",
    features: [
      "Everything in Free",
      "50 analyses / month",
      "Deep analysis + 3 image styles",
      "Unlimited scripture references",
      "Export & sharing",
    ],
    cta: "Upgrade",
    featured: true,
  },
  {
    id: "prophet",
    name: "Prophet",
    price: "$29",
    per: "per month",
    features: [
      "Everything in Visionary",
      "Unlimited analyses",
      "Profound analysis + all styles",
      "API access",
      "Priority support",
    ],
    cta: "Coming soon",
  },
];

export function PlanSection({ plan }: { plan: SubscriptionPlan }) {
  const [portalLoading, setPortalLoading] = useState(false);

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not open billing portal");
      }
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open billing portal");
      setPortalLoading(false);
    }
  }

  return (
    <>
      <SectionHead
        eyebrow="Subscription"
        title="Plan & Billing"
        desc="Your access tier shapes analysis depth and the image styles available to you."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {PLANS.map((p) => {
          const isCurrent = p.id === plan;
          return (
            <div
              key={p.id}
              className={`relative rounded-[var(--radius-lg)] p-5 shadow-sm border ${
                p.featured
                  ? "border-primary border-2 bg-gradient-to-b from-primary/10 to-card"
                  : "border-border bg-card"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-2.5 left-4 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
                  Most popular
                </span>
              )}
              <div className="flex items-center justify-between">
                <div className="font-serif text-[22px] capitalize">{p.name}</div>
                {isCurrent && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    Current
                  </span>
                )}
              </div>
              <div className="mt-2.5 mb-3.5">
                <span className="font-serif text-4xl">{p.price}</span>
                <span className="text-[13px] text-muted-foreground ml-1.5">
                  {p.per}
                </span>
              </div>
              <ul className="flex flex-col gap-2 mb-4">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-[13px]">
                    <Check className="w-3.5 h-3.5 text-primary mt-1 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <Button
                  variant="outline"
                  className="w-full justify-center"
                  disabled
                >
                  Current plan
                </Button>
              ) : (
                <Link href="/pricing" className="block">
                  <Button className="w-full justify-center">{p.cta}</Button>
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-[var(--radius-lg)] border bg-card p-5 mt-5 shadow-sm">
        <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-3">
          Billing
        </div>
        {plan === "free" ? (
          <div className="text-[13px] text-muted-foreground py-5 text-center">
            No charges yet — you&rsquo;re on the Free plan.
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-[13px] text-muted-foreground">
              Update your card, view invoices, or cancel in the Stripe customer portal.
            </p>
            <Button
              variant="outline"
              onClick={openBillingPortal}
              disabled={portalLoading}
            >
              {portalLoading ? "Opening…" : "Manage billing"}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
