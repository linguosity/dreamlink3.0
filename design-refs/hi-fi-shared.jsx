/* Shared atoms used across all hi-fi mockups */

/* ── Brand mark ─────────────────────────────────────────────── */
function MoonwaterMark({ size = 64, moonColor = 'var(--gold)', waveTop = 'var(--cream)', waveBottom = 'var(--gold)', stroke = 2.5, fullness = 9, tilt = 15 }) {
  const crescent = `M32 11 A14 14 0 1 0 32 39 A${fullness} 14 0 1 1 32 11 Z`;
  const sw = Math.max(1.4, Math.min(3.2, (stroke * size) / 80));
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none" style={{ display: 'block', overflow: 'visible' }}>
      <g transform={`rotate(${tilt} 32 25)`}>
        <path d={crescent} fill={moonColor} />
      </g>
      <path d="M14 56 C 22 50, 26 50, 32 56 C 38 62, 42 62, 50 56" stroke={waveBottom} strokeWidth={sw} strokeLinecap="round" />
      <path d="M10 48 C 18 42, 22 42, 30 48 C 38 54, 42 54, 54 48" stroke={waveTop} strokeWidth={sw} strokeLinecap="round" />
    </svg>
  );
}

function AppIcon({ size = 64, radius = 22, bg = 'var(--night)', children }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: `${size * radius / 100}px`,
      background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      flexShrink: 0,
      boxShadow: '0 4px 12px oklch(0.18 0.02 250 / 0.15)',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 0%, oklch(0.45 0.06 250 / 0.5) 0%, transparent 65%)',
      }} />
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

/* Inline lockup — mark + wordmark, no container */
function Lockup({ markSize = 22, wordSize = 20, gap = 8, color = 'var(--warm-darker)', on = 'light' }) {
  const palette = on === 'dark'
    ? { moon: 'var(--gold)', top: 'var(--cream)', bottom: 'var(--gold)' }
    : { moon: 'var(--night)', top: 'var(--night)', bottom: 'var(--gold)' };
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap, color }}>
      <MoonwaterMark size={markSize} moonColor={palette.moon} waveTop={palette.top} waveBottom={palette.bottom} />
      <span className="wordmark" style={{ fontSize: wordSize, lineHeight: 1 }}>DreamRiver</span>
    </div>
  );
}

/* Contained lockup — squircle + wordmark */
function ContainedLockup({ iconSize = 32, wordSize = 22, gap = 10, color = 'var(--warm-darker)' }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap, color }}>
      <AppIcon size={iconSize} radius={22}>
        <MoonwaterMark size={iconSize * 0.62} />
      </AppIcon>
      <span className="wordmark" style={{ fontSize: wordSize, lineHeight: 1 }}>DreamRiver</span>
    </div>
  );
}

/* Gold primary button */
function GoldButton({ children, size = 'md', style = {} }) {
  const sizes = {
    sm: { padding: '7px 14px', fontSize: 12.5 },
    md: { padding: '11px 22px', fontSize: 14 },
    lg: { padding: '14px 28px', fontSize: 15 },
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'var(--gold)', color: 'var(--night-deep)',
      borderRadius: 100, fontWeight: 700,
      boxShadow: '0 2px 8px oklch(0.72 0.14 75 / 0.3)',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      ...sizes[size], ...style,
    }}>{children}</span>
  );
}

/* Outline button */
function OutlineButton({ children, size = 'md', on = 'light', style = {} }) {
  const sizes = {
    sm: { padding: '6px 14px', fontSize: 12.5 },
    md: { padding: '10px 22px', fontSize: 14 },
    lg: { padding: '13px 28px', fontSize: 15 },
  };
  const colors = on === 'dark'
    ? { border: '1px solid oklch(0.5 0.04 250)', color: 'var(--cream)' }
    : { border: '1px solid var(--warm-line)', color: 'var(--warm-darker)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      borderRadius: 100, fontWeight: 500,
      ...colors, ...sizes[size], ...style,
    }}>{children}</span>
  );
}

/* Scripture pill — gold-deep on cream */
function ScripturePill({ children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: 'var(--cream)', color: 'var(--gold-deep)',
      border: '1px solid oklch(0.85 0.08 75)',
      padding: '3px 11px', borderRadius: 100,
      fontSize: 11.5, fontWeight: 600,
      letterSpacing: '0.01em',
    }}>{children}</span>
  );
}

