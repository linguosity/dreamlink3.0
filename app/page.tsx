// app/page.tsx
//
// Technical explanation:
// Main page component (landing page after login). This component is responsible
// for fetching and displaying the user's dream entries. It includes
// functionality for adding new dreams (CompactDreamInput) and viewing existing
// ones in a gallery format (AnimatedDreamGrid).
//
// Analogy:
// This page is like the main living room of the "DreamRiver." It's where
// you first land after entering, see your collected dream items displayed
// (dream gallery), and have a convenient spot to jot down new dream experiences
// (dream input).

import { createClient } from "@/utils/supabase/server";
import { decryptDreamRow } from "@/lib/crypto";
import { redirect } from "next/navigation";
import Link from "next/link";
import CompactDreamInput from "@/components/CompactDreamInput";
import AnimatedDreamGrid from "@/components/AnimatedDreamGrid";
import { Sparkles } from "lucide-react";

// v2 Moonwater journal chrome: gallery filter pills. Visual-only for now —
// "All" is the active state; the others are placeholders for future filter
// wiring (Recurring themes, Starred, etc.). Matches hi-fi-journal lines 64–75.
const GALLERY_FILTERS = ["All", "This month", "Recurring themes", "Starred"] as const;

function formatJournalDate(d: Date): string {
  // "Tuesday · May 26, 2026" — weekday, dot separator, long date.
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const date = d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `${weekday} · ${date}`;
}

function firstNameFromEmail(email: string | null | undefined): string {
  if (!email) return "";
  const local = email.split("@")[0] ?? "";
  // Strip dots/underscores/numbers, take first segment, title-case it.
  const seg = local.split(/[._\d]/).find(Boolean) ?? local;
  return seg ? seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase() : "";
}

