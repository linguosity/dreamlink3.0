"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleFounderTaskAction } from "../actions";

export interface FounderTask {
  id: string;
  week: string;
  owner: "B" | "J" | "BJ";
  kind: "priority" | "waiting_on";
  title: string;
  detail: string | null;
  sort: number;
  done_at: string | null;
  done_by: string | null;
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "B", label: "Brandon" },
  { key: "J", label: "Justin" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function ownerBadge(owner: FounderTask["owner"]) {
  const label = owner === "BJ" ? "B+J" : owner;
  return (
    <span className="shrink-0 inline-flex items-center justify-center min-w-[26px] px-1 py-0.5 rounded border text-[10.5px] font-semibold text-muted-foreground bg-muted/50">
      {label}
    </span>
  );
}

export function FounderTasksList({ tasks }: { tasks: FounderTask[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  // Optimistic done-state overlay; server state arrives via revalidatePath.
  const [doneOverride, setDoneOverride] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  const visible = useMemo(
    () =>
      filter === "all"
        ? tasks
        : tasks.filter((t) => t.owner === filter || t.owner === "BJ"),
    [tasks, filter],
  );

  const isDone = (t: FounderTask) => doneOverride[t.id] ?? Boolean(t.done_at);

  function toggle(t: FounderTask) {
    const next = !isDone(t);
    setDoneOverride((m) => ({ ...m, [t.id]: next }));
    startTransition(async () => {
      const result = await toggleFounderTaskAction(t.id, next);
      if ("error" in result) {
        setDoneOverride((m) => ({ ...m, [t.id]: !next }));
        toast.error(`Couldn't update task: ${result.error}`);
      }
    });
  }

  const priorities = visible.filter((t) => t.kind === "priority");
  const waiting = visible.filter((t) => t.kind === "waiting_on");

  function renderRow(t: FounderTask) {
    const done = isDone(t);
    return (
      <li key={t.id}>
        <label className="flex items-start gap-2.5 py-1.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={done}
            onChange={() => toggle(t)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-[color:var(--gold-deep)] cursor-pointer"
          />
          {ownerBadge(t.owner)}
          <span className="min-w-0">
            <span
              className={`text-[13px] leading-snug ${
                done
                  ? "line-through text-muted-foreground"
                  : "group-hover:text-foreground"
              }`}
            >
              {t.title}
            </span>
            {t.detail && !done && (
              <span className="block text-[11.5px] text-muted-foreground mt-0.5 leading-snug">
                {t.detail}
              </span>
            )}
          </span>
        </label>
      </li>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-2.5 py-1 rounded-md text-[12px] border transition-colors ${
              filter === f.key
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {priorities.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
            Priorities
          </div>
          <ul>{priorities.map(renderRow)}</ul>
        </div>
      )}

      {waiting.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
            Waiting on
          </div>
          <ul>{waiting.map(renderRow)}</ul>
        </div>
      )}
    </div>
  );
}
