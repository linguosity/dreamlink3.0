// Monthly dream volume — same visual grammar as the overview's 14-day bar
// chart (flat Mist bars, current month in Indigo), stretched to 12 months.
// Server-renderable; per-bar native tooltips; endpoint labeled directly.

export function MonthlyVolumeChart({
  monthLabels,
  counts,
}: {
  monthLabels: string[];
  counts: number[];
}) {
  const max = Math.max(...counts, 1);
  if (counts.every((c) => c === 0)) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        No dreams in this window yet.
      </div>
    );
  }
  return (
    <div className="flex items-end gap-1.5 h-[170px] px-1">
      {counts.map((c, i) => {
        const pct = (c / max) * 100;
        const isLast = i === counts.length - 1;
        return (
          <div
            key={monthLabels[i] + i}
            className="flex-1 flex flex-col items-center gap-1.5 h-full min-w-0"
          >
            {/* Direct label on the endpoint only */}
            <div className="flex-1 w-full flex items-end relative">
              {isLast && c > 0 && (
                <span
                  className="absolute left-1/2 -translate-x-1/2 text-[10.5px] font-semibold tabular-nums text-primary"
                  style={{ bottom: `calc(${pct}% + 3px)` }}
                >
                  {c}
                </span>
              )}
              <div
                title={`${c} dreams · ${monthLabels[i]}`}
                className="w-full rounded-t-[4px] max-w-[24px] mx-auto"
                style={{
                  height: `${pct}%`,
                  minHeight: c ? 3 : 0,
                  background: isLast ? "var(--indigo)" : "var(--mist-2)",
                }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground truncate w-full text-center">
              {/* Month only — the year suffix won't fit a 12-column strip */}
              {monthLabels[i].split(" ")[0]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
