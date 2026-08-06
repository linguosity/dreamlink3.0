import Link from "next/link";

export type SignupItem = {
  user_id: string;
  created_at: string;
  plan?: "free" | "visionary" | "prophet" | null;
};

export function RecentSignups({ items }: { items: SignupItem[] }) {
  return (
    <div className="rounded-[var(--radius-lg)] border bg-card p-5 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-3.5">
        <div className="text-[13px] font-semibold">Recent signups</div>
        <Link
          href="/admin/users"
          className="text-xs font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No signups yet.
        </p>
      ) : (
        <div className="flex flex-col">
          {items.map((s, i) => {
            const initials = s.user_id.slice(0, 2).toUpperCase();
            return (
              <div
                key={s.user_id}
                className="flex items-center justify-between py-2"
                style={{
                  borderBottom:
                    i < items.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-[26px] h-[26px] rounded-full grid place-items-center text-white text-[10px] font-semibold shrink-0"
                    style={{
                      // v3 Deep Current: flat Indigo fill (matches the settings
                      // ProfileCard default avatar). Flat by design — the
                      // gradient is reserved for the logo alone.
                      background: "var(--indigo)",
                    }}
                    aria-hidden
                  >
                    {initials}
                  </div>
                  <span className="font-mono text-xs truncate">
                    {s.user_id.slice(0, 8)}…
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.plan && s.plan !== "free" && (
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                        // v3 Deep Current: prophet chip mirrors settings —
                        // Navy 900 background + Violet Light text — so the
                        // premium tier reads identically everywhere.
                        s.plan === "prophet"
                          ? "bg-navy-900 text-violet-light"
                          : "bg-mist text-navy-800"
                      }`}
                    >
                      {s.plan}
                    </span>
                  )}
                  <span className="text-[11.5px] text-muted-foreground whitespace-nowrap">
                    {formatRelative(s.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
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
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
