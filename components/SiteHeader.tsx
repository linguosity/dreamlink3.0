"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Wordmark from "@/components/Wordmark";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const ids = ["how-it-works", "features", "sample-interpretation", "faq"];
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );
    elements.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const navLinkClass = (id: string) =>
    `relative text-sm font-medium transition-colors focus-ring rounded px-1 py-0.5
     after:content-[''] after:absolute after:left-1 after:right-1 after:-bottom-1
     after:h-0.5 after:bg-primary after:origin-left after:transition-transform
     ${
       active === id
         ? "text-gray-900 dark:text-white after:scale-x-100"
         : "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white after:scale-x-0"
     }`;

  return (
    <nav
      className={`sticky top-0 z-50 transition-shadow backdrop-blur-md
                  bg-white/80 dark:bg-slate-950/80
                  border-b border-gray-200/70 dark:border-slate-800/70
                  ${scrolled ? "shadow-sm" : "shadow-none"}`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link
          href="/landing"
          className="focus-ring rounded text-xl text-gray-900 dark:text-white"
        >
          <Wordmark />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          <a href="#features" className={navLinkClass("features")}>
            Features
          </a>
          <a href="#how-it-works" className={navLinkClass("how-it-works")}>
            How It Works
          </a>
          <Link
            href="/sign-in"
            className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors focus-ring rounded px-1 py-0.5"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center h-10 px-6 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium transition-colors focus-ring"
          >
            Sign Up
          </Link>
        </div>

        {/* Mobile trigger */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center w-11 h-11 -mr-2 rounded-lg text-gray-700 dark:text-gray-200 focus-ring"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            {open ? (
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-nav"
        hidden={!open}
        className="md:hidden border-t border-gray-200/70 dark:border-slate-800/70 bg-white dark:bg-slate-950"
      >
        <div className="px-4 py-4 flex flex-col gap-1">
          <a
            href="#features"
            onClick={() => setOpen(false)}
            className="tap block py-3 px-2 text-base font-medium text-gray-800 dark:text-gray-100 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 focus-ring"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            onClick={() => setOpen(false)}
            className="tap block py-3 px-2 text-base font-medium text-gray-800 dark:text-gray-100 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 focus-ring"
          >
            How It Works
          </a>
          <Link
            href="/sign-in"
            onClick={() => setOpen(false)}
            className="tap block py-3 px-2 text-base font-medium text-gray-800 dark:text-gray-100 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 focus-ring"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            onClick={() => setOpen(false)}
            className="mt-2 inline-flex items-center justify-center w-full h-11 px-6 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium transition-colors focus-ring"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </nav>
  );
}
