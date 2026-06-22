"use client";

// The 7 onboarding step screens + PlanCard + PendingModal. Ported from the
// design handoff prototype into the codebase's React/TSX + atoms.

import * as React from "react";
import Link from "next/link";
import {
  Icon, AppIcon, GoldBtn, StepBadge, TextField, Check, NavRow, FONTS,
} from "./atoms";
import { MoonwaterMark } from "@/components/brand/MoonwaterMark";
import type { OnboardingData, ReadingDepthId } from "../onboarding-lib";

type StepProps = {
  data: OnboardingData;
  update: (patch: Partial<OnboardingData>) => void;
  next: () => void;
  back: () => void;
};

const H2: React.CSSProperties = { fontFamily: FONTS.SERIF, fontSize: 30, lineHeight: 1.12, color: "var(--warm-darker)", marginBottom: 8 };
const SUB: React.CSSProperties = { fontSize: 14.5, color: "var(--warm-muted)", marginBottom: 24, lineHeight: 1.55 };

/* ── 0 · Welcome ── */
export function StepWelcome({ next }: { next: () => void }) {
  const rows = [
    { icon: "penLine", t: "Write your dream", d: "In your own words, the moment you wake." },
    { icon: "sparkles", t: "Receive an interpretation", d: "Biblical themes and symbolism, in seconds." },
    { icon: "bookOpen", t: "Reflect with scripture", d: "Verses chosen to match your dream." },
  ];
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <AppIcon size={84} radius={24}><MoonwaterMark size={52} /></AppIcon>
      </div>
      <div style={{ fontFamily: FONTS.MONO, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--gold-deep)", marginBottom: 14 }}>Welcome to</div>
      <h1 style={{ fontFamily: FONTS.WORDMARK, fontStyle: "italic", fontWeight: 500, fontSize: 40, lineHeight: 1.08, color: "var(--gold-deep)", marginBottom: 16 }}>DreamRiver</h1>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: "var(--warm-muted)", maxWidth: "38ch", margin: "0 auto 32px" }}>
        A quiet place to record your dreams and discover what God may be saying through them — every reading grounded in scripture.
      </p>
      <div style={{ display: "grid", gap: 12, textAlign: "left", maxWidth: 360, margin: "0 auto 34px" }}>
        {rows.map((r) => (
          <div key={r.t} style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: "oklch(0.95 0.04 80)", border: "1px solid oklch(0.87 0.07 80)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gold-deep)", flexShrink: 0 }}>
              <Icon name={r.icon} size={19} stroke={1.7} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--warm-darker)" }}>{r.t}</div>
              <div style={{ fontSize: 12.5, color: "var(--warm-muted)" }}>{r.d}</div>
            </div>
          </div>
        ))}
      </div>
      <GoldBtn full onClick={next}>Begin <Icon name="arrowRight" size={18} color="var(--night-deep)" stroke={2.2} /></GoldBtn>
      <div style={{ fontSize: 12.5, color: "var(--warm-muted)", marginTop: 16 }}>
        Already have an account?{" "}
        <Link href="/sign-in" style={{ color: "var(--gold-deep)", fontWeight: 600 }}>Sign in</Link>
      </div>
    </div>
  );
}

/* ── 1 · Reading level ── */
export const LEVELS: { id: ReadingDepthId; icon: string; name: string; tag: string; desc: string; rec?: boolean }[] = [
  { id: "still", icon: "leaf", name: "Still Waters", tag: "Simple", desc: "Plain, gentle language. One clear meaning and a verse or two." },
  { id: "river", icon: "waves", name: "Flowing River", tag: "Balanced", desc: "An everyday reading with symbolism and supporting scripture.", rec: true },
  { id: "celestial", icon: "sparkles", name: "Celestial Insight", tag: "Deeper", desc: "Richer symbolism, layered themes, and more scripture to sit with." },
  { id: "scholarly", icon: "scroll", name: "Scholarly Depths", tag: "Theological", desc: "Original-language notes and fuller exegesis for serious study." },
];

