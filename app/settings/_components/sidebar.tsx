"use client";

import Link from "next/link";
import {
  CircleUserRound,
  Settings as SettingsIcon,
  Sparkles,
  Palette,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import type { SubscriptionPlan } from "@/schema/profile";

export type SettingsSectionId =
  | "account"
  | "preferences"
  | "analysis"
  | "image"
  | "plan";

export const USER_NAV: Array<{
  id: SettingsSectionId;
  label: string;
  Icon: LucideIcon;
}> = [
  { id: "account", label: "Account", Icon: CircleUserRound },
  { id: "preferences", label: "Preferences", Icon: SettingsIcon },
  { id: "analysis", label: "Dream Analysis", Icon: Sparkles },
  { id: "image", label: "Image Style", Icon: Palette },
  { id: "plan", label: "Plan & Billing", Icon: CreditCard },
];

const PLAN_LABEL: Record<SubscriptionPlan, string> = {
  free: "Free Plan",
  visionary: "Visionary",
  prophet: "Prophet",
};

function planBadgeClass(plan: SubscriptionPlan) {
  if (plan === "prophet") return "bg-accent text-accent-foreground";
  if (plan === "visionary") return "bg-primary/10 text-primary";
  return "bg-muted text-muted-foreground";
}

export function ProfileCard({
  email,
  displayName,
  plan,
  dreamCount,
}: {
  email: string;
  displayName: string;
  plan: SubscriptionPlan;
  dreamCount: number;
}) {
  const initials = displayName
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="rounded-[var(--radius-lg)] border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3.5">
        <div
          className="w-14 h-14 rounded-full grid place-items-center text-white font-semibold font-serif text-lg shrink-0"
          style={{
            background:
              "linear-gradient(135deg, var(--blue-deep), var(--blue-soft))",
          }}
          aria-hidden
        >
          {initials || "—"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold truncate">
            {displayName}
          </div>
          <div className="text-[12.5px] text-muted-foreground truncate">
            {email}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4 flex-wrap">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium tracking-[0.02em] ${planBadgeClass(plan)}`}
        >
          {PLAN_LABEL[plan]}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium tracking-[0.02em] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          Active
        </span>
      </div>

      <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3.5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
            Dreams
          </div>
          <div className="font-serif text-[22px] mt-0.5 leading-tight">
            {dreamCount}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
            Plan
          </div>
          <div className="font-serif text-[22px] mt-0.5 leading-tight capitalize">
            {plan}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SidebarNav({
  current,
  onSelect,
}: {
  current: SettingsSectionId;
  onSelect: (id: SettingsSectionId) => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5">
      {USER_NAV.map(({ id, label, Icon }) => {
        const active = id === current;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] transition-colors text-left ${
              active
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground hover:bg-muted"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function UpgradeCTA({ plan }: { plan: SubscriptionPlan }) {
  if (plan === "prophet") return null;
  const headline = plan === "visionary" ? "Upgrade to Prophet" : "Try Prophet";
  const desc =
    plan === "visionary"
      ? "Unlock profound analysis and the final 2 image styles."
      : "Unlock profound analysis and all 6 image styles.";
  return (
    <div
      className="mt-4 p-4 rounded-xl border"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.95 0.04 75), oklch(0.99 0.01 75))",
        borderColor: "oklch(0.88 0.06 75)",
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles className="w-3.5 h-3.5 text-gold" />
        <div className="text-xs font-semibold text-accent-foreground">
          {headline}
        </div>
      </div>
      <p className="text-[11.5px] text-muted-foreground mb-2.5">{desc}</p>
      <Link
        href="/pricing"
        className="inline-flex items-center justify-center w-full px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary-hover transition-colors"
      >
        Upgrade →
      </Link>
    </div>
  );
}
