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
  variant?: "primary" | "violet";
}) {
  const accentBg = variant === "violet" ? "bg-violet/15" : "bg-primary/10";
  const accentFg =
    variant === "violet"
      ? "text-violet"
      : "text-primary";
  const positive = (trend ?? 0) >= 0;

  // v3 Deep Current: the "violet" variant is the hero/highlight KPI — a flat
  // Violet-tinted card (no gradient; §3 of the brand handoff reserves the
  // gradient for the logo alone) so it still reads as the page's headline
  // metric, not just a tinted icon chip.
  const isHighlight = variant === "violet";
  const cardClass = isHighlight
    ? "rounded-[var(--radius-lg)] border border-violet/30 p-4 shadow-sm relative overflow-hidden bg-violet/10"
    : "rounded-[var(--radius-lg)] border bg-card p-4 shadow-sm relative overflow-hidden";
  const valueClass = isHighlight
    ? "font-serif text-3xl font-normal mt-1 leading-none text-violet"
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
