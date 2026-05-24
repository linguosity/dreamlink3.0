# DreamRiver brand — v2 Moonwater

Status: **Active** as of the `brand-audit-v2-moonwater` branch (May 2026).
Supersedes the prior Sun-Arch / sacred-blue system.

This document is the implementer's-eye view of the Claude Design brand audit
(`DreamRiver Brand Audit.html` in the design bundle). The audit lives as a
React prototype; this file is the receipt that summarizes what changed in
the real codebase, with file pointers.

## Decision: A — Night for marketing, parchment in-app

The audit asked one strategic question: does Night (dark navy) run through
the product too, or only on marketing? We chose **A**:

- **Night** lives on the splash, social cards (`/og`), the app icon, the
  iOS/Android icon set, and any future marketing screenshot.
- **Parchment** (warm cream/white) remains the in-product surface. Journaling
  is a reading task; light backgrounds keep it easy.
- **Gold** is the connective tissue — primary CTA, focus rings, active-row
  accents, scripture-chip text on both surfaces.

Night-mode-by-default product (Decision B) is parked for v2.1.

## What changed, by finding

| ID | Status | Where it landed |
| -- | ------ | --------------- |
| F01 / F06 | ✅ | `components/brand/MoonwaterMark.tsx`, `BrandLockup.tsx`. Swapped in `Navbar`, `SiteHeader`, admin sidebar, coming-soon page, phone mockup. |
| F02 | ✅ | `app/coming-soon/page.tsx` + `.water-bg-night` in `globals.css`. |
| F03 / F07 | ✅ | `app/globals.css` — `--primary`, `--primary-hover`, `--primary-foreground`, `--ring` repointed to gold (`oklch(0.72 0.14 75)` with Night-Deep text). Cascades through every `bg-primary` / `ring-primary` consumer. |
| F04 | ✅ | `app/coming-soon/PhoneMockup.tsx` — CTA → gold, bottom-nav active → gold. |
| F05 | ✅ | Scripture pills repainted in `components/HeroVisual.tsx`, `DreamCard.tsx`, and the phone mockup. Cream surface + gold-deep text + hairline gold border. |
| F08 | ✅ | Active sidebar rows in `app/settings/_components/sidebar.tsx` and `app/admin/_components/sidebar.tsx` — added 3px `--gold-deep` left edge. |
| F09 | ✅ | `ProfileCard.planBadgeClass` — Prophet tier is Night-bg + gold-light text. |
| F10 | ✅ | Default-avatar gradients (settings sidebar + phone mockup) repointed from blue-soft → gold to `--night-soft` → `--gold`. |
| F11 | n/a | The UX Recs doc was a design-bundle prototype, not in this codebase. |
| F12 | n/a | No print export exists in this repo; the design bundle's `dashboards-print-app.jsx` is prototype-only. |
| F13 | ✅ | iOS + Android + favicon set rendered from the same SVG paths the React mark uses. See `public/brand/`. Wired via `app/layout.tsx` metadata + `public/site.webmanifest`. |
| F14 | ✅ | `app/og/route.tsx` — Edge-runtime `ImageResponse` template at `/og`. Accepts `?title=…` for per-page overrides. Default points at the launch headline. |

## Tokens (globals.css)

```
Night family:  --night #0E1A30 · --night-deep #08111F · --night-soft #1A2748
Cream family:  --cream #F5ECD6 · --cream-soft #FAF4E2
Gold family:   --gold  #D4A247 · --gold-deep  #B08436 · --gold-light  #E6C073

Primary (light + dark): gold; primary-foreground: night-deep.
Old --blue-deep / --blue-soft are kept ONLY for secondary informational
accents (F07 explicitly carves out this exception). Do NOT reach for them
on a button, focus ring, or CTA.
```

## Components

```
components/brand/
  MoonwaterMark.tsx   // <MoonwaterMark/>  free-floating SVG mark
                      // <AppIcon/>        squircle container
                      // <BrandMark/>      convenience lockup (squircle + mark)
  BrandLockup.tsx     // <BrandLockup variant="contained|mark-only|wordmark-only" />
```

## Asset pipeline

`/public/brand/` is rendered by a small script (kept in the project outputs
for reproducibility — re-run if the mark changes). The SVG paths in
`MoonwaterMark.tsx` are the source of truth; the rasters are derived.

iOS sizes: 1024, 180, 167, 152, 120, 87, 80, 76, 60, 58, 40, 29, 20
Android adaptive: 192, 512 (any + maskable)
Web: favicon-16, favicon-32, apple-touch-icon-180, favicon.ico (16+32)
