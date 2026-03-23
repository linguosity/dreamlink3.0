"use client";

interface ChartData {
  date: string;
  count: number;
}

export function AdminOverviewCharts({ data }: { data: ChartData[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-2">
      {/* Simple bar chart — no external dependencies needed */}
      <div className="flex items-end gap-1 h-40">
        {data.map((day) => {
          const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
          const dateObj = new Date(day.date + "T12:00:00");
          const label = dateObj.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });

          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center gap-1 group"
            >
              {/* Tooltip on hover */}
              <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                {day.count}
              </span>
              {/* Bar */}
              <div
                className="w-full bg-primary/80 rounded-t hover:bg-primary transition-colors min-h-[2px]"
                style={{ height: `${Math.max(height, 2)}%` }}
                title={`${label}: ${day.count} dreams`}
              />
            </div>
          );
        })}
      </div>
      {/* X-axis labels — show every other day to avoid crowding */}
      <div className="flex gap-1">
        {data.map((day, i) => {
          const dateObj = new Date(day.date + "T12:00:00");
          const label = dateObj.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          return (
            <div key={day.date} className="flex-1 text-center">
              {i % 2 === 0 && (
                <span className="text-[9px] text-muted-foreground">
                  {label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
