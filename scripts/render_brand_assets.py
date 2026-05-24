"""Render the v2 Moonwater app icon to PNG at every iOS, Android, and web size.

The SVG paths are ported byte-for-byte from components/brand/MoonwaterMark.tsx
so the rendered raster matches the in-app vector exactly.
"""
import os
import subprocess

OUT = "/sessions/focused-intelligent-knuth/mnt/Dreamlink/dreamlink3.0/public/brand"
os.makedirs(OUT, exist_ok=True)

# Colors from globals.css :root tokens (Night family + gold/cream)
NIGHT      = "#0E1A30"  # var(--night)
NIGHT_DEEP = "#08111F"  # var(--night-deep)
CREAM      = "#F5ECD6"
GOLD       = "#D4A247"

# The Moonwater mark sits inside a 64x64 viewBox; the squircle is 1024x1024.
# We center the mark at 62% of the canvas, matching the in-app BrandMark ratio.
def build_svg(size: int, radius_pct: int = 22, flat: bool = False) -> str:
    r = round(size * radius_pct / 100)
    mark_size = round(size * 0.62)
    mark_offset = (size - mark_size) // 2

    # Inner SVG: the Moonwater mark scaled to mark_size.
    # tilt=15°, fullness=9 (matching MoonwaterMark defaults).
    crescent = "M32 11 A14 14 0 1 0 32 39 A9 14 0 1 1 32 11 Z"
    bottom   = "M14 56 C 22 50, 26 50, 32 56 C 38 62, 42 62, 50 56"
    top      = "M10 48 C 18 42, 22 42, 30 48 C 38 54, 42 54, 54 48"
    sw       = max(1.4, min(3.2, (2.5 * mark_size) / 80))

    highlight = "" if flat else f'''
      <defs>
        <radialGradient id="hl" cx="50%" cy="0%" r="65%">
          <stop offset="0%"  stop-color="#3a4870" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="#3a4870" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="{size}" height="{size}" rx="{r}" ry="{r}" fill="url(#hl)"/>'''

    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">
      <rect x="0" y="0" width="{size}" height="{size}" rx="{r}" ry="{r}" fill="{NIGHT}"/>{highlight}
      <svg x="{mark_offset}" y="{mark_offset}" width="{mark_size}" height="{mark_size}" viewBox="0 0 64 64">
        <g transform="rotate(15 32 25)">
          <path d="{crescent}" fill="{GOLD}"/>
        </g>
        <path d="{bottom}" stroke="{GOLD}"  stroke-width="{sw}" stroke-linecap="round" fill="none"/>
        <path d="{top}"    stroke="{CREAM}" stroke-width="{sw}" stroke-linecap="round" fill="none"/>
      </svg>
    </svg>'''

def render(size: int, name: str, flat: bool = False):
    svg = build_svg(size, flat=flat)
    svg_path = f"/tmp/_render_{size}.svg"
    with open(svg_path, "w") as f:
        f.write(svg)
    out = os.path.join(OUT, name)
    # rsvg-convert if available, else imagemagick
    try:
        subprocess.check_call(
            ["rsvg-convert", "-w", str(size), "-h", str(size), svg_path, "-o", out],
            stderr=subprocess.DEVNULL,
        )
    except (FileNotFoundError, subprocess.CalledProcessError):
        subprocess.check_call(
            ["convert", "-background", "none", "-density", "384", svg_path,
             "-resize", f"{size}x{size}", out],
            stderr=subprocess.DEVNULL,
        )
    print(f"  {name}  ({size}px)")

# Master + iOS pt sizes @ 1x/2x/3x
print("→ iOS / iPadOS app icons")
ios_sizes = {
    "icon-1024.png": 1024,                # App Store
    "icon-180.png":  180,  # iPhone @3x (60pt)
    "icon-167.png":  167,  # iPad Pro @2x (83.5pt)
    "icon-152.png":  152,  # iPad @2x (76pt)
    "icon-120.png":  120,  # iPhone @2x (60pt) + Spotlight @3x (40pt)
    "icon-87.png":    87,  # Settings @3x (29pt)
    "icon-80.png":    80,  # Spotlight @2x (40pt)
    "icon-76.png":    76,  # iPad @1x
    "icon-60.png":    60,  # iPhone Notification @3x (20pt)
    "icon-58.png":    58,  # Settings @2x (29pt)
    "icon-40.png":    40,  # Notification @2x (20pt)
    "icon-29.png":    29,  # Settings @1x
    "icon-20.png":    20,  # Notification @1x
}
for name, size in ios_sizes.items():
    render(size, name)

print("→ Android adaptive icon + Chrome PWA")
render(192, "android-chrome-192.png")
render(512, "android-chrome-512.png")

print("→ Web favicons + Apple touch icon")
render(180, "apple-touch-icon.png")  # same as iPhone @3x
render(32,  "favicon-32.png")
render(16,  "favicon-16.png")

# Compose favicon.ico from 16 + 32 (browsers pick best size).
ico_out = os.path.join(OUT, "..", "favicon.ico")
subprocess.check_call(
    ["convert", os.path.join(OUT, "favicon-16.png"), os.path.join(OUT, "favicon-32.png"), ico_out],
    stderr=subprocess.DEVNULL,
)
print(f"  favicon.ico (composed)")

# Print export header — flat variant, 16px black-on-cream feel
render(64, "icon-print-64.png", flat=True)

# Also stash a 512px master SVG so design has a source of truth
with open(os.path.join(OUT, "icon-master.svg"), "w") as f:
    f.write(build_svg(512))
print("  icon-master.svg")

print("\nDone.")
