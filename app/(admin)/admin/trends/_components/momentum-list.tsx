// Rising / fading symbols — an emphasis list, not a chart. Server-renderable.
// Direction is shown with an arrow + signed number, never color alone; the
// thin bar underneath is a shared-scale magnitude cue (current-quarter
// mentions vs the biggest row on the board).

import { ArrowUpRight, ArrowDownRight, Sparkle } from "lucide-react";
import type { MomentumRow } from "@/lib/dreamTrends";

function Row({
  row,
  maxCurrent,
  direction,
}: {
  row: MomentumRow;
  maxCurrent: number;
  direction: "up" | "down" | "new";
}) {
  const pct = Math.max(4, Math.round((row.current / maxCurrent) * 100));
  return (
    <li className="py-2 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] capitalize truncate">{row.tag}</span>
        <span className="text-[12px] text-muted-foreground tabular-nums shrink-0 inline-flex items-center gap-1">
          {row.prior} → {row.current}
          {direction === "up" && (
            <span className="inline-flex items-center font-semibold text-primary">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {row.pctChange !== null ? `${row.pctChange}%` : ""}
            </span>
          )}
          {direction === "down" && (
            <span className="inline-flex items-center font-semibold">
              <ArrowDownRight className="w-3.5 h-3.5" />
              {row.pctChange !== null ? `${Math.abs(row.pctChange)}%` : ""}
            </span>
          )}
          {direction === "new" && (
            <span className="inline-flex items-center gap-0.5 font-semibold text-violet">
              <Sparkle className="w-3 h-3" /> new
            </span>
          )}
        </span>
      </div>
      <div className="mt-1.5 h-[3px] rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background:
              direction === "down" ? "var(--mist-2)" : "var(--primary)",
            opacity: direction === "down" ? 1 : 0.85,
          }}
        />
      </div>
    </li>
  );
}

function Column({
  title,
  sub,
  rows,
  maxCurrent,
  direction,
  empty,
}: {
  title: string;
  sub: string;
  rows: MomentumRow[];
  maxCurrent: number;
  direction: "up" | "down" | "new";
  empty: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[13px] font-semibold">{title}</div>
      <div className="text-[11.5px] text-muted-foreground mt-0.5 mb-2.5">
        {sub}
      </div>
      {rows.length === 0 ? (
        <div className="text-[12.5px] text-muted-foreground py-3">{empty}</div>
      ) : (
        <ul className="divide-y divide-border/60">
          {rows.map((r) => (
            <Row
              key={r.tag}
              row={r}
              maxCurrent={maxCurrent}
              direction={direction}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export function MomentumBoard({
  rising,
  fading,
  newArrivals,
}: {
  rising: MomentumRow[];
  fading: MomentumRow[];
  newArrivals: MomentumRow[];
}) {
  const maxCurrent = Math.max(
    1,
    ...[...rising, ...fading, ...newArrivals].map((r) =>
      Math.max(r.current, r.prior),
    ),
  );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
      <Column
        title="Rising"
        sub="This quarter vs last"
        rows={rising}
        maxCurrent={maxCurrent}
        direction="up"
        empty="Nothing gaining ground yet."
      />
      <Column
        title="Fading"
        sub="This quarter vs last"
        rows={fading}
        maxCurrent={maxCurrent}
        direction="down"
        empty="Nothing fading — themes are steady."
      />
      {newArrivals.length > 0 && (
        <div className="sm:col-span-2">
          <Column
            title="New arrivals"
            sub="First seen this quarter"
            rows={newArrivals}
            maxCurrent={maxCurrent}
            direction="new"
            empty=""
          />
        </div>
      )}
    </div>
  );
}
