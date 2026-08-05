"use client";

// Admin controls for the founders' analytics digest: which metrics ride
// along, how often it sends (daily / weekly / biweekly / monthly), on which
// day, at what local time, and to whom. Saved to site_settings key
// 'analytics_digest' via a server action (admin-only).
//
// Scheduling reality (documented in the hint below): the schedule is
// evaluated once per day by the 13:00 UTC cron (~6am PT). A chosen time
// later in the day is scheduled to the minute via Resend; a chosen time
// before the check arrives right after the check instead.

import * as React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveAnalyticsDigestAction } from "@/app/admin/actions";
import {
  DIGEST_CADENCES,
  DIGEST_CADENCE_LABELS,
  DIGEST_SECTIONS,
  WEEKDAY_LABELS,
  isValidDigestEmail,
  type AnalyticsDigestConfig,
  type DigestCadence,
  type DigestSectionKey,
} from "@/lib/analyticsDigestConfig";

function hourLabel(h: number): string {
  if (h === 0) return "12:00 AM";
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
}

const inputClass =
  "w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function AnalyticsDigestForm({
  initial,
}: {
  initial: AnalyticsDigestConfig;
}) {
  const [enabled, setEnabled] = React.useState(initial.enabled);
  const [cadence, setCadence] = React.useState<DigestCadence>(initial.cadence);
  const [weekday, setWeekday] = React.useState(initial.weekday);
  const [dayOfMonth, setDayOfMonth] = React.useState(initial.dayOfMonth);
  const [hourLocal, setHourLocal] = React.useState(initial.hourLocal);
  const [recipientsText, setRecipientsText] = React.useState(
    initial.recipients.join(", "),
  );
  const [sections, setSections] = React.useState<Record<DigestSectionKey, boolean>>(
    initial.sections,
  );
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    const recipients = recipientsText
      .split(/[\s,;]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (recipients.length === 0) {
      toast.error("Add at least one recipient email.");
      return;
    }
    const bad = recipients.find((e) => !isValidDigestEmail(e));
    if (bad) {
      toast.error(`"${bad}" doesn't look like an email address.`);
      return;
    }
    setSaving(true);
    const res = await saveAnalyticsDigestAction({
      enabled,
      cadence,
      weekday,
      dayOfMonth,
      hourLocal,
      timezone: initial.timezone,
      recipients,
      sections,
    });
    setSaving(false);
    if ("error" in res) {
      toast.error(res.error);
    } else {
      toast.success("Analytics digest settings saved.");
    }
  };

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2.5 text-sm font-medium">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 accent-[color:var(--gold)]"
        />
        Send analytics emails
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="digest-cadence" className="block text-sm font-medium mb-1">
            Frequency
          </label>
          <select
            id="digest-cadence"
            value={cadence}
            onChange={(e) => setCadence(e.target.value as DigestCadence)}
            className={inputClass}
          >
            {DIGEST_CADENCES.map((c) => (
              <option key={c} value={c}>
                {DIGEST_CADENCE_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        {(cadence === "weekly" || cadence === "biweekly") && (
          <div>
            <label htmlFor="digest-weekday" className="block text-sm font-medium mb-1">
              Day of week
            </label>
            <select
              id="digest-weekday"
              value={weekday}
              onChange={(e) => setWeekday(Number(e.target.value))}
              className={inputClass}
            >
              {WEEKDAY_LABELS.map((label, i) => (
                <option key={label} value={i}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        {cadence === "monthly" && (
          <div>
            <label htmlFor="digest-dom" className="block text-sm font-medium mb-1">
              Day of month (1–28)
            </label>
            <input
              id="digest-dom"
              type="number"
              min={1}
              max={28}
              value={dayOfMonth}
              onChange={(e) =>
                setDayOfMonth(Math.min(28, Math.max(1, Number(e.target.value) || 1)))
              }
              className={inputClass}
            />
          </div>
        )}

        <div>
          <label htmlFor="digest-hour" className="block text-sm font-medium mb-1">
            Send time (Pacific)
          </label>
          <select
            id="digest-hour"
            value={hourLocal}
            onChange={(e) => setHourLocal(Number(e.target.value))}
            className={inputClass}
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {hourLabel(h)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="digest-recipients" className="block text-sm font-medium mb-1">
          Recipients
        </label>
        <textarea
          id="digest-recipients"
          rows={2}
          value={recipientsText}
          onChange={(e) => setRecipientsText(e.target.value)}
          placeholder="brandon@linguosity.ai, justinbrewer@kingdomheirsflag.org"
          className={inputClass}
        />
      </div>

      <fieldset>
        <legend className="text-sm font-medium mb-1.5">Include in the email</legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {DIGEST_SECTIONS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sections[key]}
                onChange={(e) =>
                  setSections((s) => ({ ...s, [key]: e.target.checked }))
                }
                className="h-4 w-4 accent-[color:var(--gold)]"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <p className="text-xs text-muted-foreground">
        The schedule is checked once a day around 6:00&nbsp;AM Pacific. Times
        later in the day are delivered at the minute you pick; times earlier
        than the check arrive shortly after it. Each metric compares against
        the previous period.
      </p>

      <div className="flex justify-end">
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
