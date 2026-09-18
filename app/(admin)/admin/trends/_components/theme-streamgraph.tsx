"use client";

// D3-computed, React-rendered streamgraph of the top recurring themes.
// d3 supplies scales/shapes only; React owns the DOM (same pattern as the
// hand-rolled Sparkline, just with real stack math).
//
// Color: the 6 categorical slots live in the .trends-scope CSS vars
// (--trend-1…6, light and dark values both validated with the dataviz
// six-checks script — see trends/page.tsx). Slot follows the theme's overall
// rank and never re-shuffles on hover or filter.

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { scaleLinear, scalePoint } from "d3-scale";
import {
  stack,
  stackOffsetWiggle,
  stackOrderInsideOut,
  area,
  curveMonotoneX,
  type Series,
} from "d3-shape";
import { max as d3max } from "d3-array";
import type { ThemeSeries } from "@/lib/dreamTrends";

const H = 280;
const MARGIN = { top: 16, right: 12, bottom: 26, left: 12 };

export function ThemeStreamgraph({
  monthLabels,
  themes,
}: {
  monthLabels: string[];
  themes: ThemeSeries[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.max(320, w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const months = monthLabels.length;

  const { layers, x, y, labelSpots } = useMemo(() => {
    // Rows = months, keys = theme names.
    const keys = themes.map((t) => t.theme);
    const table = monthLabels.map((_, mi) => {
      const row: Record<string, number> = {};
      for (const t of themes) row[t.theme] = t.counts[mi] ?? 0;
      return row;
    });

    const stacked = stack<Record<string, number>>()
      .keys(keys)
      .offset(stackOffsetWiggle)
      .order(stackOrderInsideOut)(table);

    const x = scalePoint<number>()
      .domain(monthLabels.map((_, i) => i))
      .range([MARGIN.left, width - MARGIN.right]);

    const yMin = Math.min(0, ...stacked.flatMap((l) => l.map((d) => d[0])));
    const yMax = d3max(stacked.flatMap((l) => l.map((d) => d[1]))) ?? 1;
    const y = scaleLinear()
      .domain([yMin, yMax])
      .range([H - MARGIN.bottom, MARGIN.top]);

    // Direct label per band, at the band's thickest month — only when the
    // band is tall enough there for the text to sit inside comfortably.
    const labelSpots = stacked.map((layer) => {
      let best = 0;
      let bestThickness = 0;
      layer.forEach((d, i) => {
        const t = Math.abs(y(d[0]) - y(d[1]));
        if (t > bestThickness) {
          bestThickness = t;
          best = i;
        }
      });
      return { monthIdx: best, thickness: bestThickness };
    });

    return { layers: stacked, x, y, labelSpots };
  }, [themes, monthLabels, width]);

  const areaGen = useMemo(
    () =>
      area<[number, number]>()
        .x((_, i) => x(i) ?? 0)
        .y0((d) => y(d[0]))
        .y1((d) => y(d[1]))
        .curve(curveMonotoneX),
    [x, y],
  );

  const onMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const step = x.step();
      const idx = Math.round((px - MARGIN.left) / step);
      setHover(Math.max(0, Math.min(months - 1, idx)));
    },
    [x, months],
  );

  if (themes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-10 text-center">
        Not enough tagged dreams yet — the stream fills in as analyses come in.
      </div>
    );
  }

  // Tooltip rows for the hovered month, largest first, zeros dimmed.
  const hoverRows =
    hover === null
      ? []
      : themes
          .map((t, i) => ({ theme: t.theme, count: t.counts[hover] ?? 0, slot: i }))
          .sort((a, b) => b.count - a.count);

  const colorOf = (theme: string) =>
    `var(--trend-${themes.findIndex((t) => t.theme === theme) + 1})`;

  return (
    <div ref={containerRef} className="relative">
      <svg
        width={width}
        height={H}
        role="img"
        aria-label="Recurring dream themes by month"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        style={{ display: "block", touchAction: "none" }}
      >
        {(layers as Series<Record<string, number>, string>[]).map((layer) => (
          <path
            key={layer.key}
            d={areaGen(layer as unknown as [number, number][]) ?? undefined}
            fill={colorOf(layer.key)}
            // 1.5px surface stroke = the "2px gap" spacer between touching
            // bands, without drawing a data-weight border.
            stroke="var(--card)"
            strokeWidth={1.5}
            opacity={
              hover === null
                ? 1
                : (themes.find((t) => t.theme === layer.key)?.counts[hover] ?? 0) > 0
                  ? 1
                  : 0.35
            }
            style={{ transition: "opacity 120ms" }}
          />
        ))}

        {/* Selective direct labels — only where the band is thick enough */}
        {(layers as Series<Record<string, number>, string>[]).map((layer, li) => {
          const spot = labelSpots[li];
          if (!spot || spot.thickness < 18) return null;
          const d = layer[spot.monthIdx];
          const cy = (y(d[0]) + y(d[1])) / 2;
          const label = layer.key;
          if (label.length * 6.5 > (x.step() ?? 0) * 3) return null;
          // Clamp edge labels inward so text never clips the SVG bounds.
          let cx = x(spot.monthIdx) ?? 0;
          let anchor: "start" | "middle" | "end" = "middle";
          const halfText = (label.length * 6.5) / 2;
          if (cx + halfText > width - MARGIN.right) {
            cx = width - MARGIN.right - 2;
            anchor = "end";
          } else if (cx - halfText < MARGIN.left) {
            cx = MARGIN.left + 2;
            anchor = "start";
          }
          return (
            <text
              key={`label-${layer.key}`}
              x={cx}
              y={cy}
              textAnchor={anchor}
              dominantBaseline="central"
              fill="#fff"
              fontSize={11}
              fontWeight={600}
              style={{ pointerEvents: "none", paintOrder: "stroke" }}
              stroke="rgba(10,14,51,0.35)"
              strokeWidth={2}
            >
              {label}
            </text>
          );
        })}

        {/* Crosshair */}
        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={MARGIN.top - 6}
            y2={H - MARGIN.bottom}
            stroke="var(--border)"
            strokeWidth={1}
          />
        )}

        {/* Month axis — quiet, every other label when narrow */}
        {monthLabels.map((label, i) => {
          if (width < 640 && i % 2 === 1) return null;
          // First/last labels anchor inward so they don't clip the edges.
          const anchor = i === 0 ? "start" : i === months - 1 ? "end" : "middle";
          return (
            <text
              key={label + i}
              x={x(i)}
              y={H - 8}
              textAnchor={anchor}
              fontSize={10}
              fill="var(--muted-foreground)"
            >
              {label}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hover !== null && (
        <div
          className="absolute top-2 pointer-events-none rounded-lg border bg-popover text-popover-foreground shadow-md px-3 py-2 text-[12px] min-w-[150px] z-10"
          style={{
            left: Math.min(Math.max((x(hover) ?? 0) + 10, 0), width - 170),
          }}
        >
          <div className="font-semibold mb-1">{monthLabels[hover]}</div>
          {hoverRows.map((r) => (
            <div
              key={r.theme}
              className={`flex items-center justify-between gap-3 leading-5 ${
                r.count === 0 ? "opacity-45" : ""
              }`}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: `var(--trend-${r.slot + 1})` }}
                />
                <span className="truncate capitalize">{r.theme}</span>
              </span>
              <span className="tabular-nums">{r.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Legend — identity never rides color alone */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 px-1">
        {themes.map((t, i) => (
          <span
            key={t.theme}
            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground"
          >
            <span
              className="w-2.5 h-2.5 rounded-[3px]"
              style={{ background: `var(--trend-${i + 1})` }}
            />
            <span className="capitalize">{t.theme}</span>
            <span className="tabular-nums opacity-70">{t.total}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