/* Site header — used on Splash + Sign-up (light variant) */
function SiteHeader({ activePath = null }) {
  const links = ['Features', 'How It Works', 'Sign In'];
  return (
    <header style={{
      height: 72, padding: '0 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'var(--cream-soft)',
      borderBottom: '1px solid var(--warm-line)',
    }}>
      <ContainedLockup iconSize={36} wordSize={24} />
      <nav style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        {links.map(l => (
          <span key={l} style={{
            fontSize: 14, fontWeight: 500,
            color: l === 'How It Works' ? 'var(--warm-darker)' : 'var(--warm-muted)',
            borderBottom: l === 'How It Works' ? '2px solid var(--gold)' : '2px solid transparent',
            paddingBottom: 2,
          }}>{l}</span>
        ))}
        <GoldButton size="md">Sign Up</GoldButton>
      </nav>
    </header>
  );
}

/* Product header — used on Journal/Settings/Admin */
function ProductHeader({ active = 'Journal', isAdmin = false }) {
  const links = isAdmin
    ? ['Overview', 'Users', 'Dreams', 'Revenue', 'System']
    : ['Journal', 'Insights', 'Library', 'Settings'];
  return (
    <header style={{
      height: 64, padding: '0 28px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'var(--warm-white)',
      borderBottom: '1px solid var(--warm-line)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <ContainedLockup iconSize={32} wordSize={22} />
        {isAdmin && (
          <span style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--gold-deep)',
            padding: '3px 9px', borderRadius: 100,
            background: 'oklch(0.95 0.05 75)',
            border: '1px solid oklch(0.85 0.08 75)',
          }}>Admin</span>
        )}
        <nav style={{ display: 'flex', gap: 22 }}>
          {links.map(l => (
            <span key={l} style={{
              fontSize: 13.5, fontWeight: l === active ? 600 : 500,
              color: l === active ? 'var(--warm-darker)' : 'var(--warm-muted)',
              borderBottom: l === active ? '2px solid var(--gold)' : '2px solid transparent',
              paddingBottom: 16, paddingTop: 18,
            }}>{l}</span>
          ))}
        </nav>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--night-soft), var(--gold))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 12, fontWeight: 600,
        }}>EM</div>
      </div>
    </header>
  );
}

/* Eyebrow label */
function Eyebrow({ children, color = 'var(--gold-deep)' }) {
  return (
    <div className="font-mono" style={{
      fontSize: 10.5, fontWeight: 500,
      letterSpacing: '0.14em', textTransform: 'uppercase',
      color,
    }}>{children}</div>
  );
}

/* ── Brief card ─────────────────────────────────────────────── */
function HiFiBrief() {
  return (
    <div style={{
      width: '100%', height: '100%',
      padding: 32,
      background: 'linear-gradient(165deg, var(--night) 0%, var(--night-deep) 100%)',
      display: 'flex', flexDirection: 'column', gap: 14,
      color: 'var(--cream)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -40, right: -40, opacity: 0.15 }}>
        <MoonwaterMark size={240} />
      </div>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Eyebrow color="oklch(0.72 0.06 75)">Hi-Fi Mockups · Brand Audit follow-up</Eyebrow>
        <h2 className="font-serif" style={{
          fontSize: 32, lineHeight: 1.08, color: 'var(--cream)',
          fontWeight: 400, marginTop: 14, marginBottom: 14, textWrap: 'balance',
        }}>
          What the app looks like with Moonwater applied.
        </h2>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'oklch(0.78 0.025 75)', textWrap: 'pretty' }}>
          Five page mockups rebuilt against the actual codebase (Next.js app at <span className="font-mono" style={{ color: 'var(--gold-light)', fontSize: 12 }}>dreamlink3.0/</span>). Real structure, real components, with v2 branding swapped in.
        </p>

        <div style={{ marginTop: 22, display: 'grid', gap: 12 }}>
          {[
            ['01', 'Splash / Landing', 'Hero, How It Works, Sample, Features, FAQ, CTA'],
            ['02', 'Sign Up', 'Auth card with Google OAuth + email/password'],
            ['03', 'Dream Journal', 'New entry + gallery + analysis result'],
            ['04', 'Settings', 'Left rail nav + sections (Preferences, etc.)'],
            ['05', 'Admin Console', 'KPI strip + chart + recent activity + status'],
          ].map(([n, title, sub]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span className="font-mono" style={{ color: 'var(--gold-light)', fontSize: 11, width: 22 }}>{n}</span>
              <div>
                <div className="wordmark" style={{ fontSize: 17, color: 'var(--cream)', lineHeight: 1 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'oklch(0.72 0.03 75)', marginTop: 3 }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 'auto', paddingTop: 18,
          borderTop: '1px solid oklch(0.4 0.04 250 / 0.5)',
          fontSize: 11, color: 'oklch(0.65 0.03 75)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span>Night for splash/auth · Parchment for product</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Gold as primary action color (replaces sacred blue)</span>
            <span className="font-mono" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>v2 · 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Expose to other scripts */
Object.assign(window, {
  MoonwaterMark, AppIcon, Lockup, ContainedLockup,
  GoldButton, OutlineButton, ScripturePill,
  SiteHeader, ProductHeader, Eyebrow, HiFiBrief,
});
