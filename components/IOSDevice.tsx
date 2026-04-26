"use client";

import type { ReactNode } from "react";

interface IOSDeviceProps {
  children: ReactNode;
  /** Pixel width of the device chrome. Splash design uses 270. */
  width?: number;
  /** Pixel height of the device chrome. Aspect ratio ~270:580 for the splash. */
  height?: number;
  /** "9:41" by default — Apple's canonical screenshot time. */
  time?: string;
}

/**
 * Minimal iOS device frame for marketing mockups. Trimmed from the full
 * IOSDevice in the design handoff (which also bundled IOSStatusBar,
 * IOSNavBar, IOSGlassPill, IOSList, IOSKeyboard) — the splash only needs
 * the outer chrome + status bar + dynamic island + home indicator.
 *
 * Inline styles only. Tailwind tokens reference the warm palette but the
 * frame itself is iOS-spec colors (dark dynamic island, light gray chrome).
 */
export default function IOSDevice({
  children,
  width = 270,
  height = 580,
  time = "9:41",
}: IOSDeviceProps) {
  return (
    <div
      style={{ width, height }}
      className="relative rounded-[40px] overflow-hidden bg-[#F2F2F7] shadow-[0_40px_80px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.12)]"
    >
      {/* Dynamic island */}
      <div
        aria-hidden="true"
        className="absolute top-2 left-1/2 -translate-x-1/2 w-[84px] h-[24px] rounded-full bg-black z-50"
      />

      {/* Status bar */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <span
            className="text-[12px] font-semibold leading-none text-black tabular-nums"
            style={{ fontFamily: '-apple-system, "SF Pro", system-ui' }}
          >
            {time}
          </span>
          <div className="flex items-center gap-1.5">
            {/* Cellular */}
            <svg width="14" height="9" viewBox="0 0 19 12" aria-hidden="true">
              <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill="black" />
              <rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill="black" />
              <rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill="black" />
              <rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill="black" />
            </svg>
            {/* Wi-Fi */}
            <svg width="13" height="9" viewBox="0 0 17 12" aria-hidden="true">
              <path
                d="M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z"
                fill="black"
              />
              <path
                d="M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z"
                fill="black"
              />
              <circle cx="8.5" cy="10.5" r="1.5" fill="black" />
            </svg>
            {/* Battery */}
            <svg width="20" height="10" viewBox="0 0 27 13" aria-hidden="true">
              <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="black" strokeOpacity="0.35" fill="none" />
              <rect x="2" y="2" width="20" height="9" rx="2" fill="black" />
              <path d="M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z" fill="black" fillOpacity="0.4" />
            </svg>
          </div>
        </div>
      </div>

      {/* Screen content */}
      <div className="absolute inset-0 pt-[42px] pb-[28px]">
        <div className="h-full w-full overflow-hidden">{children}</div>
      </div>

      {/* Home indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-[24px] flex items-end justify-center pb-2 pointer-events-none z-50">
        <div className="w-[100px] h-[4px] rounded-full bg-black/25" />
      </div>
    </div>
  );
}
