"use client";

// Shared UI atoms for the onboarding flow. Ported from the design handoff
// prototype, using lucide-react (already a dependency) and the existing
// MoonwaterMark brand component. Inline styles intentionally mirror the
// prototype's tokens; colors come from the CSS variables in globals.css.

import * as React from "react";
import {
  Moon, Sparkles, Mail, MailCheck, ShieldCheck, BookOpen, Feather, Scroll,
  Waves, User, Leaf, Crown, FileText, Check as CheckIcon, Sunrise,
  ArrowRight, ArrowLeft, PenLine, Bell, Lock, Clock, X, Compass,
  type LucideIcon,
} from "lucide-react";
import { MoonwaterMark } from "@/components/brand/MoonwaterMark";

const ICONS: Record<string, LucideIcon> = {
  moon: Moon, sparkles: Sparkles, mail: Mail, mailCheck: MailCheck,
  shieldCheck: ShieldCheck, bookOpen: BookOpen, feather: Feather, scroll: Scroll,
  waves: Waves, user: User, leaf: Leaf, crown: Crown, fileText: FileText,
  check: CheckIcon, sunrise: Sunrise, arrowRight: ArrowRight, arrowLeft: ArrowLeft,
  penLine: PenLine, bell: Bell, lock: Lock, clock: Clock, x: X, compass: Compass,
};

export function Icon({
  name, size = 24, color = "currentColor", stroke = 1.75, style = {},
}: { name: string; size?: number; color?: string; stroke?: number; style?: React.CSSProperties }) {
  const Cmp = ICONS[name] ?? Sparkles;
  return <Cmp size={size} color={color} strokeWidth={stroke} style={{ display: "block", flexShrink: 0, ...style }} />;
}

const SERIF = "var(--font-dm-serif), Georgia, serif";
const WORDMARK = "var(--font-cormorant), Georgia, serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
export const FONTS = { SERIF, WORDMARK, MONO };

export function AppIcon({
  size = 56, radius = 22, bg = "var(--night)", children,
}: { size?: number; radius?: number; bg?: string; children: React.ReactNode }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: (size * radius) / 100, background: bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden", flexShrink: 0,
      boxShadow: "0 6px 18px oklch(0.08 0.02 250 / 0.4)",
    }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 0%, oklch(0.45 0.06 250 / 0.5) 0%, transparent 65%)" }} />
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}

export function Lockup({ size = 30, word = 22, color = "var(--cream)" }: { size?: number; word?: number; color?: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 11, color }}>
      <AppIcon size={size} radius={24}><MoonwaterMark size={size * 0.62} /></AppIcon>
      <span style={{ fontFamily: WORDMARK, fontStyle: "italic", fontWeight: 500, letterSpacing: "0.005em", fontSize: word, lineHeight: 1 }}>DreamRiver</span>
    </div>
  );
}

export function Starfield() {
  const stars = React.useMemo(() => {
    const arr: { x: number; y: number; r: number; o: number; d: number }[] = [];
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < 54; i++) {
      arr.push({ x: rnd() * 100, y: rnd() * 100, r: 0.6 + rnd() * 1.8, o: 0.25 + rnd() * 0.6, d: rnd() * 4 });
    }
    return arr;
  }, []);
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} preserveAspectRatio="none" aria-hidden>
      {stars.map((s, i) => (
        <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill="var(--cream)"
          style={{ opacity: s.o, animation: `ob-twinkle 4s ease-in-out ${s.d}s infinite` }} />
      ))}
    </svg>
  );
}

export function GoldBtn({
  children, onClick, disabled, full, style = {},
}: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; full?: boolean; style?: React.CSSProperties }) {
  return (
    <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        background: disabled ? "oklch(0.86 0.03 80)" : "var(--gold)",
        color: disabled ? "oklch(0.62 0.02 80)" : "var(--night-deep)",
        border: "none", borderRadius: 100, fontFamily: "inherit", fontWeight: 700, fontSize: 15,
        padding: "13px 26px", width: full ? "100%" : "auto", cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 4px 14px oklch(0.72 0.14 75 / 0.35)",
        transition: "transform 0.15s, box-shadow 0.15s, background 0.2s", ...style,
      }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >{children}</button>
  );
}

