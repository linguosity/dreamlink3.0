// Stateless bar chart. Last bar gets a deeper gradient so today reads as
// "current" — the rest of the bars share a soft blue gradient.
export function DreamsBarChart({
  data,
}: {
  data: Array<{ date: string; count: number }>;
}) {
  if (data.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        No dreams yet.
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-1.5 h-[180px] px-1">
      {data.map((d, i) => {
        const pct = (d.count / max) * 100;
        const isLast = i === data.length - 1;
        return (
          <div
            key={d.date}
            className="flex-1 flex flex-col items-center gap-1.5 h-full"
          >
            <div className="flex-1 w-full flex items-end relative">
              <div
                title={`${d.count} dreams · ${d.date}`}
                className="w-full rounded-t-[4px] transition-all"
                style={{
                  height: `${pct}%`,
                  minHeight: d.count ? 3 : 0,
                  background: isLast
                    ? "linear-gradient(180deg, var(--primary), var(--blue-soft))"
                    : "linear-gradient(180deg, oklch(0.75 0.08 235), oklch(0.85 0.05 235))",
                }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground tabular-nums">
              {new Date(d.date).getUTCDate()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
