// components/brand/BrandIcon.tsx
//
// The DreamRiver app icon: the v3 <DrLogo/> mark (reversed tone) on a fixed
// Navy 900 squircle. Like a favicon, the tile's own colors don't flip with
// the app's light/dark theme — only the mark drawn on top of it stays
// constant wherever this renders (navbar, onboarding, admin sidebar). Same
// {size, className, alt} signature as the old raster-PNG version it
// replaces, so every existing call site keeps working unchanged.

import { DrLogo } from "./DrLogo";

export function BrandIcon({
  size = 32,
  className = "",
  alt = "DreamRiver",
}: {
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <span
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={`inline-flex items-center justify-center shrink-0 rounded-[22%] ${className}`}
      style={{
        width: size,
        height: size,
        background: "var(--navy-900)",
        boxShadow: "0 2px 8px oklch(0.18 0.02 250 / 0.18)",
      }}
    >
      <DrLogo variant="icon" tone="reversed" size={Math.round(size * 0.64)} />
    </span>
  );
}
