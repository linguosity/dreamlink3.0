import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";
import { Sparkline } from "./sparkline";

export function KpiCard({
  label,
  value,
  sub,
  trend,
  trendData,
  Icon,
  variant = "primary",
}: {
  label: string;
  value: string;
  sub: string;
  trend?: number;
  trendData?: number[];
  Icon?: LucideIcon;
  variant?: "primary" | "gold";
}) {
  const accentBg = variant === "gold" ? "bg-[oklch(0.85_0.08_75/0.45)]" : "bg-primary/10";
  const accentFg =
    variant === "gold"
      ? "text-[color:var(--gold-deep)]"
      : "text-primary";
  const positive = (trend ?? 0) >= 0;

  // v2 Moonwater: gold variant fills the entire card with a soft cream→gold
  // gradient + warm gold border (matches hi-fi-admin "highlight" KPI). The
  // value also renders in gold-deep so the card reads as the page's hero
  // metric, not just a tinted icon chip.
  const isGold = variant === "gold";
  const cardClass = isGold
    ? "rounded-[var(--radius-lg)] border border-[oklch(0.85_0.08_75)] p-4 shadow-sm relative overflow-hidden bg-[linear-gradient(165deg,oklch(0.96_0.04_75),oklch(0.92_0.06_75))]"
    : "rounded-[var(--radius-lg)] border bg-card p-4 shadow-sm relative overflow-hidden";
  const valueClass = isGold
    ? "font-serif text-3xl font-normal mt-1 leading-none text-[color:var(--gold-deep)]"
    : "font-serif text-3xl font-normal mt-1 leading-none";

  return (
    <div className={cardClass}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
            {label}
          </div>
          <div className={valueClass}>
            {value}
          </div>
          <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5 flex-wrap">
            {trend !== undefined && (
              <span
                className={`inline-flex items-center gap-0.5 font-semibold ${
                  positive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
                }`}
              >
                {positive ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                )}
                {Math.abs(trend)}%
              </span>
            )}
            <span>{sub}</span>
          </div>
        </div>
        {Icon && (
          <div
            className={`w-9 h-9 rounded-lg ${accentBg} ${accentFg} grid place-items-center shrink-0`}
            aria-hidden
          >
            <Icon className="w-[18px] h-[18px]" />
          </div>
        )}
      </div>
      {trendData && trendData.length > 1 && (
        <div className="mt-2 -mx-1">
          <Sparkline data={trendData} height={36} variant={variant} />
        </div>
      )}
    </div>
  );
}
