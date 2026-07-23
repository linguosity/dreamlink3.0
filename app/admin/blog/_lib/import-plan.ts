// app/admin/blog/_lib/import-plan.ts
//
// Pure, synchronous logic for the batch-import "publish plan": given the
// chosen files (in order) and a plan, compute what happens to each file.
// This module is imported by BOTH the client preview (import-posts.tsx) and
// the server action (actions.ts) so the two can never drift — which is also
// why it must NOT carry a "use server" directive or import server-only code.
//
// The rule, in one line: a file whose front-matter already has its own
// scheduled_for keeps that time and does NOT consume a slot in the
// daily/weekly sequence; every other file takes the next slot in the order
// the files are listed.

export const IMPORT_PLAN_MODES = [
  "draft",
  "publish",
  "daily",
  "weekly",
] as const;

export type ImportPlanMode = (typeof IMPORT_PLAN_MODES)[number];

export function isImportPlanMode(value: unknown): value is ImportPlanMode {
  return (
    typeof value === "string" &&
    (IMPORT_PLAN_MODES as readonly string[]).includes(value)
  );
}

export interface ImportPlan {
  mode: ImportPlanMode;
  /** ISO date-time of the first slot. Required when mode is daily/weekly. */
  startAt?: string;
}

export interface PlanFile {
  /**
   * True when the file's front-matter carries its own scheduled_for value.
   * The client detects this with a light regex (preview only); the server
   * recomputes it from its authoritative front-matter parse.
   */
  hasOwnSchedule: boolean;
}

export type PlanAssignment =
  /** Front-matter scheduled_for wins — keeps its own time, consumes no slot. */
  | { kind: "own-schedule" }
  | { kind: "draft" }
  | { kind: "publish" }
  /** Slotted into the daily/weekly sequence at this ISO time. */
  | { kind: "scheduled"; scheduledFor: string };

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Validation shared by the client (disable Confirm) and the server (reject
 * the whole batch before any row is written): daily/weekly plans need a
 * parseable start time that is still in the future. Returns a human-readable
 * error, or null when the plan is usable.
 */
export function planStartError(
  plan: ImportPlan,
  now: number = Date.now()
): string | null {
  if (plan.mode !== "daily" && plan.mode !== "weekly") return null;
  if (!plan.startAt) return "Pick a start date and time for the schedule.";
  const t = new Date(plan.startAt).getTime();
  if (Number.isNaN(t)) {
    return "The schedule start is not a valid date and time.";
  }
  if (t <= now) return "The schedule start must be in the future.";
  return null;
}

/**
 * Compute each file's outcome under a plan, in file order.
 *
 * - hasOwnSchedule  → "own-schedule" (front-matter always wins, any mode)
 * - mode "draft"    → "draft"
 * - mode "publish"  → "publish"
 * - mode "daily"/"weekly" → "scheduled" at startAt + slot × (1 or 7) days,
 *   where slot counts only the files WITHOUT their own schedule, in order.
 *
 * Slots are positional: a file that later fails or is skipped server-side
 * (bad front-matter, existing slug) still holds its place, so the preview
 * and the server always agree on every other file's date.
 *
 * Callers must validate daily/weekly plans with planStartError() first;
 * an invalid startAt throws here rather than silently producing garbage.
 */
export function planAssignments(
  files: PlanFile[],
  plan: ImportPlan
): PlanAssignment[] {
  const stepMs =
    plan.mode === "daily" ? DAY_MS : plan.mode === "weekly" ? 7 * DAY_MS : 0;
  const startMs = plan.startAt ? new Date(plan.startAt).getTime() : NaN;
  if (
    (plan.mode === "daily" || plan.mode === "weekly") &&
    !Number.isFinite(startMs)
  ) {
    throw new Error(
      "planAssignments: daily/weekly plans need a valid startAt — check planStartError() first."
    );
  }
  let slot = 0;
  return files.map((file): PlanAssignment => {
    if (file.hasOwnSchedule) return { kind: "own-schedule" };
    switch (plan.mode) {
      case "draft":
        return { kind: "draft" };
      case "publish":
        return { kind: "publish" };
      case "daily":
      case "weekly": {
        const scheduledFor = new Date(startMs + slot * stepMs).toISOString();
        slot += 1;
        return { kind: "scheduled", scheduledFor };
      }
    }
  });
}