export function StepReading({ data, update, next, back }: StepProps) {
  const sel = data.readingLevel || "river";
  return (
    <div>
      <StepBadge name="bookOpen" />
      <h2 style={H2}>How deep should your readings go?</h2>
      <p style={SUB}>Choose the voice of your interpretations. You can change this anytime in Settings.</p>
      <div style={{ display: "grid", gap: 10, marginBottom: 28 }}>
        {LEVELS.map((l) => {
          const active = sel === l.id;
          return (
            <div key={l.id} onClick={() => update({ readingLevel: l.id })} style={{
              display: "flex", gap: 14, alignItems: "flex-start", padding: "15px 16px", borderRadius: 13, cursor: "pointer",
              background: active ? "oklch(0.96 0.045 80)" : "white",
              border: `1.5px solid ${active ? "var(--gold)" : "var(--warm-line)"}`,
              outline: active ? "3px solid oklch(0.72 0.14 75 / 0.14)" : "3px solid transparent", transition: "all 0.15s",
            }}>
              <div style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: active ? "var(--gold)" : "oklch(0.96 0.02 80)", color: active ? "var(--night-deep)" : "var(--gold-deep)", transition: "all 0.15s" }}>
                <Icon name={l.icon} size={21} stroke={1.7} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: FONTS.SERIF, fontSize: 17, color: "var(--warm-darker)" }}>{l.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--gold-deep)", background: "oklch(0.94 0.05 80)", padding: "2px 7px", borderRadius: 100 }}>{l.tag}</span>
                  {l.rec && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--night-deep)", background: "var(--gold-light)", padding: "2px 7px", borderRadius: 100 }}>Recommended</span>}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--warm-muted)", lineHeight: 1.5 }}>{l.desc}</div>
              </div>
              <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 2, border: `1.5px solid ${active ? "var(--gold)" : "var(--warm-line)"}`, background: active ? "var(--gold)" : "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {active && <Icon name="check" size={12} color="var(--night-deep)" stroke={3} />}
              </div>
            </div>
          );
        })}
      </div>
      <NavRow back={back} next={next} />
    </div>
  );
}

/* ── 2 · Email + consent ── */
export function StepEmail({ data, update, next, back, openTerms }: StepProps & { openTerms: () => void }) {
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || "");
  const canGo = valid && !!data.agreeTerms;
  return (
    <div>
      <StepBadge name="mail" />
      <h2 style={H2}>Where should we save your journal?</h2>
      <p style={SUB}>We&rsquo;ll verify your email before creating your free account. Your dreams stay private to you.</p>
      <div style={{ marginBottom: 20 }}>
        <TextField label="Email address" type="email" icon="mail" autoFocus value={data.email || ""} onChange={(v) => update({ email: v })} placeholder="you@example.com" />
      </div>
      <div style={{ display: "grid", gap: 14, padding: "16px 18px", background: "oklch(0.98 0.008 80)", border: "1px solid var(--warm-line)", borderRadius: 12, marginBottom: 26 }}>
        <Check checked={!!data.agreeTerms} onChange={(v) => update({ agreeTerms: v })}>
          I agree to the{" "}
          <span onClick={(e) => { e.stopPropagation(); openTerms(); }} style={{ color: "var(--gold-deep)", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 2 }}>Terms &amp; Privacy Policy</span>, including how my dream entries are processed.
        </Check>
        <Check checked={!!data.agreeResearch} onChange={(v) => update({ agreeResearch: v })}>
          <span style={{ color: "var(--warm-muted)" }}>Optionally, use my anonymized dream <em>themes</em> (never the content) to improve interpretations for everyone.</span>
        </Check>
      </div>
      <NavRow back={back} next={next} disabled={!canGo} nextLabel="Send verification code" />
      {!data.agreeTerms && valid && (
        <div style={{ fontSize: 12, color: "var(--warm-muted)", textAlign: "center", marginTop: 12 }}>Please accept the terms to continue.</div>
      )}
    </div>
  );
}

/* ── 3 · Verify (OTP stubbed) ── */
export function StepVerify({ data, update, next, back }: StepProps) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  const code = data.code || ["", "", "", "", "", ""];
  const [resent, setResent] = React.useState(false);
  const filled = code.every((c) => c !== "");

  const setDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, "").slice(-1);
    const nc = [...code]; nc[i] = d; update({ code: nc });
    if (d && i < 5) refs.current[i + 1]?.focus();
  };
  const onKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[i] && i > 0) refs.current[i - 1]?.focus();
  };
  const onPaste = (e: React.ClipboardEvent) => {
    const t = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (t) { e.preventDefault(); const nc = t.split("").concat(["", "", "", "", "", ""]).slice(0, 6); update({ code: nc }); refs.current[Math.min(t.length, 5)]?.focus(); }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center" }}><StepBadge name="mailCheck" /></div>
      <h2 style={H2}>Check your inbox</h2>
      <p style={SUB}>We sent a 6-digit code to<br /><strong style={{ color: "var(--warm-darker)" }}>{data.email || "your email"}</strong></p>
      <div style={{ display: "flex", gap: 9, justifyContent: "center", marginBottom: 18 }} onPaste={onPaste}>
        {code.map((c, i) => (
          <input key={i} ref={(el) => { refs.current[i] = el; }} value={c} onChange={(e) => setDigit(i, e.target.value)} onKeyDown={(e) => onKey(i, e)}
            inputMode="numeric" maxLength={1} autoFocus={i === 0}
            style={{ width: 46, height: 56, textAlign: "center", fontSize: 24, fontWeight: 700, fontFamily: FONTS.SERIF, color: "var(--warm-darker)", border: `1.5px solid ${c ? "var(--gold)" : "var(--warm-line)"}`, borderRadius: 12, background: "white", outline: "none", transition: "border 0.15s" }} />
        ))}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--warm-muted)", marginBottom: 26 }}>
        Didn&rsquo;t get it?{" "}
        <span onClick={() => { setResent(true); setTimeout(() => setResent(false), 2200); }} style={{ color: "var(--gold-deep)", fontWeight: 600, cursor: "pointer" }}>{resent ? "✓ Code resent" : "Resend code"}</span>
        <span style={{ display: "block", marginTop: 6, opacity: 0.7, fontStyle: "italic" }}>Demo: enter any 6 digits to continue</span>
      </div>
      <NavRow back={back} next={next} disabled={!filled} nextLabel="Verify & continue" />
    </div>
  );
}

