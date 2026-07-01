// components/brand/BrandIcon.tsx
//
// The DreamRiver logo as a raster image (public/brand/dreamriver-logo.png):
// the Moonwater mark on its night squircle. Drop-in replacement for the
// <AppIcon><MoonwaterMark/></AppIcon> pairing so the same logo renders
// everywhere. The PNG already includes the dark background + glow, so we just
// round the corners to keep the squircle silhouette.

import Image from "next/image";

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
    <Image
      src="/brand/dreamriver-logo.png"
      alt={alt}
      width={size}
      height={size}
      className={`rounded-[22%] object-cover shrink-0 ${className}`}
      priority={false}
    />
  );
}
