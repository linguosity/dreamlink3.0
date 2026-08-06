// Stateless bar chart. Last bar is flat Indigo so today reads as "current";
// the rest of the bars share a flat Mist tone. Flat by design — v3 "Deep
// Current" reserves the gradient for the logo alone (HANDOFF-v3.md §0/§8).
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
                  background: isLast ? "var(--indigo)" : "var(--mist-2)",
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
