"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Check, Lock, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ReadingLevel,
  AnalysisDepth,
  type SubscriptionPlan,
} from "@/schema/profile";
import { AESTHETIC_PRESETS, ImageAesthetic } from "@/schema/imageAesthetic";
import { SectionHead, Field } from "../section-head";

const READING_LEVELS: Array<{
  id: ReadingLevel;
  label: string;
  sub: string;
  words: string;
}> = [
  {
    id: ReadingLevel.RADIANT_CLARITY,
    label: "Radiant Clarity",
    sub: "Simple, everyday language",
    words: "150–250 words",
  },
  {
    id: ReadingLevel.CELESTIAL_INSIGHT,
    label: "Celestial Insight",
    sub: "Standard theological depth",
    words: "250–400 words",
  },
  {
    id: ReadingLevel.PROPHETIC_WISDOM,
    label: "Prophetic Wisdom",
    sub: "Advanced with scholarly references",
    words: "400–600 words",
  },
  {
    id: ReadingLevel.DIVINE_REVELATION,
    label: "Divine Revelation",
    sub: "Scholarly in-depth exegesis",
    words: "600+ words",
  },
];

const READING_LEVEL_OPTIONS = READING_LEVELS.map((r) => ({
  value: r.id,
  label: r.label,
}));

const DEPTHS: Array<{
  id: AnalysisDepth;
  label: string;
  blurb: string;
  plan: SubscriptionPlan;
}> = [
  {
    id: AnalysisDepth.SHALLOW,
    label: "Shallow",
    blurb: "Topic + 1–3 supporting points + summary.",
    plan: "free",
  },
  {
    id: AnalysisDepth.DEEP,
    label: "Deep",
    blurb: "Adds symbol-by-symbol breakdown + life application.",
    plan: "visionary",
  },
  {
    id: AnalysisDepth.PROFOUND,
    label: "Profound",
    blurb: "Three lenses + cross-references + reflection prompts.",
    plan: "prophet",
  },
];

const PLAN_RANK: Record<SubscriptionPlan, number> = {
  free: 0,
  visionary: 1,
  prophet: 2,
};

export type TestModeState = {
  enabled: boolean;
  depths: AnalysisDepth[];
  readingLevels: ReadingLevel[];
  aesthetics: ImageAesthetic[];
};