export default async function MainPage() {
  const supabase = await createClient();

  // Check if user is logged in (more secure method)
  const { data, error: userError } = await supabase.auth.getUser();
  const user = data?.user;

  if (userError) {
    console.error("Authentication error:", userError.message);
    // Don't redirect if it's a JWT error - the middleware should handle it
    // Only redirect for other types of errors
    if (!userError.message.includes('JWT') && !userError.message.includes('token')) {
      return redirect("/landing");
    }
  }
  
  if (!user) {
    console.error("No user in session - redirecting to landing page");
    
    // Add a small delay to ensure cookies are properly processed
    // This can help with issues related to cookie propagation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return redirect("/landing");
  }

  // Add a small delay after successful auth to ensure session is fully established
  // This helps prevent timing issues with subsequent API calls
  await new Promise(resolve => setTimeout(resolve, 100));

  // Check if user has completed onboarding (has a reading_level set)
  // and pull the admin/test-mode fields so we can warn admins when they're
  // about to fan out a submission across the comparison matrix.
  const { data: profile } = await supabase
    .from("profile")
    .select(
      "reading_level, is_admin, test_mode_enabled, test_mode_depths, test_mode_reading_levels, test_mode_aesthetics",
    )
    .eq("user_id", user.id)
    .single();

  if (!profile?.reading_level) {
    return redirect("/onboarding");
  }

  // Compute the matrix size the next submission will produce, so the banner
  // can show "5 cards per submission" without the admin guessing.
  const adminTestModeMatrixSize =
    profile.is_admin && profile.test_mode_enabled
      ? (profile.test_mode_depths?.length || 1) *
        (profile.test_mode_reading_levels?.length || 1) *
        (profile.test_mode_aesthetics?.length || 1)
      : 1;
  const showTestModeBanner =
    profile.is_admin && profile.test_mode_enabled && adminTestModeMatrixSize > 1;

  // Fetch dream entries for the logged in user
  const { data: dreamsRaw, error } = await supabase
    .from("dream_entries")
    .select("*")
    .eq("user_id", user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching dreams:", error.message);
  }

  const decryptedDreams = (dreamsRaw || []).map((row) => decryptDreamRow({ ...row }));

  // Admins also get a per-dream cost block (input/output tokens + image cost)
  // for the DreamCard footer. RLS already lets admins read all
  // chatgpt_interactions; for non-admins we skip this query entirely so we
  // don't pay for it on every page load.
  type AdminUsage = {
    input_tokens: number | null;
    output_tokens: number | null;
    image_generated: boolean | null;
    image_cost_usd: number | null;
  };
  const usageByDream = new Map<string, AdminUsage>();
  if (profile.is_admin && decryptedDreams.length > 0) {
    const dreamIds = decryptedDreams.map((d) => d.id).filter((id): id is string => Boolean(id));
    const { data: usageRows } = await supabase
      .from("chatgpt_interactions")
      .select(
        "dream_entry_id, input_tokens, output_tokens, image_generated, image_cost_usd",
      )
      .in("dream_entry_id", dreamIds);

    for (const row of usageRows ?? []) {
      if (!row.dream_entry_id) continue;
      // A dream may have multiple interaction rows (retries, etc.). The first
      // one we see wins — that's the original analysis call we want to inspect.
      if (!usageByDream.has(row.dream_entry_id)) {
        usageByDream.set(row.dream_entry_id, {
          input_tokens: row.input_tokens,
          output_tokens: row.output_tokens,
          image_generated: row.image_generated,
          image_cost_usd: row.image_cost_usd,
        });
      }
    }
  }

  // Attach _admin_usage onto each dream — using `any` for the same reason the
  // grid downstream uses a loose Dream shape: the Supabase row type carries 25+
  // nullable fields the grid doesn't care about.
  const dreams: any[] = decryptedDreams.map((d) => ({
    ...d,
    _admin_usage: profile.is_admin ? (usageByDream.get(d.id) ?? null) : undefined,
  }));

  const dreamCount = decryptedDreams.length;
  const firstName = firstNameFromEmail(user.email);
  const today = formatJournalDate(new Date());
  // "Pattern emerging" callout shows once a user has enough dreams to
  // plausibly hint at a recurring theme. Mockup spec: hi-fi-journal lines
  // 112–136. The CTA is visual for now — a future feature will populate
  // the actual pattern text.
  const showPatternHint = dreamCount >= 7;

  return (
    <div className="container py-6 sm:py-10 relative">
      <div className="max-w-4xl mx-auto space-y-8 sm:space-y-10 relative z-10">
        {/* Visually hidden H1 for SEO and screen readers */}
        <h1 className="sr-only">DreamRiver Dream Journal</h1>

        {/* Admin reminder: test mode is on. Surfaced here so an admin can't
            accidentally fan out a submission they thought was a normal one. */}
        {showTestModeBanner && (
          <div
            role="status"
            className="rounded-xl border-2 border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 flex items-start gap-3"
          >
            <span aria-hidden="true" className="text-lg">🧪</span>
            <div className="flex-1 text-sm">
              <div className="font-medium text-amber-900 dark:text-amber-100">
                Test mode is on
              </div>
              <div className="text-amber-800/80 dark:text-amber-200/80">
                Each dream submission will generate{" "}
                <strong>{adminTestModeMatrixSize} cards</strong> across your
                comparison matrix. Image generation is deduped by aesthetic.
              </div>
            </div>
            <Link
              href="/settings"
              className="text-xs font-medium text-amber-900 dark:text-amber-100 underline underline-offset-2 hover:no-underline whitespace-nowrap"
            >
              Disable
            </Link>
          </div>
        )}

        {/* Greeting — date eyebrow + serif welcome with italic name. */}
        <header>
          <div className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            {today}
          </div>
          <h2 className="font-serif text-[clamp(1.75rem,4vw,2.75rem)] leading-tight text-balance mt-2">
            Welcome back
            {firstName ? (
              <>
                , <span className="italic">{firstName}</span>.
              </>
            ) : (
              "."
            )}
          </h2>
          <p className="text-[15px] text-muted-foreground mt-1.5">
            {dreamCount === 0
              ? "Begin your first entry below."
              : `${dreamCount} dream${dreamCount === 1 ? "" : "s"} journaled.`}
          </p>
        </header>

        {/* Dream Input */}
        <div>
          <CompactDreamInput userId={user.id} />
        </div>

        {/* Gallery — serif heading + filter pills, then the grid. */}
        <div>
          <div className="flex items-baseline justify-between mb-5 gap-4 flex-wrap">
            <h2 className="font-serif text-[28px] font-normal leading-tight">
              Your dream gallery
            </h2>
            <div className="flex gap-1 text-[12.5px]" role="tablist" aria-label="Filter dreams">
              {GALLERY_FILTERS.map((f, i) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={i === 0}
                  className={
                    i === 0
                      ? "px-2.5 py-1 rounded-md bg-[color:var(--gold)] text-[color:var(--night-deep)] font-semibold"
                      : "px-2.5 py-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  }
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <AnimatedDreamGrid dreams={dreams || []} isAdmin={Boolean(profile.is_admin)} />
        </div>

        {/* Pattern-emerging insight — gentle nudge once enough dreams accumulate. */}
        {showPatternHint && (
          <aside className="rounded-2xl border border-[oklch(0.85_0.06_75)] bg-[oklch(0.96_0.025_75)] p-5 flex items-center gap-5">
            <div
              aria-hidden="true"
              className="w-12 h-12 rounded-xl bg-[oklch(0.93_0.04_75)] border border-[oklch(0.85_0.08_75)] text-[color:var(--gold-deep)] grid place-items-center shrink-0"
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-serif text-[17px] leading-tight">
                A pattern may be emerging
              </div>
              <p className="text-[13px] text-muted-foreground mt-1">
                You&rsquo;ve journaled {dreamCount} dreams. DreamRiver can look
                across your entries and surface recurring themes.
              </p>
            </div>
            <Link
              href="/account"
              className="hidden sm:inline-flex whitespace-nowrap h-9 px-3.5 items-center justify-center rounded-md border border-border text-[13px] font-medium hover:bg-muted transition-colors"
            >
              View patterns →
            </Link>
          </aside>
        )}
      </div>
    </div>
  );
}