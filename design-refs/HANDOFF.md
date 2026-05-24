# DreamRiver — Brand v2 (Moonwater) Handoff

> One-stop reference for Claude Code (or any agent) to migrate the
> Dreamlink/DreamRiver codebase from the v1 sacred-blue identity to the
> v2 **Moonwater** identity. Read this top to bottom before making changes.

Visual references in `/design-refs/`:
- `DreamRiver Brand.html` — brand system (mark, palette, type, lockups, don'ts)
- `DreamRiver Brand Audit.html` — 14 prioritised findings with current→target
- `DreamRiver Hi-Fi Mockups.html` + `hi-fi-*.jsx` — exact visual target per page

---

## 0 · The brand in one paragraph

**DreamRiver** is biblical dream interpretation. The identity is **Moonwater**:
a gold waxing crescent moon (tilted ~15° clockwise) above two parallel sine
waves — cream on top, gold below — sitting inside an iOS-spec squircle on
midnight navy. Wordmark is **Cormorant Garamond italic 500** ("DreamRiver",
title case). Marketing surfaces use Night; product surfaces stay parchment
with **gold replacing sacred-blue as the primary action color**.

---

## 1 · Tokens — drop straight into `app/globals.css`

```css
:root {
  /* Night (marketing / app-icon container) */
  --night:       #0E1A30;  /* oklch(0.18 0.04 250) */
  --night-deep:  #08111F;
  --night-soft:  #1A2748;

  /* Cream (surface on Night; parchment on light) */
  --cream:       #F5ECD6;  /* oklch(0.93 0.03 80)  */
  --cream-soft:  #FAF4E2;

  /* Gold (PRIMARY — replaces sacred blue) */
  --gold:        #D4A247;  /* oklch(0.72 0.14 75)  */
  --gold-deep:   #B08436;
  --gold-light:  #E6C073;
}

/* Retokenize the semantic primary chain — single biggest cascade */
:root {
  --primary:             var(--gold);
  --primary-hover:       var(--gold-deep);
  --primary-soft:        oklch(0.95 0.05 75);
  --primary-foreground:  var(--night-deep);

  /* Keep blue around for ONE purpose: informational/secondary accents */
  --blue-deep:           oklch(0.45 0.12 245);
  --blue-soft:           oklch(0.70 0.08 235);
}
```

Dark-mode variant: keep night tokens identical, swap `--cream` → use
`--cream-soft` for surfaces, raise gold to `--gold-light` for text.

---

## 2 · Typography

| Role | Family | Weight / Style | Notes |
|---|---|---|---|
| Wordmark | Cormorant Garamond | 500, italic | letter-spacing 0.005em · title case "DreamRiver" |
| Headlines | DM Serif Display | 400 | unchanged from v1 |
| Body / UI | DM Sans | 400 / 500 / 600 / 700 | unchanged from v1 |
| Mono | JetBrains Mono | 400 / 500 | eyebrows, code, debug |

**Remove all `.font-blanka` usage.** Delete the `@font-face` block for Blanka
in `globals.css` and `public/fonts/Blanka.otf`.

Update `components/Wordmark.tsx` to render plain text with the Cormorant
class. Example:

```tsx
export default function Wordmark({
  className = "",
  size = "text-xl",
}: { className?: string; size?: string }) {
  return (
    <span
      className={`font-serif italic font-medium tracking-[0.005em] ${size} ${className}`}
      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
    >
      DreamRiver
    </span>
  );
}
```

Add Cormorant Garamond to `app/layout.tsx`:
```tsx
import { Cormorant_Garamond } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});
```

Then apply `cormorant.variable` to `<body>`.

---

## 3 · The Mark — paste-ready component

Create `components/brand/MoonwaterMark.tsx`:

```tsx
type Props = {
  size?: number;
  moonColor?: string;
  waveTop?: string;
  waveBottom?: string;
  stroke?: number;
  fullness?: number;
  tilt?: number;
  className?: string;
};

export function MoonwaterMark({
  size = 64,
  moonColor = "var(--gold)",
  waveTop = "var(--cream)",
  waveBottom = "var(--gold)",
  stroke = 2.5,
  fullness = 9,
  tilt = 15,
  className,
}: Props) {
  const crescent = `M32 11 A14 14 0 1 0 32 39 A${fullness} 14 0 1 1 32 11 Z`;
  const sw = Math.max(1.4, Math.min(3.2, (stroke * size) / 80));
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={className}
      style={{ display: "block", overflow: "visible" }}
    >
      <g transform={`rotate(${tilt} 32 25)`}>
        <path d={crescent} fill={moonColor} />
      </g>
      <path
        d="M14 56 C 22 50, 26 50, 32 56 C 38 62, 42 62, 50 56"
        stroke={waveBottom}
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <path
        d="M10 48 C 18 42, 22 42, 30 48 C 38 54, 42 54, 54 48"
        stroke={waveTop}
        strokeWidth={sw}
        strokeLinecap="round"
      />
    </svg>
  );
}
```

Create `components/brand/AppIcon.tsx`:

```tsx
import { MoonwaterMark } from "./MoonwaterMark";

export function AppIcon({
  size = 64,
  radius = 22,
  bg = "var(--night)",
  innerScale = 0.62,
  className,
}: {
  size?: number;
  radius?: number;
  bg?: string;
  innerScale?: number;
  className?: string;
}) {
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
        boxShadow: "0 4px 12px oklch(0.18 0.02 250 / 0.15)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 0%, oklch(0.45 0.06 250 / 0.5) 0%, transparent 65%)",
        }}
      />
      <div style={{ position: "relative" }}>
        <MoonwaterMark size={size * innerScale} />
      </div>
    </div>
  );
}
```

**Rules of use:**
- App icons, social cards, splash, sign-up → `<AppIcon>` (contained, on Night)
- Product chrome (top nav, sidebars) → `<AppIcon size={32}>` + wordmark beside
- Tiny inline (favicons ≤24px) → `<MoonwaterMark>` only
- On parchment headers, free-floating: `moonColor="var(--night)"`,
  `waveTop="var(--night)"`, `waveBottom="var(--gold)"`

**Don't:** outline the crescent, recolor the moon, flip horizontally
(waxing only), or place the mark on a busy gradient. See Brand.html § 08.

---

## 4 · Execution order

The audit findings are in `DreamRiver Brand Audit.html` § 05 (Backlog).
Suggested daily plan:

### Day 1 — Tokens (biggest cascade)
- [ ] **F07** Swap `--primary` family blue → gold in `app/globals.css`
- [ ] **F03** Audit codebase for hard-coded `oklch(0.45 0.12 245)`,
      `#3F6FCB`, `bg-blue-*`, `text-blue-*` and replace with semantic tokens
- [ ] Sanity-check: `pnpm build && pnpm dev`, click through every button.
      Every CTA, focus ring, link hover should now be gold.

### Day 2 — Mark + wordmark
- [ ] **F01** Add `MoonwaterMark` + `AppIcon` components (§3 above)
- [ ] Replace `components/Wordmark.tsx` with the Cormorant version (§2)
- [ ] Delete Blanka `@font-face` and `public/fonts/Blanka.otf`
- [ ] **F06** Update `app/settings/_components/sidebar.tsx`,
      `app/admin/_components/sidebar.tsx`, `components/SiteHeader.tsx`,
      `components/Navbar.tsx` to use contained Moonwater + Cormorant wordmark
- [ ] Add Cormorant Garamond to `app/layout.tsx` font imports

### Day 3 — Splash + auth
- [ ] **F02** Rebuild hero in `app/landing/page.tsx`:
      Night gradient bg, cream text, gold CTA. Mirror `hi-fi-splash.jsx`.
- [ ] **F04** Update `components/HeroVisual.tsx` phone-mockup interior:
      gold CTA, Moonwater nav mark, scripture pills restyled
- [ ] **F05** Scripture pills in landing + sample interpretation:
      `bg-cream text-gold-deep border-[oklch(0.85_0.08_75)]`
- [ ] Update `app/(auth-pages)/sign-up/page.tsx`: replace `<Moon>` icon
      with `<AppIcon>`, change gradient text to gold-deep, remove
      `bg-clip-text bg-gradient-to-r from-primary to-blue-soft`

### Day 4 — Product surfaces
- [ ] **F08** Active sidebar rows in `app/settings/_components/sidebar.tsx`
      + `app/admin/_components/sidebar.tsx`: add 3px gold left edge +
      pale-gold background. CSS sketch:
      ```css
      .nav-row[data-active="true"] {
        background: oklch(0.95 0.05 75);
        border-left: 3px solid var(--gold);
        padding-left: calc(0.75rem - 3px);
        color: var(--gold-deep);
        font-weight: 600;
      }
      ```
- [ ] **F09** Plan badges in `app/settings/_components/sidebar.tsx`
      ProfileCard: `prophet` → `bg-night text-gold-light`,
      `visionary` → `bg-primary-soft text-gold-deep`,
      `free` → muted neutral
- [ ] **F10** Admin top-bar avatar gradient: `from-night-soft to-gold`

### Day 5 — Assets + social
- [ ] **F13** Export app icon at iOS spec: 1024² master from `<AppIcon>` →
      generate 180/167/152/120/87/80/76/60/58/40/29/20pt @ 1×/2×/3×.
      Place in `dreamlink-ios/DreamLink/Assets.xcassets/AppIcon.appiconset/`
- [ ] **F13** Android adaptive icon: foreground = `<MoonwaterMark>` on
      transparent, background = solid `--night`
- [ ] **F14** Update `app/og/route.tsx` to use Night gradient bg, Moonwater
      + Cormorant wordmark top-left, gold radial glow upper-right
- [ ] Update `app/opengraph-image.png` and `app/twitter-image.png`

### Day 6 — Cleanup
- [ ] **F11** Archive or update UX Recommendations content
- [ ] **F12** `dashboards-print-app.jsx` print-export headers
- [ ] Remove `--blue-deep` / `--blue-soft` from any non-informational use
- [ ] Visual regression: screenshot every page before/after, diff

---

## 5 · Per-file change inventory

| File | Change |
|---|---|
| `app/globals.css` | Tokens (§1), delete Blanka `@font-face` |
| `app/layout.tsx` | Add Cormorant Garamond import |
| `components/Wordmark.tsx` | Replace with Cormorant version (§2) |
| `components/brand/MoonwaterMark.tsx` | **NEW** (§3) |
| `components/brand/AppIcon.tsx` | **NEW** (§3) |
| `components/SiteHeader.tsx` | Use AppIcon + Cormorant Wordmark; Sign Up button → gold |
| `components/Navbar.tsx` | Same as SiteHeader |
| `components/HeroVisual.tsx` | Phone interior — gold CTA, Moonwater nav mark, restyled pills |
| `app/landing/page.tsx` | Hero → Night gradient, all blue → gold, scripture pills restyled |
| `app/(auth-pages)/sign-up/page.tsx` | AppIcon replaces `<Moon>`, gradient text → gold-deep |
| `app/(auth-pages)/sign-in/page.tsx` | Same treatment as sign-up |
| `app/settings/_components/sidebar.tsx` | Lockup top, gold left-edge active row, plan badge restyle |
| `app/settings/_components/sections/*.tsx` | Gold save buttons, gold toggle on-state |
| `app/admin/_components/sidebar.tsx` | Lockup + admin badge + gold active row |
| `app/admin/_components/kpi-card.tsx` | `variant="gold"` → use cream-gold gradient (not blue) |
| `app/admin/page.tsx` | No structural changes; tokens cascade automatically |
| `app/og/route.tsx` | Night bg + Moonwater + Cormorant wordmark |
| `app/opengraph-image.png` | Regenerate from OG route |
| `app/twitter-image.png` | Same |
| `app/coming-soon/page.tsx` | Verify it picks up new tokens; adjust phone mockup |
| `app/favicon.ico` | Regenerate from MoonwaterMark in AppIcon at 32² + 16² |
| `dreamlink-ios/DreamLink/Assets.xcassets/AppIcon.appiconset/` | New icon set from 1024² master |
| `public/fonts/Blanka.otf` | **DELETE** |

---

## 6 · Quick visual sanity checklist

After each day, eyeball:
- ✅ No blue CTAs anywhere except informational badges
- ✅ Every page header shows Moonwater squircle + Cormorant wordmark
- ✅ "DreamRiver" never appears in all-caps (Blanka killed)
- ✅ Hero background is Night, not the old cream→blue gradient
- ✅ Active nav rows have a visible gold left edge
- ✅ Scripture pills are gold-deep on cream (not warm-amber)
- ✅ `pnpm typecheck` and `pnpm lint` pass

---

## 7 · Don'ts

- **Don't** outline the crescent — it's always filled.
- **Don't** recolor the moon — it's always gold.
- **Don't** flip the crescent horizontally — waxing only.
- **Don't** set the wordmark in all-caps or sans-serif.
- **Don't** introduce hex literals — use the CSS tokens.
- **Don't** move product surfaces to Night yet — that's a v2.1 night-mode
  decision (see Brand Audit § Strategic decision).
- **Don't** delete `--blue-deep` / `--blue-soft` entirely — they're still
  valid for informational-only accents (links to docs, tooltips).

---

## 8 · When in doubt

Open the corresponding `hi-fi-*.jsx` mockup file and copy the visual
treatment directly. The mockups are the ground truth.

If a tradeoff comes up that the audit didn't cover, decide using this rule:
**"Would this surface make sense as both a webpage AND a printed devotional
journal page?"** That's the brand's aesthetic compass — literary,
contemplative, sacred-but-not-ecclesiastical.
