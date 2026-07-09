"use client";

import { useEffect } from "react";

/**
 * Registers the hand-rolled service worker at /public/sw.js.
 *
 * - Production only: in dev the SW would cache stale /_next/static chunks
 *   and fight hot reload.
 * - Registered after window `load` so it never competes with first paint.
 * - Renders nothing; drop it anywhere inside the root layout/providers.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          console.error("[sw] registration failed:", err);
        });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}

export default ServiceWorkerRegistration;
