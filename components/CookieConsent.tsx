"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user has already responded to cookie consent
    const consent = localStorage.getItem("dreamriver-cookie-consent");
    if (!consent) {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

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
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-fade-in">
      <div className="mx-auto max-w-xl rounded-lg border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-lg p-4 sm:p-5">
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          We use essential cookies to keep you signed in and make the app work.
          We don&apos;t use tracking or advertising cookies. By continuing, you
          agree to our{" "}
          <Link
            href="/privacy"
            className="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={accept}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Got it
          </button>
          <button
            onClick={decline}
            className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Decline non-essential
          </button>
        </div>
      </div>
    </div>
  );
}
