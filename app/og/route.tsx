// app/og/route.tsx
//
// F14 (v2 Moonwater) — the dynamic og:image / social card template.
// Visited at /og it renders a 1200×630 PNG (and 1200×675 if `?w=1200&h=675`
// is passed for X/Twitter). The page metadata in app/layout.tsx points
// `openGraph.images` and `twitter.images` at this route, so every page
// that doesn't override gets the canonical card.
//
// Default headline matches the splash/launch copy. A `?title=…` query
// param overrides it — handy for blog posts, feature launches, or
// promotional links without hand-stamping a new image each time.
//
// Visual: Night gradient ground, contained Moonwater + wordmark top-left,
// a soft gold radial in the upper-right (the "moon glow"), and a serif
// headline center-left. Matches the audit's F14 target mockup.

import { ImageResponse } from "next/og";

export const runtime = "edge";

const NIGHT      = "#0E1A30";
const NIGHT_DEEP = "#08111F";
const NIGHT_SOFT = "#1A2748";
const CREAM      = "#F5ECD6";
const GOLD       = "#D4A247";

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
          background: `linear-gradient(170deg, ${NIGHT_DEEP} 0%, ${NIGHT} 45%, ${NIGHT_SOFT} 100%)`,
          padding: 72,
          position: "relative",
          color: CREAM,
          fontFamily: "sans-serif",
        }}
      >
        {/* Gold moon glow in the upper-right corner */}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -180,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(212,162,71,0.32) 0%, rgba(212,162,71,0) 65%)",
            display: "flex",
          }}
        />

        {/* Brand lockup — contained Moonwater squircle + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: NIGHT,
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Inline Moonwater SVG — same paths as MoonwaterMark.tsx */}
            <svg width={40} height={40} viewBox="0 0 64 64">
              <g transform="rotate(15 32 25)">
                <path d="M32 11 A14 14 0 1 0 32 39 A9 14 0 1 1 32 11 Z" fill={GOLD} />
              </g>
              <path
                d="M14 56 C 22 50, 26 50, 32 56 C 38 62, 42 62, 50 56"
                stroke={GOLD}
                strokeWidth={2}
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M10 48 C 18 42, 22 42, 30 48 C 38 54, 42 54, 54 48"
                stroke={CREAM}
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
              color: CREAM,
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
              color: CREAM,
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
            borderTop: "1px solid rgba(212,162,71,0.25)",
            paddingTop: 18,
            fontSize: 18,
            color: "rgba(245,236,214,0.75)",
            letterSpacing: "0.04em",
          }}
        >
          <span>AI-powered biblical dream interpretation</span>
          <span style={{ color: GOLD, fontWeight: 600 }}>dreamriver.io</span>
        </div>
      </div>
    ),
    { width, height },
  );
}
