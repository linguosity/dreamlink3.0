"use client";

// app/onboarding/page.tsx
//
// Multi-step onboarding flow for new users.
// Steps: Welcome → Reading Level → Bible Version → First Dream → Analysis Result
// Saves preferences to the profile table, submits the first dream,
// and redirects to the dashboard.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ReadingLevel } from "@/schema/profile";
import { ChevronLeft, Loader2 } from "lucide-react";

// ── Step definitions ──────────────────────────────────────────────

const READING_LEVELS = [
  {
    value: ReadingLevel.RADIANT_CLARITY,
    label: "Simple",
    desc: "Easy to understand.",
  },
  {
    value: ReadingLevel.CELESTIAL_INSIGHT,
    label: "Moderate",
    desc: "Some biblical context.",
  },
  {
    value: ReadingLevel.PROPHETIC_WISDOM,
    label: "Advanced",
    desc: "Detailed analysis.",
  },
  {
    value: ReadingLevel.DIVINE_REVELATION,
    label: "Scholarly",
    desc: "Academic depth.",
  },
] as const;

const BIBLE_VERSIONS = [
  { value: "KJV", label: "KJV" },
  { value: "NIV", label: "NIV" },
  { value: "ESV", label: "ESV" },
  { value: "NLT", label: "NLT" },
] as const;

