"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  Mail,
  Bell,
  BookOpen,
  Search,
  Sun,
  Moon,
  Laptop,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionHead, Field } from "../section-head";
import { ToggleRow } from "../toggle-row";
import {
  FeatureFlag,
  isFeatureEnabled,
  setFeatureFlag,
} from "@/utils/feature-flags";

export type Preferences = {
  emailNotifications: boolean;
  dreamReminders: boolean;
  reminderTime: string;
  biblicalReferences: boolean;
  language: string;
};

export function PreferencesSection({
  prefs,
  onPrefsChange,
  onSave,
  saving,
}: {
  prefs: Preferences;
  onPrefsChange: (next: Preferences) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [multiKeyword, setMultiKeyword] = useState(false);

  useEffect(() => {
    setMounted(true);
    setMultiKeyword(isFeatureEnabled(FeatureFlag.CLIENT_SEARCH));
  }, []);

  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
    onPrefsChange({ ...prefs, [key]: value });

  const handleMultiKeyword = (checked: boolean) => {
    setMultiKeyword(checked);
    setFeatureFlag(FeatureFlag.CLIENT_SEARCH, checked);
    window.dispatchEvent(
      new CustomEvent("featureFlagChanged", {
        detail: { flag: FeatureFlag.CLIENT_SEARCH, enabled: checked },
      }),
    );
  };

  // HANDOFF-v3.md §7.6: dark is a first-class peer, and the app should
  // respect prefers-color-scheme on first load. next-themes already does the
  // second part (defaultTheme="system" in app/providers.tsx) — but a binary
  // on/off switch quietly destroys it: the first tap writes an explicit
  // "light" or "dark" and the user can never get back to following their OS
  // again. Three states, with System as a real choice, is what keeps that
  // promise honest.
  const THEME_OPTIONS = [
    { value: "light", label: "Light", Icon: Sun },
    { value: "dark", label: "Dark", Icon: Moon },
    { value: "system", label: "System", Icon: Laptop },
  ] as const;

  const handleTheme = (next: string) => {
    setTheme(next);
    toast.success(
      next === "system"
        ? "Matching your device"
        : `Switched to ${next} mode`,
    );
  };

  // Before mount, `theme` is undefined and rendering any option as selected
  // would be a guess that flickers. Fall back to "system", which is the
  // provider's own default.
  const activeTheme = mounted ? (theme ?? "system") : "system";

  return (
    <>
      <SectionHead
        eyebrow="Experience"
        title="Preferences"
        desc="Tune notifications, search, and how DreamRiver appears for you."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Notifications */}
        <div className="rounded-[var(--radius-lg)] border bg-card p-5 shadow-sm">
          <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-3">
            Notifications
          </div>
          <div className="flex flex-col gap-1">
            <ToggleRow
              id="pref-email"
              Icon={Mail}
              title="Email updates"
              desc="Weekly summaries and product news"
              value={prefs.emailNotifications}
              onChange={(v) => set("emailNotifications", v)}
            />
            <ToggleRow
              id="pref-reminders"
              Icon={Bell}
              title="Dream reminders"
              desc="A nudge to journal each night"
              value={prefs.dreamReminders}
              onChange={(v) => set("dreamReminders", v)}
            />
          </div>
          {prefs.dreamReminders && (
            <div className="mt-3 pt-3.5 border-t border-border">
              <Field label="Reminder time" htmlFor="pref-reminder-time">
                <Input
                  id="pref-reminder-time"
                  type="time"
                  value={prefs.reminderTime}
                  onChange={(e) => set("reminderTime", e.target.value)}
                  className="max-w-[140px]"
                />
              </Field>
            </div>
          )}
        </div>

        {/* Interface */}
        <div className="rounded-[var(--radius-lg)] border bg-card p-5 shadow-sm">
          <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-3">
            Interface
          </div>
          <div className="flex flex-col gap-1">
            <ToggleRow
              id="pref-bible"
              Icon={BookOpen}
              title="Biblical references"
              desc="Include scripture in dream analyses"
              value={prefs.biblicalReferences}
              onChange={(v) => set("biblicalReferences", v)}
            />
            <ToggleRow
              id="pref-multi"
              Icon={Search}
              title="Multi-keyword search"
              desc="Filter dreams by multiple terms"
              value={multiKeyword}
              onChange={handleMultiKeyword}
            />
          </div>

          {/* Appearance — three states, not a switch. See handleTheme. */}
          <div className="mt-3 pt-3.5 border-t border-border">
            <Field label="Appearance" htmlFor="pref-theme-light">
              <div
                role="radiogroup"
                aria-label="Appearance"
                className="inline-flex gap-1 rounded-full border border-border bg-card p-1"
              >
                {THEME_OPTIONS.map(({ value, label, Icon }) => {
                  const selected = activeTheme === value;
                  return (
                    <button
                      key={value}
                      id={`pref-theme-${value}`}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => handleTheme(value)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </Field>
            <p className="mt-2 text-[13px] text-muted-foreground">
              {activeTheme === "system"
                ? "Following your device — light by day, Night after dark."
                : "Set here regardless of your device setting."}
            </p>
          </div>

          <div className="mt-3 pt-3.5 border-t border-border">
            <Field label="Language" htmlFor="pref-language">
              <Select
                value={prefs.language}
                onValueChange={(v) => set("language", v)}
              >
                <SelectTrigger id="pref-language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-5">
        <Button onClick={onSave} disabled={saving}>
          <Check className="w-3.5 h-3.5 mr-1.5" />
          {saving ? "Saving..." : "Save preferences"}
        </Button>
      </div>
    </>
  );
}
