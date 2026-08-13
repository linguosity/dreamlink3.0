"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import localFont from "next/font/local";

// global-error REPLACES the root layout, which means it inherits nothing from
// it — including the stylesheet. The previous version styled itself with
// Tailwind classes (bg-background, text-foreground) that were never loaded
// here, so the one screen a user sees when the whole app has failed rendered
// as raw unstyled HTML. Importing globals.css directly is the fix, and it has
// to be this file: the layout that normally imports it is gone by definition.
import "./globals.css";

// Same reason: next/font sets its CSS variables on the element it is applied
// to, and that element lived in the root layout. Loading the two text faces
// here keeps the brand intact on the worst screen in the product. Quicksand is
// deliberately omitted — it is wordmark-only, and there is no wordmark here.
// Self-hosted, same as the root layout — see the note there. This file
// mattered most for that fix: a build that dies fetching fonts takes the
// error screen down with it, so the one page that exists for when everything
// else has failed would have been the first casualty.
const jost = localFont({
  src: [
    { path: "./fonts/jost-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/jost-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/jost-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
  variable: "--font-jost",
});

const newsreader = localFont({
  src: [
    { path: "./fonts/newsreader-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/newsreader-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
  variable: "--font-newsreader",
});

/**
 * Last-resort boundary: the root layout itself threw, so there is no navbar,
 * no theme provider and no way back except a hard link.
 *
 * Because next-themes never mounts here, the `.dark` class is never applied
 * and this always renders in the light palette. That is a deliberate
 * trade-off rather than an oversight — a dark-mode user sees one light screen
 * at the moment everything is already broken, which is a smaller problem than
 * shipping a second hand-maintained copy of the palette.
 *
 * The mark is inlined rather than imported from components/brand: anything
 * this file pulls in is a thing that can fail on the screen whose whole job
 * is to survive failure.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className={`${jost.variable} ${newsreader.variable}`}>
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          margin: 0,
          background: "var(--paper, #FBFAFF)",
          color: "var(--navy-900, #0A0E33)",
          fontFamily: "var(--font-jost), ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "32rem" }}>
          {/* Navy squircle + river mark, matching BrandIcon's fixed tile. */}
          <div
            aria-hidden="true"
            style={{
              width: 56,
              height: 56,
              margin: "0 auto 1.75rem",
              borderRadius: "22%",
              background: "#0A0E33",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#EEEBFC"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M2 8c3.2 0 3.2 2.4 6.4 2.4S11.6 8 14.8 8 18 10.4 22 10.4" />
              <path d="M2 13.6c3.2 0 3.2 2.4 6.4 2.4s3.2-2.4 6.4-2.4 3.2 2.4 7.2 2.4" />
            </svg>
          </div>

          <h1
            style={{
              fontFamily:
                "var(--font-newsreader), ui-serif, Georgia, serif",
              fontSize: "2rem",
              fontWeight: 600,
              margin: "0 0 0.75rem",
              lineHeight: 1.2,
            }}
          >
            The current broke
          </h1>

          <p
            style={{
              fontSize: "1rem",
              lineHeight: 1.6,
              margin: "0 0 1.75rem",
              color: "#4A4A6A",
            }}
          >
            An unexpected error occurred and DreamRiver couldn&apos;t load. Our
            team has been notified. Your dreams are safe — nothing was lost.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => reset()}
              style={{
                minHeight: 44,
                padding: "0.75rem 1.5rem",
                borderRadius: "0.75rem",
                border: "none",
                background: "#6E35EE",
                color: "#FFFFFF",
                fontSize: "0.95rem",
                fontWeight: 500,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {/* A plain anchor, not next/link, on purpose: the router is part
                of what just failed, so a full document load is the only
                reliable way out. next/link would attempt a client-side
                navigation through the very thing that threw. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                minHeight: 44,
                padding: "0.75rem 1.5rem",
                borderRadius: "0.75rem",
                border: "1px solid #E4E1F3",
                color: "#0A0E33",
                fontSize: "0.95rem",
                fontWeight: 500,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Back to my dreams
            </a>
          </div>

          {error.digest && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "#6B6B8A",
                marginTop: "1.75rem",
              }}
            >
              If you tell us about this, include{" "}
              <code
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: "0.7rem",
                  padding: "0.15rem 0.4rem",
                  borderRadius: "0.25rem",
                  background: "#EEEBFC",
                  color: "#0A0E33",
                }}
              >
                {error.digest}
              </code>
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
