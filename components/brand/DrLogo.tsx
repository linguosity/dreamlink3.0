// components/brand/DrLogo.tsx
//
// The DreamRiver mark — v3 "Deep Current" logo, ported 1:1 from the design
// handoff's assets/dr-logo.js (a vanilla <dr-logo> custom element) into a
// React component. Geometry (bar coordinates, crescent mask circles, sparkle
// path) is copied verbatim from the source; only the delivery mechanism
// changes — real JSX instead of an innerHTML template string, React's
// useId() instead of a module-level counter, and the companion layout CSS
// lives in globals.css (see the .dr-logo* rules near .wordmark) instead of
// being injected into <head> at runtime.
//
// Four variants:
//   lockup     — mark + "DreamRiver" wordmark (+ optional tagline), stacked.
//   horizontal — mark + wordmark, side by side (nav bars, inline headers).
//   mark       — mark alone, "drawn" bar composition (fuller — medium sizes).
//   icon       — mark alone, "icon" bar composition (compact — small tiles:
//                favicons, avatars, nav bars).
// Three tones:
//   gradient — Indigo → Violet fill via --dr-g1/2/3 (theme-aware; those
//              vars swap in .dark, same as dr-tokens.css's own contract).
//   mono     — currentColor. Parent sets `color`. Use for tight spaces or a
//              fixed single-color glyph (HANDOFF-v3.md §8).
//   reversed — near-white mark + Violet Light accents, for placement on
//              dark/Navy 900 surfaces regardless of the app's own theme.
"use client";

import * as React from "react";

export type DrLogoVariant = "lockup" | "horizontal" | "mark" | "icon";
export type DrLogoBuild = "drawn" | "refined" | "icon";
export type DrLogoTone = "gradient" | "mono" | "reversed";

export interface DrLogoProps {
  variant?: DrLogoVariant;
  /** Bar composition. Defaults to "icon" when variant="icon", else "drawn".
   *  "refined" is the alternate bar layout the handoff left as an open
   *  client decision — "drawn" ships as the committed default (see the
   *  rebrand report). Pass build="refined" explicitly to opt in. */
  build?: DrLogoBuild;
  tone?: DrLogoTone;
  /** Logical size in px. The mark's own width is derived from this (icon
   *  builds render slightly wider, per dr-logo.js's own math). */
  size?: number;
  /** Show the "Discover. Explore. Discern." tagline under the wordmark.
   *  Only rendered when variant="lockup". */
  tagline?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// Bar rects as [x, y, width] triples — height is always 23, corner radius
// 11.5 (a full pill). Copied verbatim from dr-logo.js.
const BARS_DRAWN: ReadonlyArray<readonly [number, number, number]> = [
  [290, 586, 678],
  [568, 632, 332],
  [358, 674, 367],
  [443, 724, 375],
  [535, 771, 187],
  [588, 819, 84],
];
const BARS_REFINED: ReadonlyArray<readonly [number, number, number]> = [
  [290, 586, 678],
  [493, 632, 452],
  [373, 674, 372],
  [539, 722, 300],
  [491, 768, 196],
  [601, 814, 96],
];
const BARS_ICON: ReadonlyArray<readonly [number, number, number]> = [
  [290, 600, 678],
  [429, 660, 400],
  [529, 720, 200],
];

function DrMark({
  build,
  tone,
  uid,
}: {
  build: DrLogoBuild;
  tone: DrLogoTone;
  uid: string;
}) {
  const bars =
    build === "icon" ? BARS_ICON : build === "refined" ? BARS_REFINED : BARS_DRAWN;
  // The crescent is a masked square: an outer "show" circle minus an inner
  // "cut" circle. The cut circle shifts slightly between the drawn build and
  // the refined/icon builds so the sliver still reads correctly against
  // each build's bar density.
  const cut =
    build === "drawn" ? { cx: 726, cy: 326, r: 173 } : { cx: 730, cy: 322, r: 176 };
  const star =
    build === "drawn"
      ? "M790 250 Q800 303 852 313 Q800 323 790 376 Q780 323 728 313 Q780 303 790 250Z"
      : "M798 246 Q808 302 862 312 Q808 322 798 378 Q788 322 734 312 Q788 302 798 246Z";
  const viewBox = build === "icon" ? "270 150 714 620" : "270 160 714 700";
  const gradId = `dr-g-${uid}`;
  const maskId = `dr-m-${uid}`;
  const fill = tone === "gradient" ? `url(#${gradId})` : "currentColor";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      fill={fill}
      aria-hidden="true"
    >
      <defs>
        {tone === "gradient" && (
          <linearGradient id={gradId} x1="0.1" y1="0.05" x2="0.92" y2="0.95">
            <stop offset="0" stopColor="var(--dr-g1,#111A8C)" />
            <stop offset="0.55" stopColor="var(--dr-g2,#2036BE)" />
            <stop offset="1" stopColor="var(--dr-g3,#6E35EE)" />
          </linearGradient>
        )}
        <mask id={maskId}>
          <rect x={270} y={140} width={714} height={720} fill="#000" />
          <circle cx={642} cy={372} r={187} fill="#fff" />
          <circle cx={cut.cx} cy={cut.cy} r={cut.r} fill="#000" />
        </mask>
      </defs>
      <rect x={440} y={170} width={410} height={410} mask={`url(#${maskId})`} />
      <path d={star} />
      <g>
        {bars.map(([x, y, w], i) => (
          <rect key={i} x={x} y={y} width={w} height={23} rx={11.5} />
        ))}
      </g>
    </svg>
  );
}