/* ── 4 · Profile (skippable) ── */
const DRAWS = ["Spiritual growth", "Recurring dreams", "Curiosity", "Hard season", "Bible study"];
export function StepProfile({ data, update, next, back }: StepProps) {
  const draws = data.draws || [];
  const toggle = (d: string) => update({ draws: draws.includes(d) ? draws.filter((x) => x !== d) : [...draws, d] });
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <StepBadge name="user" />
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--gold-deep)", background: "oklch(0.95 0.04 80)", padding: "5px 11px", borderRadius: 100, border: "1px solid oklch(0.87 0.07 80)" }}>Optional</span>
      </div>
      <h2 style={H2}>A little about you</h2>
      <p style={SUB}>This helps us tailor your readings — but it&rsquo;s entirely up to you. Skip it and DreamRiver works just the same.</p>
      <div style={{ display: "grid", gap: 18, marginBottom: 22 }}>
        <TextField label="First name" icon="user" optional value={data.firstName || ""} onChange={(v) => update({ firstName: v })} placeholder="What should we call you?" />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--warm-darker)", marginBottom: 9 }}>
            What draws you to DreamRiver? <span style={{ fontWeight: 400, color: "var(--warm-muted)", fontSize: 11.5 }}>· choose any</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {DRAWS.map((d) => {
              const on = draws.includes(d);
              return (
                <button key={d} type="button" onClick={() => toggle(d)} style={{
                  fontFamily: "inherit", fontSize: 13, fontWeight: on ? 600 : 500, cursor: "pointer", padding: "8px 14px", borderRadius: 100,
                  background: on ? "var(--gold)" : "white", color: on ? "var(--night-deep)" : "var(--warm-dark)",
                  border: `1px solid ${on ? "var(--gold)" : "var(--warm-line)"}`, transition: "all 0.15s",
                }}>{d}</button>
              );
            })}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", background: "oklch(0.98 0.008 80)", border: "1px solid var(--warm-line)", borderRadius: 10, marginBottom: 24, fontSize: 12, color: "var(--warm-muted)" }}>
        <Icon name="lock" size={15} color="var(--gold-deep)" stroke={1.7} /> Private to your account. Never shared or sold.
      </div>
      <NavRow back={back} next={next} skip={next} />
    </div>
  );
}