export function GhostBtn({
  children, onClick, style = {},
}: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
      background: "transparent", color: "var(--warm-muted)", border: "none", fontFamily: "inherit",
      fontWeight: 600, fontSize: 14, padding: "13px 18px", cursor: "pointer", borderRadius: 100,
      transition: "color 0.15s", ...style,
    }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--warm-darker)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--warm-muted)")}
    >{children}</button>
  );
}

export function StepBadge({ name }: { name: string }) {
  return (
    <div style={{
      width: 60, height: 60, borderRadius: 18,
      background: "linear-gradient(150deg, oklch(0.96 0.04 80), oklch(0.93 0.06 80))",
      border: "1px solid oklch(0.85 0.08 80)", display: "flex", alignItems: "center",
      justifyContent: "center", color: "var(--gold-deep)", marginBottom: 22,
      boxShadow: "0 3px 10px oklch(0.72 0.14 75 / 0.15)",
    }}>
      <Icon name={name} size={28} stroke={1.6} />
    </div>
  );
}

export function Pips({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 6, borderRadius: 100, width: i === current ? 26 : 6,
          background: i <= current ? "var(--gold)" : "oklch(0.86 0.02 80)",
          opacity: i <= current ? 1 : 0.6,
          transition: "width 0.35s cubic-bezier(.4,0,.2,1), background 0.3s",
        }} />
      ))}
    </div>
  );
}

export function TextField({
  label, value, onChange, placeholder, type = "text", icon, autoFocus, hint, optional,
}: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; icon?: string; autoFocus?: boolean; hint?: string; optional?: boolean;
}) {
  const [focus, setFocus] = React.useState(false);
  return (
    <label style={{ display: "block" }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--warm-darker)" }}>{label}</span>
          {optional && <span style={{ fontSize: 11.5, color: "var(--warm-muted)" }}>Optional</span>}
        </div>
      )}
      <div style={{
        display: "flex", alignItems: "center", gap: 11, padding: "12px 15px", borderRadius: 11,
        background: "white", border: `1px solid ${focus ? "var(--gold)" : "var(--warm-line)"}`,
        outline: focus ? "3px solid oklch(0.72 0.14 75 / 0.16)" : "3px solid transparent",
        transition: "border 0.15s, outline 0.15s",
      }}>
        {icon && <Icon name={icon} size={18} color="var(--warm-muted)" stroke={1.7} />}
        <input type={type} value={value} placeholder={placeholder} autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 15, color: "var(--warm-darker)" }} />
      </div>
      {hint && <div style={{ fontSize: 11.5, color: "var(--warm-muted)", marginTop: 7, lineHeight: 1.5 }}>{hint}</div>}
    </label>
  );
}

export function Check({
  checked, onChange, children,
}: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div onClick={() => onChange(!checked)} style={{ display: "flex", gap: 11, alignItems: "flex-start", cursor: "pointer" }}>
      <div style={{
        width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
        background: checked ? "var(--gold)" : "white",
        border: `1.5px solid ${checked ? "var(--gold)" : "var(--warm-line)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.15s, border 0.15s",
      }}>
        {checked && <Icon name="check" size={13} color="var(--night-deep)" stroke={3} />}
      </div>
      <div style={{ fontSize: 13, color: "var(--warm-dark)", lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

export function NavRow({
  back, next, disabled, nextLabel = "Continue", skip,
}: { back?: () => void; next: () => void; disabled?: boolean; nextLabel?: string; skip?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {back && <GhostBtn onClick={back}><Icon name="arrowLeft" size={16} stroke={2} /> Back</GhostBtn>}
      {skip && <GhostBtn onClick={skip} style={{ marginLeft: back ? 0 : "auto" }}>Skip for now</GhostBtn>}
      <div style={{ flex: 1 }} />
      <GoldBtn onClick={next} disabled={disabled}>
        {nextLabel} <Icon name="arrowRight" size={17} color={disabled ? "oklch(0.62 0.02 80)" : "var(--night-deep)"} stroke={2.2} />
      </GoldBtn>
    </div>
  );
}
