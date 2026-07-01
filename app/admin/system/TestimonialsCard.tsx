"use client";

// Admin editor for the landing-page testimonials. Add / edit / remove / reorder
// the rotating quotes; saved to site_settings via a server action. Also shows
// the live user count and whether the landing is surfacing it yet.

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveTestimonialsAction } from "@/app/admin/actions";
import { type Testimonial, USER_COUNT_DISPLAY_THRESHOLD } from "@/lib/testimonials";

export function TestimonialsCard({
  initial,
  userCount,
}: {
  initial: Testimonial[];
  userCount: number;
}) {
  const [rows, setRows] = React.useState<Testimonial[]>(
    initial.length ? initial : [{ quote: "", author: "" }],
  );
  const [saving, setSaving] = React.useState(false);

  const update = (i: number, patch: Partial<Testimonial>) =>
    setRows((r) => r.map((row, n) => (n === i ? { ...row, ...patch } : row)));
  const add = () => setRows((r) => [...r, { quote: "", author: "" }]);
  const remove = (i: number) => setRows((r) => r.filter((_, n) => n !== i));
  const move = (i: number, dir: -1 | 1) =>
    setRows((r) => {
      const j = i + dir;
      if (j < 0 || j >= r.length) return r;
      const copy = [...r];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const save = async () => {
    const clean = rows
      .map((r) => ({ quote: r.quote.trim(), author: r.author.trim() }))
      .filter((r) => r.quote.length > 0);
    if (clean.length === 0) {
      toast.error("Add at least one testimonial with a quote.");
      return;
    }
    setSaving(true);
    const res = await saveTestimonialsAction(clean);
    setSaving(false);
    if ("error" in res) {
      toast.error(res.error);
    } else {
      toast.success("Testimonials saved.");
      setRows(clean);
    }
  };

  const showsCount = userCount >= USER_COUNT_DISPLAY_THRESHOLD;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Landing Testimonials</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Rotating social proof on the landing page. Currently{" "}
          <span className="font-semibold">{userCount.toLocaleString()}</span> users —{" "}
          {showsCount ? (
            <>the live count is shown alongside testimonials.</>
          ) : (
            <>the count is hidden until {USER_COUNT_DISPLAY_THRESHOLD.toLocaleString()} users; testimonials only for now.</>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-2">
            <textarea
              value={row.quote}
              onChange={(e) => update(i, { quote: e.target.value })}
              placeholder="Testimonial quote…"
              rows={2}
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex items-center gap-2">
              <input
                value={row.author}
                onChange={(e) => update(i, { author: e.target.value })}
                placeholder="Author (e.g. Emily M.)"
                className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down">↓</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)} className="text-destructive hover:text-destructive" aria-label="Remove">✕</Button>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={add}>
            + Add testimonial
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