const TOTAL_STEPS = 5;

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  // Shared state
  const [step, setStep] = useState(1);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // Step data
  const [readingLevel, setReadingLevel] = useState<string>(
    ReadingLevel.CELESTIAL_INSIGHT,
  );
  const [bibleVersion, setBibleVersion] = useState("NIV");
  const [dreamText, setDreamText] = useState("");

  // Analysis result
  const [analysis, setAnalysis] = useState<{
    dreamTitle: string;
    analysis: string;
    personalizedSummary: string;
    biblicalReferences: { citation: string; verseText: string }[];
  } | null>(null);

  // Loading states
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Fetch user on mount
  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/sign-in");
        return;
      }
      setUserId(user.id);
      // Extract name from email (before @) as fallback
      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Friend";
      setUserName(name.charAt(0).toUpperCase() + name.slice(1));
    }
    loadUser();
  }, [supabase, router]);

  // ── Handlers ──────────────────────────────────────────────────

  async function savePreferences() {
    if (!userId) return;
    setSaving(true);
    try {
      await supabase
        .from("profile")
        .upsert(
          {
            user_id: userId,
            reading_level: readingLevel,
            bible_version: bibleVersion,
          },
          { onConflict: "user_id" },
        );
    } catch (err) {
      console.error("Failed to save preferences:", err);
    } finally {
      setSaving(false);
    }
  }

  async function submitDream() {
    if (!dreamText.trim() || !userId) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/dream-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dream_text: dreamText }),
      });

      if (!res.ok) throw new Error("Dream submission failed");

      const data = await res.json();

      // Extract analysis from response
      if (data.analysis) {
        setAnalysis({
          dreamTitle: data.analysis.dreamTitle || "Your Dream",
          analysis: data.analysis.analysis || data.analysis.personalizedSummary || "",
          personalizedSummary: data.analysis.personalizedSummary || "",
          biblicalReferences: (data.analysis.biblicalReferences || []).slice(
            0,
            3,
          ),
        });
      }

      setStep(5);
    } catch (err) {
      console.error("Dream submission error:", err);
      // Still advance but show a fallback
      setAnalysis(null);
      setStep(5);
    } finally {
      setAnalyzing(false);
    }
  }

  function goBack() {
    if (step > 1) setStep(step - 1);
  }

  async function finish() {
    router.replace("/");
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-accent/30 via-background to-accent/30 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Back button (steps 2-4) */}
        {step > 1 && step < 5 && (
          <button
            onClick={goBack}
            className="mb-6 flex items-center gap-1 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
        )}

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i + 1 === step
                  ? "w-8 bg-primary"
                  : i + 1 < step
                    ? "w-4 bg-primary/60"
                    : "w-4 bg-gray-200 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* ── Step 1: Welcome ──────────────────────────────────── */}
        {step === 1 && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 sm:p-10 text-center animate-fade-in">
            {/* Logo */}
            <p className="font-blanka tracking-wider text-2xl text-gray-900 dark:text-white mb-6">
              DreamRiver
            </p>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
              Welcome,
              <br />
              {userName}!
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg mt-3 mb-8">
              Let&apos;s set up your dream journal.
            </p>

            <Button
              onClick={() => setStep(2)}
              size="lg"
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground rounded-full py-6 text-base font-semibold"
            >
              Get Started.
            </Button>

            <p className="text-xs text-gray-400 mt-4">
              Takes less than 2 minutes
            </p>
          </div>
        )}

        {/* ── Step 2: Reading Level ────────────────────────────── */}
        {step === 2 && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 sm:p-10 animate-fade-in">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-8">
              Reading Level.
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {READING_LEVELS.map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => setReadingLevel(value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    readingLevel === value
                      ? "border-primary bg-accent/40"
                      : "border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500"
                  }`}
                >
                  <p className="font-bold text-gray-900 dark:text-white text-sm">
                    {label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {desc}
                  </p>
                </button>
              ))}
            </div>

            <Button
              onClick={() => setStep(3)}
              size="lg"
              className="w-full mt-8 bg-primary hover:bg-primary-hover text-primary-foreground rounded-full py-6 text-base font-semibold"
            >
              Continue
            </Button>

            <button
              onClick={() => setStep(3)}
              className="block w-full text-center text-sm text-primary hover:text-primary-hover mt-4"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* ── Step 3: Bible Version ────────────────────────────── */}
        {step === 3 && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 sm:p-10 animate-fade-in">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-8">
              Bible Version.
            </h2>

            <div className="space-y-3">
              {BIBLE_VERSIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setBibleVersion(value)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                    bibleVersion === value
                      ? "border-primary bg-accent/40"
                      : "border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500"
                  }`}
                >
                  {/* Radio indicator */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      bibleVersion === value
                        ? "border-primary"
                        : "border-gray-300 dark:border-slate-500"
                    }`}
                  >
                    {bibleVersion === value && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {label}
                  </span>
                </button>
              ))}
            </div>

            <Button
              onClick={async () => {
                await savePreferences();
                setStep(4);
              }}
              disabled={saving}
              size="lg"
              className="w-full mt-8 bg-primary hover:bg-primary-hover text-primary-foreground rounded-full py-6 text-base font-semibold"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Continue"
              )}
            </Button>

            <button
              onClick={async () => {
                await savePreferences();
                setStep(4);
              }}
              className="block w-full text-center text-sm text-primary hover:text-primary-hover mt-4"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* ── Step 4: Write First Dream ────────────────────────── */}
        {step === 4 && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 sm:p-10 animate-fade-in">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
              Write Your
              <br />
              First Dream.
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              Describe it in as much detail as you remember.
            </p>

            <textarea
              value={dreamText}
              onChange={(e) => setDreamText(e.target.value)}
              placeholder="I was walking through a garden with tall trees and blooming flowers..."
              rows={6}
              className="w-full resize-none rounded-xl border border-border bg-secondary p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              maxLength={8000}
            />

            <Button
              onClick={submitDream}
              disabled={analyzing || dreamText.trim().length < 10}
              size="lg"
              className="w-full mt-6 bg-primary hover:bg-primary-hover text-primary-foreground rounded-full py-6 text-base font-semibold disabled:opacity-50"
            >
              {analyzing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Interpreting...
                </span>
              ) : (
                "Get Interpretation."
              )}
            </Button>

            <button
              onClick={finish}
              className="block w-full text-center text-sm text-primary hover:text-primary-hover mt-4"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* ── Step 5: Analysis Result ──────────────────────────── */}
        {step === 5 && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 sm:p-10 animate-fade-in">
            {analysis ? (
              <>
                {/* Sparkle decoration */}
                <div className="flex justify-center mb-4">
                  <div className="text-amber-400 text-2xl">&#10022; &#10022; &#10022;</div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-4 text-center">
                  {analysis.dreamTitle}
                </h2>

                {/* Analysis card */}
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 mb-6">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {analysis.personalizedSummary || analysis.analysis}
                  </p>

                  {analysis.biblicalReferences.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Scripture Reference
                      </p>
                      {analysis.biblicalReferences.map((ref, i) => (
                        <p
                          key={i}
                          className="text-sm text-gray-700 dark:text-gray-300 mb-1"
                        >
                          <span className="font-semibold">
                            {ref.citation}
                          </span>
                          {ref.verseText && (
                            <span>
                              {" "}
                              &mdash; {ref.verseText}
                            </span>
                          )}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-4 text-center">
                  Dream Saved
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-6">
                  Your dream has been saved. You can view the full interpretation on your dashboard.
                </p>
              </>
            )}

            <Button
              onClick={finish}
              size="lg"
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground rounded-full py-6 text-base font-semibold"
            >
              Go to My Journal
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