export function AnalysisSection({
  plan,
  isAdmin,
  readingLevel,
  bibleVersion,
  analysisDepth,
  testMode,
  showTestModeConfirm,
  onReadingLevelChange,
  onBibleVersionChange,
  onAnalysisDepthChange,
  onTestModeChange,
  onSaveReading,
  onSaveDepth,
  onSaveTestModeClick,
  onConfirmTestModeSave,
  onCancelTestModeConfirm,
  saving,
}: {
  plan: SubscriptionPlan;
  isAdmin: boolean;
  readingLevel: ReadingLevel;
  bibleVersion: string;
  analysisDepth: AnalysisDepth;
  testMode: TestModeState;
  showTestModeConfirm: boolean;
  onReadingLevelChange: (v: ReadingLevel) => void;
  onBibleVersionChange: (v: string) => void;
  onAnalysisDepthChange: (v: AnalysisDepth) => void;
  onTestModeChange: (next: TestModeState) => void;
  onSaveReading: () => void;
  onSaveDepth: () => void;
  onSaveTestModeClick: () => void;
  onConfirmTestModeSave: () => void;
  onCancelTestModeConfirm: () => void;
  saving: boolean;
}) {
  const matrixSize = useMemo(() => {
    if (!testMode.enabled) return 1;
    const d = testMode.depths.length || 1;
    const r = testMode.readingLevels.length || 1;
    const a = testMode.aesthetics.length || 1;
    return d * r * a;
  }, [testMode]);

  const isDepthLocked = (option: (typeof DEPTHS)[number]) =>
    !isAdmin && PLAN_RANK[option.plan] > PLAN_RANK[plan];

  const toggleSetMember = <T extends string>(set: T[], value: T): T[] =>
    set.includes(value) ? set.filter((v) => v !== value) : [...set, value];

  return (
    <>
      <SectionHead
        eyebrow="Interpretation"
        title="Dream Analysis"
        desc="Reading level shapes the language; analysis depth controls how far the AI explores."
      />

      {/* Reading level + Bible version */}
      <div className="rounded-[var(--radius-lg)] border bg-card p-5 shadow-sm">
        <div className="text-[13px] font-semibold mb-3">Reading level</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {READING_LEVELS.map((r) => {
            const selected = readingLevel === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onReadingLevelChange(r.id)}
                aria-pressed={selected}
                className={`p-3.5 rounded-lg text-left border transition-all ${
                  selected
                    ? "border-primary bg-primary/5 ring-2 ring-primary"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="text-[13.5px] font-semibold">{r.label}</div>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                    {r.words}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {r.sub}
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
          <Field
            label="Bible version"
            hint="Used for scripture references in analyses"
          >
            <Select
              value={bibleVersion}
              onValueChange={onBibleVersionChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KJV">King James Version (KJV)</SelectItem>
                <SelectItem value="NIV">
                  New International Version (NIV)
                </SelectItem>
                <SelectItem value="ESV">
                  English Standard Version (ESV)
                </SelectItem>
                <SelectItem value="NKJV">
                  New King James Version (NKJV)
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-end justify-end">
            <Button onClick={onSaveReading} disabled={saving} type="button">
              <Check className="w-3.5 h-3.5 mr-1.5" />
              {saving ? "Saving..." : "Save reading"}
            </Button>
          </div>
        </div>
      </div>

      {/* Analysis depth */}
      <div className="rounded-[var(--radius-lg)] border bg-card p-5 mt-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13px] font-semibold">Analysis depth</div>
          {plan !== "prophet" && !isAdmin && (
            <Link
              href="/pricing"
              className="text-xs font-medium text-primary hover:underline"
            >
              Upgrade to unlock all →
            </Link>
          )}
        </div>
        <div className="flex flex-col gap-2.5">
          {DEPTHS.map((d) => {
            const locked = isDepthLocked(d);
            const selected = analysisDepth === d.id;
            return (
              <button
                key={d.id}
                type="button"
                disabled={locked}
                onClick={() => !locked && onAnalysisDepthChange(d.id)}
                aria-pressed={selected}
                className={`p-3.5 rounded-lg text-left border transition-all flex items-center gap-3.5 ${
                  selected && !locked
                    ? "border-primary bg-primary/5 ring-2 ring-primary"
                    : locked
                    ? "border-border bg-muted opacity-60 cursor-not-allowed"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <div
                  className={`w-[18px] h-[18px] rounded-full border-2 grid place-items-center shrink-0 ${
                    selected && !locked
                      ? "border-primary"
                      : "border-border"
                  }`}
                >
                  {selected && !locked && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{d.label}</span>
                    {locked && (
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                  <div className="text-[12.5px] text-muted-foreground mt-0.5">
                    {d.blurb}
                  </div>
                </div>
                {d.plan !== "free" && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      d.plan === "prophet"
                        ? "bg-accent text-accent-foreground"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {d.plan === "prophet" ? "Prophet" : "Visionary"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={onSaveDepth} disabled={saving} type="button">
            <Check className="w-3.5 h-3.5 mr-1.5" />
            {saving ? "Saving..." : "Save depth"}
          </Button>
        </div>
      </div>

      {/* Admin: Test Mode */}
      {isAdmin && (
        <div
          className="rounded-[var(--radius-lg)] border p-5 mt-4 shadow-sm"
          style={{
            borderColor: "oklch(0.85 0.10 75)",
            background:
              "linear-gradient(180deg, oklch(0.99 0.02 75), var(--card))",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-accent text-accent-foreground grid place-items-center">
                <FlaskConical className="w-4 h-4" />
              </span>
              <div>
                <div className="text-sm font-semibold flex items-center gap-2">
                  Test Mode
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-accent text-accent-foreground">
                    Admin
                  </span>
                </div>
                <div className="text-[12.5px] text-muted-foreground">
                  Fan one submission across multiple settings to compare
                  side-by-side.
                </div>
              </div>
            </div>
            <Switch
              checked={testMode.enabled}
              onCheckedChange={(v) =>
                onTestModeChange({ ...testMode, enabled: v })
              }
            />
          </div>

          {testMode.enabled && (
            <div className="space-y-4 mt-4 pt-4 border-t border-border">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">
                  Compare across depths
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {DEPTHS.map((opt) => (
                    <label
                      key={opt.id}
                      className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded border hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={testMode.depths.includes(opt.id)}
                        onCheckedChange={() =>
                          onTestModeChange({
                            ...testMode,
                            depths: toggleSetMember(testMode.depths, opt.id),
                          })
                        }
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">
                  Compare across reading levels
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {READING_LEVEL_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded border hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={testMode.readingLevels.includes(opt.value)}
                        onCheckedChange={() =>
                          onTestModeChange({
                            ...testMode,
                            readingLevels: toggleSetMember(
                              testMode.readingLevels,
                              opt.value,
                            ),
                          })
                        }
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">
                  Compare across image aesthetics
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.values(AESTHETIC_PRESETS).map((preset) => (
                    <label
                      key={preset.id}
                      className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded border hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={testMode.aesthetics.includes(preset.id)}
                        onCheckedChange={() =>
                          onTestModeChange({
                            ...testMode,
                            aesthetics: toggleSetMember(
                              testMode.aesthetics,
                              preset.id,
                            ),
                          })
                        }
                      />
                      {preset.name}
                    </label>
                  ))}
                </div>
              </fieldset>

              <p className="text-xs text-muted-foreground">
                Matrix size: <strong>{matrixSize}</strong> card
                {matrixSize === 1 ? "" : "s"} per submission. One image is
                generated per unique aesthetic.
              </p>
            </div>
          )}
          <div className="flex justify-end mt-4 pt-4 border-t border-border">
            <Button onClick={onSaveTestModeClick} disabled={saving} type="button">
              <Check className="w-3.5 h-3.5 mr-1.5" />
              {saving ? "Saving..." : "Save test mode"}
            </Button>
          </div>
        </div>
      )}

      <AlertDialog
        open={showTestModeConfirm}
        onOpenChange={(o) => !o && onCancelTestModeConfirm()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm test-mode matrix</AlertDialogTitle>
            <AlertDialogDescription>
              With these settings, each dream submission will produce{" "}
              <strong>
                {matrixSize} card{matrixSize === 1 ? "" : "s"}
              </strong>{" "}
              ({testMode.depths.length || 1} depth ×{" "}
              {testMode.readingLevels.length || 1} reading-level ×{" "}
              {testMode.aesthetics.length || 1} aesthetic).
              <br />
              <br />
              One image is generated per unique aesthetic. OpenAI calls run in
              parallel, but every submission still costs N analyses' worth of
              tokens. Save?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmTestModeSave}>
              Save settings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export { READING_LEVEL_OPTIONS, DEPTHS };
