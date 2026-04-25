"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("dreamriver-cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      document.body.dataset.cookieBanner = "visible";
    } else {
      delete document.body.dataset.cookieBanner;
    }
    return () => {
      delete document.body.dataset.cookieBanner;
    };
  }, [visible]);

  const accept = () => {
    localStorage.setItem("dreamriver-cookie-consent", "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("dreamriver-cookie-consent", "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed z-40 left-4 right-4 bottom-4
                 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm
                 rounded-2xl shadow-xl ring-1 ring-black/5
                 border border-gray-200 dark:border-gray-700
                 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm
                 p-4 sm:p-5 animate-fade-in"
    >
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        We use essential cookies to keep you signed in and make the app work.
        We don&apos;t use tracking or advertising cookies. By continuing, you
        agree to our{" "}
        <Link
          href="/privacy"
          className="underline text-primary hover:text-primary-hover focus-ring rounded"
        >
          Privacy Policy
        </Link>
        .
      </p>
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={accept}
          className="tap inline-flex items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors focus-ring"
        >
          Got it
        </button>
        <button
          onClick={decline}
          className="tap inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-ring"
        >
          Decline non-essential
        </button>
      </div>
    </div>
  );
}