export function DrLogo({
  variant = "lockup",
  build,
  tone = "gradient",
  size = 40,
  tagline = false,
  className = "",
  style,
}: DrLogoProps) {
  // Strip the colons React.useId() wraps its ids in — harmless in HTML, but
  // keeps the generated <mask>/<linearGradient> ids simple opaque tokens.
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const resolvedBuild: DrLogoBuild = build ?? (variant === "icon" ? "icon" : "drawn");
  // Matches dr-logo.js's actual render() logic: showWord is derived from
  // variant alone. (The source custom element's "show-word" attribute is
  // declared in observedAttributes but never read in render() — a no-op in
  // the source itself, so it isn't ported here either.)
  const showWord = variant !== "mark" && variant !== "icon";
  const stacked = variant === "lockup";
  const markWidth = resolvedBuild === "icon" ? size * 1.15 : size * 1.02;
  const wordColor =
    tone === "reversed"
      ? "#F2F1FE"
      : tone === "mono"
        ? "currentColor"
        : "var(--ink,#0A0E33)";
  // dr-logo.js's gradient-tone tagColor default is `var(--accent,#2036BE)`.
  // This app's own --accent was repointed to a subtle hover-tint (see the
  // note in globals.css), so --primary is the right equivalent here — it's
  // the token that actually carries dr-tokens' Indigo → Violet Light accent
  // swap between light and dark mode.
  const tagColor =
    tone === "reversed"
      ? "var(--violet-lt,#B39BFF)"
      : tone === "mono"
        ? "currentColor"
        : "var(--primary,#2036BE)";

  return (
    <span
      className={["dr-logo", stacked ? "is-stacked" : "is-inline", className]
        .filter(Boolean)
        .join(" ")}
      style={{ ["--sz" as string]: `${size}px`, ...style } as React.CSSProperties}
    >
      <span
        className="dr-logo-mark"
        style={{ width: markWidth, color: tone === "reversed" ? "#EDEAFE" : "inherit" }}
      >
        <DrMark build={resolvedBuild} tone={tone} uid={uid} />
      </span>
      {showWord && (
        <span className="dr-logo-text">
          <span
            className="dr-logo-word"
            style={{ color: wordColor, fontSize: size * (stacked ? 0.62 : 0.56) }}
          >
            DreamRiver
          </span>
          {tagline && (
            <span
              className="dr-logo-tag"
              style={{ color: tagColor, fontSize: Math.max(9, size * 0.17) }}
            >
              Discover. Explore. Discern.
            </span>
          )}
        </span>
      )}
    </span>
  );
}
