"use client";

// Clickable KPI tile: the tile itself is the overview page's KpiCard; a click
// opens a popup with the month-by-month breakdown behind the headline number.
// Icons resolve here (a component can't cross the server→client boundary as
// a prop), so the page passes a name string.

import { useState } from "react";
import {
  Droplet,
  Users,
  Star,
  MessageCircleHeart,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { KpiCard } from "../../_components/kpi-card";

const ICONS: Record<string, LucideIcon> = {
  droplet: Droplet,
  users: Users,
  star: Star,
  feedback: MessageCircleHeart,
};

export function ExpandableKpi({
  label,
  value,
  sub,
  icon,
  variant = "primary",
  monthLabels,
  series,
  seriesLabel,
  format = "count",
  showSparkline = true,
}: {
  label: string;
  value: string;
  sub: string;
  icon: keyof typeof ICONS;
  variant?: "primary" | "violet";
  monthLabels: string[];
  series: number[];
  seriesLabel: string;
  format?: "count" | "pct";
  showSparkline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const max = Math.max(...series, 1);
  const fmt = (v: number) => (format === "pct" ? `${v}%` : v.toLocaleString());

  return (
    <>
      {/* div+role, not <button>: the tile contains block elements, which a
          real <button> can't legally wrap */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-label={`Expand ${label}`}
        className="text-left w-full cursor-pointer rounded-[var(--radius-lg)] transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <KpiCard
          label={label}
          value={value}
          sub={sub}
          Icon={ICONS[icon]}
          variant={variant}
          trendData={showSparkline ? series : undefined}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[min(760px,94vw)] bg-card rounded-[var(--radius-lg)]">
          <DialogHeader className="text-left">
            <DialogTitle className="text-[15px] font-semibold">
              {label}
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              {seriesLabel} · last 12 months
            </DialogDescription>
          </DialogHeader>

          <div className="font-serif text-4xl leading-none">{value}</div>

          {/* Month-by-month bars, current month in the accent hue */}
          <div className="flex items-end gap-1.5 h-[160px] px-1 mt-2">
            {series.map((v, i) => {
              const pct = (v / max) * 100;
              const isLast = i === series.length - 1;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1.5 h-full min-w-0"
                >
                  <div className="flex-1 w-full flex items-end relative">
                    {isLast && (
                      <span
                        className="absolute left-1/2 -translate-x-1/2 text-[10.5px] font-semibold tabular-nums text-primary whitespace-nowrap"
                        style={{ bottom: `calc(${pct}% + 3px)` }}
                      >
                        {fmt(v)}
                      </span>
                    )}
                    <div
                      title={`${fmt(v)} · ${monthLabels[i]}`}
                      className="w-full rounded-t-[4px] max-w-[26px] mx-auto"
                      style={{
                        height: `${pct}%`,
                        minHeight: v ? 3 : 0,
                        background: isLast ? "var(--indigo)" : "var(--mist-2)",
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate w-full text-center">
                    {monthLabels[i].split(" ")[0]}
                  </div>
                </div>
              );
            })}
          </div>

          {/* The numbers behind the bars */}
          <div className="overflow-x-auto rounded-lg border mt-2">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-2.5 py-1.5 font-medium text-muted-foreground">
                    Month
                  </th>
                  <th className="px-2.5 py-1.5 font-medium text-muted-foreground">
                    {seriesLabel}
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthLabels.map((m, i) => (
                  <tr key={m + i} className="border-b last:border-0">
                    <td className="px-2.5 py-1.5">{m}</td>
                    <td className="px-2.5 py-1.5 tabular-nums">
                      {fmt(series[i])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
