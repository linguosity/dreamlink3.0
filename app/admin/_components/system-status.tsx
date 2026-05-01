import { StatusPill, type ServiceStatus } from "./status-pill";

export type StatusItem = {
  label: string;
  detail: string;
  status: ServiceStatus;
};

export function SystemStatus({ items }: { items: StatusItem[] }) {
  return (
    <div className="rounded-[var(--radius-lg)] border bg-card p-5 shadow-sm">
      <div className="text-[13px] font-semibold mb-3.5">System status</div>
      <div className="flex flex-col">
        {items.map((s, i) => (
          <div
            key={s.label}
            className="flex items-center justify-between py-2.5"
            style={{
              borderBottom:
                i < items.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            <div className="min-w-0">
              <div className="text-[13px] font-medium">{s.label}</div>
              <div className="text-[11.5px] text-muted-foreground mt-px truncate">
                {s.detail}
              </div>
            </div>
            <StatusPill status={s.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
