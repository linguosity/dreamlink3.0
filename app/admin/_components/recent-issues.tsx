type Issue = {
  id: string;
  error_type: string;
  error_message: string;
  user_agent: string | null;
  created_at: string;
  user_id: string | null;
};

export function RecentIssues({ items }: { items: Issue[] }) {
  return (
    <div className="rounded-[var(--radius-lg)] border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${items.length ? "bg-destructive animate-pulse" : "bg-emerald-500"}`}
            aria-hidden
          />
          <div className="text-[13px] font-semibold">Recent issues</div>
          {items.length > 0 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive">
              {items.length}
            </span>
          )}
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          No errors logged — all clear.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto">
          {items.map((e) => (
            <div
              key={e.id}
              className="p-3 border rounded-lg"
              style={{
                borderColor: "oklch(0.92 0.05 25)",
                background: "oklch(0.99 0.01 25)",
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[11.5px] font-semibold uppercase tracking-[0.04em] text-destructive">
                  {e.error_type}
                </span>
                <span className="text-[11.5px] text-muted-foreground whitespace-nowrap">
                  {formatRelative(e.created_at)}
                </span>
              </div>
              <div className="text-[13px] leading-snug line-clamp-2 text-foreground">
                {e.error_message}
              </div>
              <div className="flex gap-3 mt-1.5 text-[11.5px] text-muted-foreground">
                {e.user_id && (
                  <span className="font-mono">{e.user_id.slice(0, 8)}…</span>
                )}
                {e.user_agent && <span>{parseDevice(e.user_agent)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function parseDevice(ua: string): string {
  if (ua.includes("iPhone")) return "iPhone";
  if (ua.includes("iPad")) return "iPad";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("Mac")) return "Mac";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Linux")) return "Linux";
  return "Unknown";
}

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(diff / 3_600_000);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(diff / 86_400_000);
  return `${days}d ago`;
}
