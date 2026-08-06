// app/og/route.tsx
//
// The dynamic og:image / social card template.
// Visited at /og it renders a 1200×630 PNG (and 1200×675 if `?w=1200&h=675`
// is passed for X/Twitter). The page metadata in app/layout.tsx points
// `openGraph.images` and `twitter.images` at this route, so every page
// that doesn't override gets the canonical card.
//
// Default headline matches the splash/launch copy. A `?title=…` query
// param overrides it — handy for blog posts, feature launches, or
// promotional links without hand-stamping a new image each time.
//
// Visual: v3 "Deep Current" — a flat Navy 900 ground (no gradient outside
// the logo, HANDOFF-v3.md §0/§8), contained mark + wordmark top-left, and a
// serif headline center-left.
//
// NOTE: the mark below still draws the pre-v3 (Moonwater) path shapes,
// recolored to the Deep Current palette, as an interim step — Satori (the
// edge renderer here) can't import the <DrLogo> web component, so porting
// the real dr-logo BARS path data into raw inline <svg> is tracked as v3
// Logo-phase follow-up rather than done in this token pass.

import { ImageResponse } from "next/og";

export const runtime = "edge";

const NAVY_900  = "#0A0E33";
const INK       = "#F0EFFC";
const VIOLET_LT = "#B39BFF";

const DEFAULT_TITLE = "Discover what God is saying through your dreams";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") ?? DEFAULT_TITLE;
  const width  = Number(searchParams.get("w") ?? 1200);
  const height = Number(searchParams.get("h") ?? 630);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: NAVY_900,
          padding: 72,
          position: "relative",
          color: INK,
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand lockup — contained mark + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: NAVY_900,
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Interim inline mark — see file header note. */}
            <svg width={40} height={40} viewBox="0 0 64 64">
              <g transform="rotate(15 32 25)">
                <path d="M32 11 A14 14 0 1 0 32 39 A9 14 0 1 1 32 11 Z" fill={VIOLET_LT} />
              </g>
              <path
                d="M14 56 C 22 50, 26 50, 32 56 C 38 62, 42 62, 50 56"
                stroke={VIOLET_LT}
                strokeWidth={2}
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M10 48 C 18 42, 22 42, 30 48 C 38 54, 42 54, 54 48"
                stroke={INK}
                strokeWidth={2}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
          <span
            style={{
              fontSize: 36,
              fontWeight: 500,
              letterSpacing: "0.08em",
              color: INK,
            }}
          >
            DREAMRIVER
          </span>
        </div>

        {/* Headline — centered vertically, left aligned */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            maxWidth: 860,
          }}
        >
          <div
            style={{
              fontSize: 64,
              lineHeight: 1.12,
              fontWeight: 400,
              color: INK,
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </div>
        </div>

        {/* Footer rule + tagline */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(179,155,255,0.25)",
            paddingTop: 18,
            fontSize: 18,
            color: "rgba(240,239,252,0.75)",
            letterSpacing: "0.04em",
          }}
        >
          <span>AI-powered biblical dream interpretation</span>
          <span style={{ color: VIOLET_LT, fontWeight: 600 }}>dreamriver.io</span>
        </div>
      </div>
    ),
    { width, height },
  );
}
