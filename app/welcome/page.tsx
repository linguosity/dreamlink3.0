"use client";

// app/welcome — first-run onboarding flow (design handoff: "DreamRiver
// Onboarding Flow"). A self-contained, logged-out funnel: welcome → reading
// depth → email + consent → (stubbed) OTP verify → optional profile → plan →
// done. State persists to localStorage; account creation is stubbed behind
// finalizeOnboarding() until Supabase email OTP is configured.
//
// This route is intentionally separate from the existing post-signup
// /onboarding so nothing breaks; to make it the canonical front door later,
// point the landing "Get started" CTA here and wire finalizeOnboarding().

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lockup, Starfield, Pips, GoldBtn, Icon, FONTS } from "./_components/atoms";
import {
  StepWelcome, StepReading, StepEmail, StepVerify, StepProfile, StepPlan, StepDone,
} from "./_components/steps";
import {
  STEPS, load, save, finalizeOnboarding, type OnboardingData,
} from "./onboarding-lib";

function TermsModal({ onClose }: { onClose: () => void }) {
  const sections = [
    { h: "What we collect", b: "Your email address (required to create and secure your account), the dream entries you choose to write, and any optional profile details you provide. You may use DreamRiver without sharing a name or profile information." },
    { h: "How your dreams are used", b: "The text of a dream you submit is sent to our AI provider solely to generate your interpretation and, where enabled, an accompanying image. Interpretations are returned to your private journal. We do not publish, sell, or share your dream content." },
    { h: "Where it lives", b: "Entries and account data are stored on our managed database (Supabase). Dreams are private to your account by default and visible only to you unless you explicitly choose to share one." },
    { h: "Optional pattern research", b: "If you opt in, we may use anonymized dream themes — never the underlying content — to improve interpretation quality for everyone. This is off unless you turn it on, and you can change it anytime in Settings → Privacy." },
    { h: "Your choices", b: "You can export or permanently delete your journal and account at any time. Deleting your account removes your dream content from our active systems." },
    { h: "Billing", b: "The free tier includes 3 dream credits per calendar month. Paid plans are processed by a third-party payment provider; you will only be charged for a plan you explicitly purchase." },
  ];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "oklch(0.06 0.02 250 / 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--warm-paper)", borderRadius: 20, maxWidth: 540, width: "100%", maxHeight: "86vh", display: "flex", flexDirection: "column", boxShadow: "0 30px 70px oklch(0.05 0.02 250 / 0.5)", overflow: "hidden" }}>
        <div style={{ padding: "24px 28px 18px", borderBottom: "1px solid var(--warm-line)", display: "flex", alignItems: "center", gap: 13 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "oklch(0.95 0.04 80)", border: "1px solid oklch(0.87 0.07 80)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gold-deep)", flexShrink: 0 }}>
            <Icon name="fileText" size={20} stroke={1.7} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONTS.SERIF, fontSize: 20, color: "var(--warm-darker)", lineHeight: 1.1 }}>Terms &amp; Data Collection</div>
            <div style={{ fontSize: 11.5, color: "var(--warm-muted)", marginTop: 2 }}>Plain-language summary · draft for review</div>
          </div>
          <div onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--warm-muted)" }}>
            <Icon name="x" size={18} stroke={2} />
          </div>
        </div>
        <div style={{ padding: "20px 28px 26px", overflowY: "auto" }}>
          <div style={{ display: "grid", gap: 18 }}>
            {sections.map((s) => (
              <div key={s.h}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--warm-darker)", marginBottom: 5, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--gold)" }} />{s.h}
                </div>
                <p style={{ fontSize: 13, color: "var(--warm-dark)", lineHeight: 1.6 }}>{s.b}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 22, padding: "12px 15px", background: "oklch(0.96 0.025 80)", border: "1px solid oklch(0.88 0.05 80)", borderRadius: 11, fontSize: 11.5, color: "var(--gold-deep)", lineHeight: 1.55, display: "flex", gap: 9 }}>
            <Icon name="shieldCheck" size={16} stroke={1.7} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>This is a product draft, not final legal copy. Have counsel review before launch.</span>
          </div>
        </div>
        <div style={{ padding: "16px 28px", borderTop: "1px solid var(--warm-line)", display: "flex", justifyContent: "flex-end" }}>
          <GoldBtn onClick={onClose}>Got it</GoldBtn>
        </div>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  const router = useRouter();
  const [data, setData] = React.useState<OnboardingData>({});
  const [terms, setTerms] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  // Load persisted state after mount (avoids SSR/client hydration mismatch).
  React.useEffect(() => { setData(load()); setHydrated(true); }, []);
  React.useEffect(() => { if (hydrated) save(data); }, [data, hydrated]);

  const step = Math.min(data.step || 0, STEPS.length - 1);
  const id = STEPS[step];

  const update = (patch: Partial<OnboardingData>) => setData((d) => ({ ...d, ...patch }));
  const goTo = (n: number) => {
    setData((d) => ({ ...d, step: Math.max(0, Math.min(n, STEPS.length - 1)) }));
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };
  const next = () => goTo(step + 1);
  const back = () => goTo(step - 1);
  const restart = () => setData({ step: 0 });
  const finish = () => { finalizeOnboarding(data); router.push("/"); };

  const common = { data, update, next, back };
  let pane: React.ReactNode;
  if (id === "welcome") pane = <StepWelcome next={next} />;
  else if (id === "reading") pane = <StepReading {...common} />;
  else if (id === "email") pane = <StepEmail {...common} openTerms={() => setTerms(true)} />;
  else if (id === "verify") pane = <StepVerify {...common} />;
  else if (id === "profile") pane = <StepProfile {...common} />;
  else if (id === "plan") pane = <StepPlan {...common} />;
  else pane = <StepDone data={data} restart={restart} onFinish={finish} />;

  const showProgress = step > 0 && step < STEPS.length - 1;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "32px 20px", position: "relative",
      background:
        "radial-gradient(ellipse 80% 50% at 75% -8%, oklch(0.5 0.12 75 / 0.30) 0%, transparent 58%)," +
        "radial-gradient(ellipse 70% 55% at 5% 110%, oklch(0.35 0.07 245 / 0.40) 0%, transparent 55%)," +
        "linear-gradient(160deg, var(--night-deep) 0%, var(--night) 55%, var(--night-soft) 130%)",
    }}>
      <style>{`
        @keyframes ob-twinkle { 0%,100% { opacity: 0.25; } 50% { opacity: 0.85; } }
        @keyframes ob-paneIn { from { transform: translateY(12px); } to { transform: translateY(0); } }
        @keyframes ob-cardIn { from { transform: translateY(20px) scale(0.99); } to { transform: translateY(0) scale(1); } }
        .ob-card { animation: ob-cardIn 0.5s cubic-bezier(.2,.7,.3,1) both; }
        .ob-pane { animation: ob-paneIn 0.4s cubic-bezier(.2,.7,.3,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .ob-card, .ob-pane { animation: none; }
          svg circle[style*="ob-twinkle"] { animation: none !important; }
        }
      `}</style>
      <Starfield />
      <div style={{ width: "100%", maxWidth: 520, position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, padding: "0 4px" }}>
          <Lockup size={30} word={21} color="var(--cream)" />
          {showProgress
            ? <Pips total={STEPS.length - 2} current={step - 1} />
            : <span style={{ fontFamily: FONTS.MONO, fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "oklch(0.72 0.03 80)" }}>Get started</span>}
        </div>
        <div className="ob-card" style={{
          background: "var(--warm-paper)", border: "1px solid oklch(0.86 0.02 80)", borderRadius: 24,
          padding: "38px 40px 34px", boxShadow: "0 30px 70px oklch(0.05 0.02 250 / 0.5), 0 2px 0 oklch(1 0 0 / 0.5) inset",
          position: "relative", overflow: "hidden",
        }}>
          <div className="ob-pane" key={id}>{pane}</div>
        </div>
        <div style={{ textAlign: "center", marginTop: 22, fontSize: 12, color: "oklch(0.72 0.03 80)" }}>
          Not affiliated with any church or denomination · All are welcome
        </div>
      </div>
      {terms && <TermsModal onClose={() => setTerms(false)} />}
    </div>
  );
}
