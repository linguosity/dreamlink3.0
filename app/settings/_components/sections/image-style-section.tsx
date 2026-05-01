"use client";

import { Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AESTHETIC_PRESETS,
  ImageAesthetic,
  type AestheticTier,
  getAvailableAesthetics,
} from "@/schema/imageAesthetic";
import { SectionHead } from "../section-head";

// Per-aesthetic gradient stamps. Mirrors the warm-blue/gold palette so the
// picker tiles read as one family rather than a random rainbow.
const AESTHETIC_GRADIENT: Record<ImageAesthetic, string> = {
  [ImageAesthetic.SACRED_OIL_PAINTING]:
    "linear-gradient(135deg, oklch(0.45 0.10 60), oklch(0.30 0.05 30))",
  [ImageAesthetic.STAINED_GLASS]:
    "linear-gradient(135deg, oklch(0.45 0.18 250), oklch(0.55 0.15 30))",
  [ImageAesthetic.WATERCOLOR_DREAMSCAPE]:
    "linear-gradient(135deg, oklch(0.85 0.06 235), oklch(0.75 0.10 75))",
  [ImageAesthetic.CELESTIAL_COSMOS]:
    "linear-gradient(135deg, oklch(0.30 0.10 270), oklch(0.55 0.13 240))",
  [ImageAesthetic.RENAISSANCE_FRESCO]:
    "linear-gradient(135deg, oklch(0.65 0.12 70), oklch(0.45 0.10 50))",
  [ImageAesthetic.SURREAL_PROPHETIC]:
    "linear-gradient(135deg, oklch(0.50 0.18 30), oklch(0.65 0.16 60))",
  [ImageAesthetic.ANIME_SACRED]:
    "linear-gradient(135deg, oklch(0.72 0.14 75), oklch(0.55 0.13 50))",
  [ImageAesthetic.PHOTOREALISTIC_VISION]:
    "linear-gradient(135deg, oklch(0.55 0.07 235), oklch(0.40 0.10 250))",
};

export function ImageStyleSection({
  aesthetic,
  onAestheticChange,
  userTier,
  onSave,
  saving,
}: {
  aesthetic: ImageAesthetic;
  onAestheticChange: (v: ImageAesthetic) => void;
  userTier: AestheticTier;
  onSave: () => void;
  saving: boolean;
}) {
  const available = new Set(getAvailableAesthetics(userTier).map((a) => a.id));

  return (
    <>
      <SectionHead
        eyebrow="Aesthetic"
        title="Dream Image Style"
        desc="Choose how AI-generated dream images look. Each dream becomes one image."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {Object.values(AESTHETIC_PRESETS).map((preset) => {
          const locked = !available.has(preset.id);
          const selected = aesthetic === preset.id && !locked;
          return (
            <button
              key={preset.id}
              type="button"
              disabled={locked}
              onClick={() => !locked && onAestheticChange(preset.id)}
              aria-pressed={selected}
              className={`relative text-left rounded-xl overflow-hidden border bg-card transition-all p-0 ${
                selected
                  ? "border-primary ring-2 ring-primary"
                  : locked
                  ? "border-border opacity-55 cursor-not-allowed"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div
                className="h-[110px] relative"
                style={{ background: AESTHETIC_GRADIENT[preset.id] }}
              >
                {locked && (
                  <div className="absolute inset-0 bg-black/25 grid place-items-center">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                )}
                {preset.tier !== "free" && (
                  <span
                    className={`absolute top-2.5 right-2.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      preset.tier === "prophet"
                        ? "bg-accent text-accent-foreground"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {preset.tier === "prophet" ? "Prophet" : "Visionary"}
                  </span>
                )}
              </div>
              <div className="px-3.5 py-3">
                <div className="text-[13.5px] font-semibold">{preset.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {preset.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end mt-5">
        <Button onClick={onSave} disabled={saving}>
          <Check className="w-3.5 h-3.5 mr-1.5" />
          {saving ? "Saving..." : "Save image style"}
        </Button>
      </div>
    </>
  );
}
