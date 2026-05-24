// components/brand/BrandLockup.tsx
//
// The canonical DreamRiver lockup: app-icon squircle + Moonwater + wordmark.
// Three variants the audit calls for:
//   • "contained"      — squircle visible (default for sidebars, footers,
//                        the splash header — anywhere the brand should feel
//                        like an app icon).
//   • "mark-only"      — Moonwater alone, no squircle (use on Night surfaces
//                        where the container would create a darker square on
//                        dark; also good for the phone-mockup nav).
//   • "wordmark-only"  — just the typographic wordmark (use when space is
//                        tight horizontally and the brand has already been
//                        established higher up in the page).

import * as React from "react";
import Wordmark from "@/components/Wordmark";
import { AppIcon, MoonwaterMark } from "./MoonwaterMark";

type Variant = "contained" | "mark-only" | "wordmark-only";

export interface BrandLockupProps {
  /** Mark variant — defaults to contained app-icon style. */
  variant?: Variant;
  /** Square pixel size of the mark (squircle or free-floating). */
  iconSize?: number;
  /** Gap in px between the mark and wordmark. */
  gap?: number;
  /** Optional Tailwind classes applied to the wordmark <span>. */
  wordmarkClassName?: string;
  /** Override the moon color (e.g. on Night backgrounds keep the default gold). */
  moonColor?: string;
  /** Override the upper wave color. */
  waveTop?: string;
  /** Override the lower wave color. */
  waveBottom?: string;
  /** Background of the squircle when variant === "contained". */
  iconBg?: string;
  /** Drop the squircle shadow + radial highlight (e.g. on print). */
  flat?: boolean;
  className?: string;
}

export default function BrandLockup({
  variant = "contained",
  iconSize = 28,
  gap = 10,
  wordmarkClassName = "",
  moonColor,
  waveTop,
  waveBottom,
  iconBg,
  flat = false,
  className = "",
}: BrandLockupProps) {
  const markProps = {
    ...(moonColor && { moonColor }),
    ...(waveTop && { waveTop }),
    ...(waveBottom && { waveBottom }),
  };

  return (
    <span
      className={`inline-flex items-center ${className}`}
      style={{ gap }}
      aria-label="DreamRiver"
    >
      {variant === "contained" && (
        <AppIcon size={iconSize} radius={22} bg={iconBg} flat={flat}>
          <MoonwaterMark size={Math.round(iconSize * 0.62)} {...markProps} />
        </AppIcon>
      )}
      {variant === "mark-only" && (
        <MoonwaterMark size={iconSize} {...markProps} />
      )}
      {variant !== "wordmark-only" && null}
      <Wordmark className={wordmarkClassName} />
    </span>
  );
}
