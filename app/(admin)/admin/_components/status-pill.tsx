export type ServiceStatus = "operational" | "degraded" | "pending" | "down";

const MAP: Record<
  ServiceStatus,
  { label: string; pill: string; dot: string; pulse: boolean }
> = {
  operational: {
    label: "Operational",
    pill:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    pulse: true,
  },
  degraded: {
    label: "Degraded",
    pill: "bg-accent text-accent-foreground",
    dot: "bg-amber-500",
    pulse: false,
  },
  pending: {
    label: "Pending",
    pill: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/60",
    pulse: false,
  },
  down: {
    label: "Down",
    pill: "bg-destructive/10 text-destructive",
    dot: "bg-destructive",
    pulse: false,
  },
};

export function StatusPill({ status }: { status: ServiceStatus }) {
  const s = MAP[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium ${s.pill}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${s.dot} ${s.pulse ? "animate-pulse" : ""}`}
      />
      {s.label}
    </span>
  );
}