/* ── 5 · Plan ── */
export function StepPlan({ data, update, next, back }: StepProps) {
  const cycle = data.cycle || "yearly";
  const plan = data.plan || "free";
  const [pending, setPending] = React.useState(false);
  const price = cycle === "yearly" ? "$99.99" : "$12.99";
  const per = cycle === "yearly" ? "/year" : "/month";
  const effective = cycle === "yearly" ? "≈ $8.33/mo · save 36%" : "billed monthly";

  const handleContinue = () => { if (plan === "visionary") setPending(true); else next(); };

  return (
    <div>
      <StepBadge name="compass" />
      <h2 style={H2}>Choose how you&rsquo;ll begin</h2>
      <p style={SUB}>Start free with 3 dream credits this month. Upgrade anytime for unlimited readings.</p>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
        <div style={{ display: "inline-flex", gap: 3, padding: 3, background: "oklch(0.95 0.012 80)", borderRadius: 100, border: "1px solid var(--warm-line)" }}>
          {([["monthly", "Monthly"], ["yearly", "Yearly"]] as const).map(([id, lab]) => (
            <button key={id} type="button" onClick={() => update({ cycle: id })} style={{
              fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "7px 18px", borderRadius: 100, border: "none",
              background: cycle === id ? "white" : "transparent", color: cycle === id ? "var(--warm-darker)" : "var(--warm-muted)",
              boxShadow: cycle === id ? "0 1px 3px oklch(0.2 0.02 250 / 0.12)" : "none", display: "inline-flex", alignItems: "center", gap: 7,
            }}>
              {lab}
              {id === "yearly" && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--gold-deep)", background: "oklch(0.94 0.06 80)", padding: "1px 6px", borderRadius: 100 }}>−36%</span>}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
        <PlanCard active={plan === "free"} onClick={() => update({ plan: "free" })} icon="leaf" name="Seeker" price="$0" per="forever"
          features={["3 dream credits this month", "Still Waters & Flowing River readings", "Private dream journal", "Scripture references"]} />
        <PlanCard active={plan === "visionary"} onClick={() => update({ plan: "visionary" })} icon="crown" name="Visionary" price={price} per={per} effective={effective} badge="Most chosen" highlight
          features={["Unlimited dream interpretations", "All reading levels — incl. Celestial & Scholarly", "AI dream imagery for every entry", "Pattern & theme insights", "Priority analysis"]} />
      </div>
      <NavRow back={back} next={handleContinue} nextLabel={plan === "visionary" ? `Upgrade — ${price}${per}` : "Join free — get 3 credits"} />
      {pending && <PendingModal data={data} update={update} price={price} per={per} onClose={() => setPending(false)} onProceed={() => { setPending(false); next(); }} />}
    </div>
  );
}

function PlanCard({
  active, onClick, icon, name, price, per, effective, features, badge, highlight,
}: {
  active: boolean; onClick: () => void; icon: string; name: string; price: string; per: string;
  effective?: string; features: string[]; badge?: string; highlight?: boolean;
}) {
  return (
    <div onClick={onClick} style={{
      position: "relative", cursor: "pointer", borderRadius: 15, padding: "20px 20px 18px",
      background: active ? (highlight ? "linear-gradient(160deg, oklch(0.97 0.03 80), oklch(0.95 0.05 80))" : "oklch(0.96 0.04 80)") : "white",
      border: `1.5px solid ${active ? "var(--gold)" : "var(--warm-line)"}`,
      outline: active ? "3px solid oklch(0.72 0.14 75 / 0.14)" : "3px solid transparent", transition: "all 0.15s",
    }}>
      {badge && <div style={{ position: "absolute", top: -10, right: 18, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--night-deep)", background: "var(--gold)", padding: "3px 10px", borderRadius: 100, boxShadow: "0 2px 6px oklch(0.72 0.14 75 / 0.4)" }}>{badge}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: active ? "var(--gold)" : "oklch(0.96 0.02 80)", color: active ? "var(--night-deep)" : "var(--gold-deep)" }}>
          <Icon name={icon} size={19} stroke={1.7} />
        </div>
        <div style={{ flex: 1 }}><div style={{ fontFamily: FONTS.SERIF, fontSize: 19, color: "var(--warm-darker)", lineHeight: 1 }}>{name}</div></div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3, justifyContent: "flex-end" }}>
            <span style={{ fontFamily: FONTS.SERIF, fontSize: 24, color: "var(--warm-darker)" }}>{price}</span>
            <span style={{ fontSize: 12.5, color: "var(--warm-muted)" }}>{per}</span>
          </div>
          {effective && <div style={{ fontSize: 11, color: "var(--gold-deep)", fontWeight: 600 }}>{effective}</div>}
        </div>
      </div>
      <div style={{ display: "grid", gap: 7 }}>
        {features.map((f) => (
          <div key={f} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5, color: "var(--warm-dark)", lineHeight: 1.45 }}>
            <Icon name="check" size={14} color="var(--gold-deep)" stroke={2.4} style={{ marginTop: 2 }} /><span>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PendingModal({
  data, update, price, per, onClose, onProceed,
}: { data: OnboardingData; update: (p: Partial<OnboardingData>) => void; price: string; per: string; onClose: () => void; onProceed: () => void }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "oklch(0.1 0.02 250 / 0.55)", backdropFilter: "blur(3px)", borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 20 }}>
      <div style={{ background: "white", borderRadius: 18, padding: "30px 28px", maxWidth: 380, width: "100%", boxShadow: "0 20px 50px oklch(0.1 0.02 250 / 0.4)", textAlign: "center", position: "relative" }}>
        <div style={{ width: 54, height: 54, borderRadius: 15, margin: "0 auto 18px", background: "oklch(0.95 0.04 80)", border: "1px solid oklch(0.87 0.07 80)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gold-deep)" }}>
          <Icon name="clock" size={26} stroke={1.7} />
        </div>
        <h3 style={{ fontFamily: FONTS.SERIF, fontSize: 22, color: "var(--warm-darker)", marginBottom: 10 }}>Upgrades open soon</h3>
        <p style={{ fontSize: 13.5, color: "var(--warm-muted)", lineHeight: 1.6, marginBottom: 20 }}>
          Card payments aren&rsquo;t live just yet. Join free now with your 3 credits, and we&rsquo;ll email you the moment{" "}
          <span style={{ fontFamily: FONTS.WORDMARK, fontStyle: "italic", color: "var(--gold-deep)" }}>Visionary</span> ({price}{per}) is ready.
        </p>
        <div style={{ padding: "12px 14px", background: "oklch(0.98 0.008 80)", border: "1px solid var(--warm-line)", borderRadius: 11, marginBottom: 20, textAlign: "left" }}>
          <Check checked={data.notifyUpgrade !== false} onChange={(v) => update({ notifyUpgrade: v })}>Email me when Visionary upgrades go live</Check>
        </div>
        <GoldBtn full onClick={onProceed}>Continue with free for now</GoldBtn>
        <div onClick={onClose} style={{ fontSize: 13, color: "var(--warm-muted)", fontWeight: 600, marginTop: 14, cursor: "pointer" }}>Back to plans</div>
      </div>
    </div>
  );
}

/* ── 6 · Done ── */
export function StepDone({ data, restart, onFinish }: { data: OnboardingData; restart: () => void; onFinish: () => void }) {
  const name = (data.firstName || "").trim();
  const levelName = (LEVELS.find((l) => l.id === (data.readingLevel || "river")) || {}).name;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", inset: -18, borderRadius: "50%", background: "radial-gradient(circle, oklch(0.72 0.14 75 / 0.35) 0%, transparent 70%)" }} />
          <AppIcon size={88} radius={26}><MoonwaterMark size={54} /></AppIcon>
        </div>
      </div>
      <div style={{ fontFamily: FONTS.MONO, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--gold-deep)", marginBottom: 12 }}>You&rsquo;re in</div>
      <h2 style={{ fontFamily: FONTS.SERIF, fontSize: 32, lineHeight: 1.1, color: "var(--warm-darker)", marginBottom: 14 }}>
        {name ? <>Welcome, <span style={{ fontStyle: "italic" }}>{name}</span>.</> : "Welcome to the river."}
      </h2>
      <p style={{ fontSize: 15, color: "var(--warm-muted)", lineHeight: 1.6, maxWidth: "36ch", margin: "0 auto 26px" }}>
        Your free account is ready with <strong style={{ color: "var(--warm-darker)" }}>3 dream credits</strong> this month, set to <strong style={{ color: "var(--gold-deep)" }}>{levelName}</strong> readings.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 30 }}>
        <div style={{ flex: 1, maxWidth: 150, padding: "14px 12px", background: "white", border: "1px solid var(--warm-line)", borderRadius: 12 }}>
          <div style={{ fontFamily: FONTS.SERIF, fontSize: 26, color: "var(--gold-deep)", lineHeight: 1 }}>3</div>
          <div style={{ fontSize: 11.5, color: "var(--warm-muted)", marginTop: 4 }}>credits this month</div>
        </div>
        <div style={{ flex: 1, maxWidth: 150, padding: "14px 12px", background: "white", border: "1px solid var(--warm-line)", borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}><Icon name="shieldCheck" size={26} color="var(--gold-deep)" stroke={1.5} /></div>
          <div style={{ fontSize: 11.5, color: "var(--warm-muted)" }}>email verified</div>
        </div>
      </div>
      <GoldBtn full onClick={onFinish}><Icon name="penLine" size={18} color="var(--night-deep)" stroke={2} /> Write your first dream</GoldBtn>
      {data.notifyUpgrade !== false && data.plan === "visionary" && (
        <div style={{ fontSize: 12, color: "var(--warm-muted)", marginTop: 16, display: "flex", gap: 7, alignItems: "center", justifyContent: "center" }}>
          <Icon name="bell" size={14} color="var(--gold-deep)" stroke={1.7} /> We&rsquo;ll email you when Visionary upgrades open.
        </div>
      )}
      <div onClick={restart} style={{ fontSize: 12, color: "var(--warm-muted)", marginTop: 22, cursor: "pointer", opacity: 0.7 }}>↺ Restart onboarding</div>
    </div>
  );
}
