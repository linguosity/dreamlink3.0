// components/brand/MoonwaterMark.tsx
//
// The Moonwater mark — DreamRiver's v2 brand logo. A crescent moon riding
// above two stylized waves. Ported pixel-for-pixel from the audit's
// `MoonwaterMark` React component (see DreamRiver Brand Audit.html).
//
// Two pieces in this file:
//   <MoonwaterMark />  — the free-floating SVG mark (use at small sizes,
//                        inside dark surfaces, or when the parent already
//                        provides a container).
//   <AppIcon />        — squircle container that wraps the mark. Use on
//                        light surfaces where the brand needs to feel like
//                        an app icon (sidebars, footers, splash header).
//
// Defaults match Decision A (audit-recommended): gold moon + cream/gold
// waves on a Night squircle. Every visual prop is overridable so callers
// can render the inverse for print, single-color glyph variants for tight
// spaces, etc.

import * as React from "react";

export interface MoonwaterMarkProps {
  size?: number;
  /** Fill color for the crescent moon. CSS variable or hex. */
  moonColor?: string;
  /** Stroke color for the upper wave. */
  waveTop?: string;
  /** Stroke color for the lower wave. */
  waveBottom?: string;
  /** Visual stroke weight; scaled relative to size. */
  stroke?: number;
  /** Crescent fullness — controls the inner-arc radius (9 = audit default). */
  fullness?: number;
  /** Tilt of the moon in degrees (15° = audit default). */
  tilt?: number;
  /** Mirror the lower wave so the two waves overlap mid-line. */
  invertWaves?: boolean;
  className?: string;
  style?: React.CSSProperties;
  "aria-hidden"?: boolean;
}

/**
 * The Moonwater mark — crescent moon over two waves.
 * Renders as a 64×64 viewBox SVG; pass `size` in px.
 */
export function MoonwaterMark({
  size = 64,
  moonColor = "var(--gold)",
  waveTop = "var(--cream)",
  waveBottom = "var(--gold)",
  stroke = 2.5,
  fullness = 9,
  tilt = 15,
  invertWaves = false,
  className,
  style,
  "aria-hidden": ariaHidden = true,
}: MoonwaterMarkProps) {
  // Crescent: outer-arc (r=14) + inner-arc (variable r) sweep, centered at (32, 25)
  // then rotated by `tilt` so the moon leans like a sail.
  const crescent = `M32 11 A14 14 0 1 0 32 39 A${fullness} 14 0 1 1 32 11 Z`;

  // Stroke weight scales with size so the mark stays legible from 12px to 256px.
  const sw = Math.max(1.4, Math.min(3.2, (stroke * size) / 80));

  // Two stacked wave paths. Top wave is a fixed S-curve.
  const top = "M10 48 C 18 42, 22 42, 30 48 C 38 54, 42 54, 54 48";

  // Bottom wave: when invertWaves is true the curve flips so waves "kiss"
  // through the center instead of running parallel. Used at smaller sizes
  // where two parallel lines start to read as a single thick line.
  const bottom = invertWaves
    ? "M14 56 C 22 62, 26 62, 32 56 C 38 50, 42 50, 50 56"
    : "M14 56 C 22 50, 26 50, 32 56 C 38 62, 42 62, 50 56";

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={className}
      style={{ display: "block", overflow: "visible", ...style }}
      aria-hidden={ariaHidden}
      role={ariaHidden ? undefined : "img"}
    >
      <g transform={`rotate(${tilt} 32 25)`}>
        <path d={crescent} fill={moonColor} />
      </g>
      <path d={bottom} stroke={waveBottom} strokeWidth={sw} strokeLinecap="round" />
      <path d={top} stroke={waveTop} strokeWidth={sw} strokeLinecap="round" />
    </svg>
  );
}

export interface AppIconProps {
  size?: number;
  /** Corner radius as % of size. 22 = audit default (iOS squircle feel). */
  radius?: number;
  /** Background fill of the squircle. Defaults to Night. */
  bg?: string;
  /** Child mark — typically <MoonwaterMark>. */
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Drop the inner radial gradient highlight (e.g. when used on print). */
  flat?: boolean;
}

/**
 * Squircle container for brand marks. Pairs with <MoonwaterMark/> to
 * produce the iOS-style app icon. Default is the v2 Moonwater spec:
 * Night background with a subtle radial highlight from the top.
 */
export function AppIcon({
  size = 64,
  radius = 22,
  bg = "var(--night)",
  children,
  className,
  style,
  flat = false,
}: AppIconProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: `${(size * radius) / 100}px`,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
        boxShadow: flat ? undefined : "0 4px 12px oklch(0.18 0.02 250 / 0.15)",
        ...style,
      }}
    >
      {!flat && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 0%, oklch(0.45 0.06 250 / 0.5) 0%, transparent 65%)",
          }}
        />
      )}
      <div style={{ position: "relative", display: "flex" }}>{children}</div>
    </div>
  );
}

/**
 * Convenience: the canonical lockup — squircle + Moonwater inside.
 * Use this when you want the full "app icon" treatment in one shot.
 */
export function BrandMark({
  size = 64,
  radius = 22,
  className,
  style,
  flat = false,
}: {
  size?: number;
  radius?: number;
  className?: string;
  style?: React.CSSProperties;
  flat?: boolean;
}) {
  // Inner mark is sized at ~0.62× the squircle (matches the audit's 32→20, 88→56 ratio).
  const innerSize = Math.round(size * 0.62);
  return (
    <AppIcon size={size} radius={radius} className={className} style={style} flat={flat}>
      <MoonwaterMark size={innerSize} />
    </AppIcon>
  );
}
