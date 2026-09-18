// Scripture heatmap — which books the interpretations keep returning to,
// month by month. Magnitude, so the color job is SEQUENTIAL: one hue
// (brand primary), light → dark via color-mix against the card surface.
// That single-hue ramp also survives dark mode for free, since both ends
// are theme tokens. Server-renderable; per-cell native tooltips.

import { Fragment } from "react";
import type { ScriptureRow } from "@/lib/dreamTrends";

function cellBg(count: number, max: number): string {
  if (count === 0) return "var(--muted)";
  // 5 monotone steps of the primary hue over the card surface. Darkest step
  // is the full token, so the top of the ramp always clears 3:1.
  const t = count / max;
  const pct = t >= 0.999 ? 100 : 24 + Math.round(t * 60); // 24–84%, then 100
  return `color-mix(in oklab, var(--primary) ${pct}%, var(--card))`;
}

export function ScriptureHeatmap({
  rows,
  max,
  monthLabels,
}: {
  rows: ScriptureRow[];
  max: number;
  monthLabels: string[];
}) {
  if (rows.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        No scripture citations in this window yet.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-[2px] min-w-[560px]"
        style={{
          gridTemplateColumns: `minmax(96px,140px) repeat(${monthLabels.length}, minmax(24px,1fr)) 44px`,
        }}
      >
        {rows.map((row) => (
          <Fragment key={row.book}>
            <div className="text-[12px] text-foreground/90 pr-2 flex items-center truncate">
              {row.book}
            </div>
            {row.counts.map((c, mi) => (
              <div
                key={`${row.book}-${mi}`}
                title={`${row.book} · ${monthLabels[mi]} · cited in ${c} ${c === 1 ? "dream" : "dreams"}`}
                className="h-[26px] rounded-[4px]"
                style={{ background: cellBg(c, max) }}
              />
            ))}
            <div className="text-[11.5px] text-muted-foreground tabular-nums flex items-center justify-end">
              {row.total}
            </div>
          </Fragment>
        ))}
        {/* Month labels under the grid */}
        <div />
        {monthLabels.map((label, i) => (
          <div
            key={`m-${i}`}
            className="text-[10px] text-muted-foreground text-center pt-1 truncate"
          >
            {label}
          </div>
        ))}
        <div className="text-[10px] text-muted-foreground text-right pt-1">
          total
        </div>
      </div>

      {/* Ramp legend */}
      <div className="flex items-center gap-1.5 mt-3 text-[11px] text-muted-foreground">
        <span>fewer</span>
        {[0.15, 0.35, 0.55, 0.8, 1].map((t) => (
          <span
            key={t}
            className="w-4 h-3 rounded-[3px] inline-block"
            style={{ background: cellBg(Math.max(1, Math.round(t * max)), max) }}
          />
        ))}
        <span>more dreams citing the book</span>
      </div>
    </div>
  );
}
