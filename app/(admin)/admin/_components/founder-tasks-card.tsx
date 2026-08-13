import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/utils/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { FounderTasksList, type FounderTask } from "./founder-tasks-list";

// "This week" — founder checklist seeded from the Monday brief
// (briefs/YYYY-MM-DD-monday-brief.md via scripts/seed-founder-tasks.mjs).
// Shows the latest week only; check-offs persist in founder_tasks and are
// read back by the next Monday brief.
export default async function FounderTasksCard() {
  // Untyped cast: founder_tasks isn't in lib/database.types.ts yet —
  // regenerate types after applying migration 20260720000001.
  const admin = getAdminClient() as unknown as SupabaseClient;

  let tasks: FounderTask[] = [];
  let week: string | null = null;
  let setupHint: string | null = null;

  const { data, error } = await admin
    .from("founder_tasks")
    .select("id, week, owner, kind, title, detail, sort, done_at, done_by")
    .order("week", { ascending: false })
    .order("kind", { ascending: true })
    .order("sort", { ascending: true })
    .limit(60);

  if (error) {
    // Most likely the migration hasn't been applied yet — render a setup
    // hint instead of crashing the whole dashboard.
    setupHint = error.message.includes("founder_tasks")
      ? "Table missing — apply migration 20260720000001_founder_tasks.sql (supabase db push), then run scripts/seed-founder-tasks.mjs."
      : error.message;
  } else if (data && data.length > 0) {
    week = (data[0] as FounderTask).week;
    tasks = (data as FounderTask[]).filter((t) => t.week === week);
  }

  const open = tasks.filter((t) => !t.done_at).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            This week
            {week && (
              <span className="text-[11.5px] font-normal text-muted-foreground">
                from the {week} Monday brief
              </span>
            )}
          </CardTitle>
          {tasks.length > 0 && (
            <span className="text-[12px] text-muted-foreground tabular-nums">
              {tasks.length - open}/{tasks.length} done
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {setupHint ? (
          <p className="text-[12.5px] text-muted-foreground border-l-2 border-border pl-3">
            {setupHint}
          </p>
        ) : tasks.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground border-l-2 border-border pl-3">
            No tasks seeded yet — run{" "}
            <code className="font-mono">scripts/seed-founder-tasks.mjs</code>{" "}
            against the latest Monday brief.
          </p>
        ) : (
          <FounderTasksList tasks={tasks} />
        )}
      </CardContent>
    </Card>
  );
}
