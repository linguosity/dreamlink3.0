
/* ── UX Recommendations Components ──────────────────────── */

const { useState, useEffect, useRef } = React;

/* ── Annotation Callout ───────────────────────────────── */
function Callout({ number, label, description, side = 'right', color = 'var(--rec-amber)' }) {
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '10px 14px', borderRadius: 10,
      background: 'oklch(0.98 0.005 80)', border: `1.5px solid ${color}`,
      maxWidth: 280, fontSize: 12,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
        background: color, color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700,
      }}>{number}</div>
      <div>
        <div style={{ fontWeight: 700, color: 'var(--rec-dark)', marginBottom: 2 }}>{label}</div>
        <div style={{ color: 'var(--rec-muted)', lineHeight: 1.45 }}>{description}</div>
      </div>
    </div>
  );
}

/* ── Section Header ───────────────────────────────────── */
function SectionHeader({ area, title, subtitle }) {
  return (
    <div style={{ marginBottom: 32, maxWidth: 640 }}>
      <div style={{
        display: 'inline-block', padding: '4px 12px', borderRadius: 100,
        background: 'oklch(0.92 0.06 75 / 0.5)',
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
        color: 'var(--rec-amber)', textTransform: 'uppercase', marginBottom: 10,
      }}>{area}</div>
      <h2 style={{
        fontFamily: "'DM Serif Display', Georgia, serif",
        fontSize: 32, lineHeight: 1.15, color: 'var(--rec-dark)', marginBottom: 8,
      }}>{title}</h2>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--rec-muted)' }}>{subtitle}</p>
    </div>
  );
}

/* ── Before/After Toggle ──────────────────────────────── */
function BeforeAfter({ children, labels = ['Current', 'Proposed'] }) {
  const [active, setActive] = useState(1);
  return (
    <div>
      <div style={{
        display: 'inline-flex', borderRadius: 100, overflow: 'hidden',
        border: '1.5px solid oklch(0.85 0.02 235)',
        marginBottom: 16,
      }}>
        {labels.map((l, i) => (
          <button key={i} onClick={() => setActive(i)} style={{
            padding: '8px 20px', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            background: active === i ? 'var(--rec-blue-deep)' : 'transparent',
            color: active === i ? 'white' : 'var(--rec-muted)',
            transition: 'all 0.2s',
          }}>{l}</button>
        ))}
      </div>
      <div>{children[active]}</div>
    </div>
  );
}

/* ── Improved Landing Hero Mockup ─────────────────────── */
function ImprovedLandingHero() {
  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',
      background: 'linear-gradient(175deg, oklch(0.97 0.008 75) 0%, oklch(0.93 0.025 225) 60%, oklch(0.87 0.05 235) 100%)',
      padding: '0', position: 'relative',
    }}>
      {/* Warm shimmer */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '40%', height: '100%',
        background: 'radial-gradient(ellipse at 80% 30%, oklch(0.88 0.08 75 / 0.3) 0%, transparent 60%)',
        pointerEvents: 'none',
      }}></div>

      {/* Nav */}
      <div style={{
        padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid oklch(0.90 0.01 235 / 0.3)',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <svg viewBox="0 0 48 48" width={20} height={20} fill="none" stroke="var(--rec-dark)" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', overflow: 'visible' }}>
            <circle cx="24" cy="8" r="1.8" fill="var(--rec-dark)" stroke="none" />
            <path d="M9 26 A15 15 0 0 1 39 26" />
            <line x1="9" y1="26" x2="9" y2="29" />
            <line x1="39" y1="26" x2="39" y2="29" />
            <path d="M5 33 Q13 30 20 33 T35 33 Q40 31 43 33" />
            <path d="M7 39 Q14 36 21 39 T36 39 Q40 37.5 41 39" />
          </svg>
          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic', fontWeight: 500, fontSize: 19, letterSpacing: '0.005em', color: 'var(--rec-dark)', lineHeight: 1 }}>DreamRiver</span>
        </span>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--rec-muted)', fontWeight: 500 }}>Features</span>
          <span style={{ fontSize: 13, color: 'var(--rec-muted)', fontWeight: 500 }}>How It Works</span>
          <span style={{ fontSize: 13, color: 'var(--rec-muted)', fontWeight: 500 }}>Sign In</span>
          <span style={{
            padding: '8px 18px', borderRadius: 100, fontSize: 13, fontWeight: 600,
            background: 'var(--rec-blue-deep)', color: 'white',
          }}>Sign Up</span>
        </div>
      </div>

      {/* Hero content */}
      <div style={{ padding: '48px 28px 56px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 40, alignItems: 'center' }}>
        <div>
          <h1 style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 38, lineHeight: 1.12, color: 'var(--rec-dark)', marginBottom: 14,
          }}>Discover What God Is Saying Through Your Dreams</h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--rec-muted)', marginBottom: 24, maxWidth: 380 }}>
            AI-powered biblical dream interpretation. Journal your dreams, receive scripture-backed insights in seconds.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{
              padding: '12px 24px', borderRadius: 100, fontSize: 14, fontWeight: 600,
              background: 'var(--rec-blue-deep)', color: 'white',
            }}>Start Your Dream Journal — Free</span>
            <span style={{
              padding: '12px 24px', borderRadius: 100, fontSize: 14, fontWeight: 500,
              border: '1.5px solid oklch(0.78 0.03 235)', color: 'var(--rec-dark)',
            }}>See an example</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--rec-muted)', marginTop: 10, opacity: 0.6 }}>Free forever. No credit card required.</p>
        </div>

        {/* Phone mockup placeholder */}
        <div style={{
          width: 220, height: 380, borderRadius: 32, margin: '0 auto',
          background: 'oklch(0.15 0.01 240)', padding: 8,
          boxShadow: '0 20px 60px oklch(0.3 0.06 235 / 0.25)',
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: 24, overflow: 'hidden',
            background: 'var(--rec-cream)',
          }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid oklch(0.90 0.01 70)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg viewBox="0 0 48 48" width={11} height={11} fill="none" stroke="var(--rec-dark)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', overflow: 'visible', flexShrink: 0 }}>
                <circle cx="24" cy="8" r="2" fill="var(--rec-dark)" stroke="none" />
                <path d="M9 26 A15 15 0 0 1 39 26" />
                <path d="M5 33 Q13 30 20 33 T35 33 Q40 31 43 33" />
                <path d="M7 39 Q14 36 21 39 T36 39 Q40 37.5 41 39" />
              </svg>
              <span style={{ fontSize: 11, fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic', fontWeight: 500, lineHeight: 1 }}>DreamRiver</span>
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--rec-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dream Journal</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--rec-dark)', marginTop: 4 }}>New Entry</div>
              <div style={{
                marginTop: 8, padding: 10, borderRadius: 8,
                background: 'oklch(1 0 0 / 0.5)', border: '1px solid oklch(0.90 0.01 235 / 0.3)',
                fontSize: 9, color: 'var(--rec-dark)', lineHeight: 1.5,
              }}>
                I was walking across a bridge over a river of golden light…
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                <span style={{ fontSize: 7, padding: '3px 8px', borderRadius: 100, background: 'oklch(0.93 0.04 75)', color: 'var(--rec-amber)', fontWeight: 600 }}>Isaiah 43:2</span>
                <span style={{ fontSize: 7, padding: '3px 8px', borderRadius: 100, background: 'oklch(0.93 0.04 75)', color: 'var(--rec-amber)', fontWeight: 600 }}>Psalm 23:4</span>
              </div>
              <div style={{
                marginTop: 10, padding: '8px 0', borderRadius: 100, textAlign: 'center',
                background: 'var(--rec-blue-deep)', color: 'white', fontSize: 10, fontWeight: 600,
              }}>Get Interpretation</div>
              <div style={{
                marginTop: 10, padding: 10, borderRadius: 8,
                background: 'linear-gradient(135deg, oklch(0.95 0.03 75), oklch(0.94 0.02 235))',
              }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--rec-amber)' }}>✦ Your Interpretation</div>
                <div style={{ fontSize: 8, color: 'var(--rec-dark)', lineHeight: 1.5, opacity: 0.7, marginTop: 3 }}>
                  Your dream of crossing a bridge over golden light speaks to a season of divine transition…
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Current Landing Hero (simplified representation) ──── */
function CurrentLandingHero() {
  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',
      background: 'linear-gradient(180deg, white 0%, oklch(0.96 0.005 220) 100%)',
      padding: 0,
    }}>
      {/* Nav */}
      <div style={{
        padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid oklch(0.90 0.01 220)',
      }}>
        <span style={{ fontFamily: "'Blanka', sans-serif", fontSize: 15, letterSpacing: '0.12em', color: '#111' }}>DREAMRIVER</span>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#666' }}>Features</span>
          <span style={{ fontSize: 13, color: '#666' }}>How It Works</span>
          <span style={{ fontSize: 13, color: '#666' }}>Sign In</span>
          <span style={{ padding: '8px 18px', borderRadius: 100, fontSize: 13, fontWeight: 600, background: '#2563eb', color: 'white' }}>Sign Up</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: '48px 28px 56px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 40, alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.1, color: '#111', marginBottom: 14 }}>
            Discover What God Is Saying Through Your Dreams
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: '#555', marginBottom: 24, maxWidth: 380 }}>
            AI-powered biblical dream interpretation. Journal your dreams, receive scripture-backed insights in seconds.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ padding: '12px 24px', borderRadius: 100, fontSize: 14, fontWeight: 600, background: '#2563eb', color: 'white' }}>Start Your Dream Journal — Free</span>
            <span style={{ padding: '12px 24px', borderRadius: 100, fontSize: 14, fontWeight: 500, border: '1.5px solid #d1d5db', color: '#333' }}>See an example</span>
          </div>
          <p style={{ fontSize: 12, color: '#888', marginTop: 10 }}>Free forever. No credit card required.</p>
        </div>

        {/* Generic phone */}
        <div style={{
          width: 220, height: 380, borderRadius: 32, margin: '0 auto',
          background: '#1f2937', padding: 8,
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 24, background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dream Journal</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#333', marginTop: 6 }}>Dream entry</div>
              <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: '#f3f4f6', fontSize: 9, color: '#555', textAlign: 'left', lineHeight: 1.5 }}>
                I was walking across a bridge over a river of golden light.
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 8, justifyContent: 'center' }}>
                <span style={{ fontSize: 7, padding: '3px 8px', borderRadius: 100, background: '#eff6ff', color: '#1d4ed8' }}>Isaiah 43:2</span>
                <span style={{ fontSize: 7, padding: '3px 8px', borderRadius: 100, background: '#eff6ff', color: '#1d4ed8' }}>Psalm 23:4</span>
              </div>
              <div style={{ marginTop: 10, padding: '8px 0', borderRadius: 100, background: '#2563eb', color: 'white', fontSize: 10, fontWeight: 600 }}>Get Interpretation</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Improved Dashboard Mockup ────────────────────────── */
function ImprovedDashboard() {
  const dreams = [
    { title: 'Golden Bridge Vision', date: 'Apr 23', tags: ['Isaiah 43:2', 'Psalm 23:4'], summary: 'A season of divine transition…', hasImage: true },
    { title: 'Garden of Light', date: 'Apr 20', tags: ['Genesis 2:8'], summary: 'Spiritual growth and renewal…', hasImage: true },
    { title: 'Still Waters', date: 'Apr 17', tags: ['Psalm 23:2', 'Rev 22:1'], summary: 'Peace in God\'s presence…', hasImage: false },
  ];

  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',
      background: 'var(--rec-cream)', minHeight: 500,
    }}>
      {/* Nav */}
      <div style={{
        padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid oklch(0.90 0.015 75)',
        background: 'oklch(1 0 0 / 0.6)', backdropFilter: 'blur(8px)',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <svg viewBox="0 0 48 48" width={20} height={20} fill="none" stroke="var(--rec-dark)" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', overflow: 'visible' }}>
            <circle cx="24" cy="8" r="1.8" fill="var(--rec-dark)" stroke="none" />
            <path d="M9 26 A15 15 0 0 1 39 26" />
            <line x1="9" y1="26" x2="9" y2="29" />
            <line x1="39" y1="26" x2="39" y2="29" />
            <path d="M5 33 Q13 30 20 33 T35 33 Q40 31 43 33" />
            <path d="M7 39 Q14 36 21 39 T36 39 Q40 37.5 41 39" />
          </svg>
          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic', fontWeight: 500, fontSize: 19, letterSpacing: '0.005em', color: 'var(--rec-dark)', lineHeight: 1 }}>DreamRiver</span>
        </span>
        <div style={{
          flex: 1, maxWidth: 340, margin: '0 40px',
          padding: '8px 16px', borderRadius: 10,
          border: '1.5px solid oklch(0.88 0.015 75)',
          background: 'oklch(1 0 0 / 0.5)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--rec-muted)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <span style={{ fontSize: 13, color: 'oklch(0.6 0.01 70)' }}>Search dreams…</span>
        </div>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--rec-blue-soft), var(--rec-gold))',
        }}></div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 24px 40px' }}>
        {/* Dream input */}
        <div style={{
          padding: 20, borderRadius: 16,
          background: 'oklch(1 0 0 / 0.7)',
          border: '1.5px solid oklch(0.90 0.02 75)',
          boxShadow: '0 2px 12px oklch(0.5 0.04 75 / 0.06)',
          marginBottom: 32,
        }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: 'var(--rec-muted)',
            marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--rec-amber)" strokeWidth="2" strokeLinecap="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            New dream entry
          </div>
          <div style={{
            padding: '12px 16px', borderRadius: 10,
            background: 'oklch(0.975 0.005 75)',
            border: '1px solid oklch(0.92 0.01 75)',
            fontSize: 14, color: 'oklch(0.6 0.01 70)',
            minHeight: 48, display: 'flex', alignItems: 'center',
          }}>
            Describe your dream — a word, a feeling, or the whole story…
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 10, fontSize: 11, color: 'var(--rec-muted)',
          }}>
            <span style={{ opacity: 0.5 }}>⌘↵ to submit</span>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'var(--rec-blue-deep)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', opacity: 0.4,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </div>
          </div>
        </div>

        {/* Section label */}
        <div style={{
          fontSize: 16, fontWeight: 700, color: 'var(--rec-dark)', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          Your Dream Gallery
          <span style={{
            fontSize: 11, padding: '2px 10px', borderRadius: 100,
            background: 'oklch(0.92 0.04 75 / 0.5)', color: 'var(--rec-amber)', fontWeight: 600,
          }}>3 dreams</span>
        </div>

        {/* Dream cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {dreams.map((d, i) => (
            <div key={i} style={{
              borderRadius: 14, overflow: 'hidden',
              background: 'oklch(1 0 0 / 0.7)',
              border: '1px solid oklch(0.90 0.015 75)',
              transition: 'box-shadow 0.2s, transform 0.2s',
              cursor: 'pointer',
              gridColumn: i === 0 ? 'span 2' : 'span 1',
            }}>
              {/* Image placeholder */}
              {d.hasImage && (
                <div style={{
                  height: i === 0 ? 120 : 80,
                  background: `linear-gradient(135deg, oklch(0.85 0.06 ${200 + i * 30}), oklch(0.75 0.08 ${220 + i * 20}))`,
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: 'oklch(1 0 0 / 0.5)', fontWeight: 600,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}>dream visualization</div>
                </div>
              )}
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--rec-dark)' }}>{d.title}</span>
                  <span style={{ fontSize: 10, color: 'var(--rec-muted)' }}>{d.date}</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--rec-muted)', lineHeight: 1.5, marginBottom: 8 }}>{d.summary}</p>
                <div style={{ display: 'flex', gap: 4 }}>
                  {d.tags.map(t => (
                    <span key={t} style={{
                      fontSize: 9, padding: '3px 8px', borderRadius: 100,
                      background: 'oklch(0.93 0.04 75)', color: 'var(--rec-amber)', fontWeight: 600,
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Current Dashboard (simplified) ───────────────────── */
function CurrentDashboard() {
  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden', background: 'white', minHeight: 500,
    }}>
      <div style={{
        padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <span style={{ fontFamily: "'Blanka', sans-serif", fontSize: 15, letterSpacing: '0.12em' }}>DREAMRIVER</span>
        <div style={{
          flex: 1, maxWidth: 340, margin: '0 40px', padding: '8px 16px', borderRadius: 8,
          border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 13, color: '#999' }}>Search dreams...</span>
        </div>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e5e7eb' }}></div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 24px 40px' }}>
        {/* Current dream input */}
        <div style={{ position: 'relative', marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid oklch(0.92 0.005 220 / 0.3)' }}>
          <div style={{
            padding: '12px 48px 12px 16px', borderRadius: 12, border: '1px solid #e5e7eb',
            fontSize: 14, color: '#999', minHeight: 48, background: 'white',
          }}>
            Describe your dream — a word, a feeling, or the whole story…
          </div>
        </div>

        <div style={{ fontSize: 16, fontWeight: 600, color: '#111', marginBottom: 16 }}>Your Dream Gallery</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {['Golden Bridge Vision', 'Garden of Light', 'Still Waters'].map((title, i) => (
            <div key={i} style={{
              borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden',
              gridColumn: i === 0 ? 'span 2' : 'span 1',
            }}>
              <div style={{ height: i === 0 ? 100 : 70, background: '#f3f4f6' }}></div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>Dream interpretation text…</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 100, background: '#eff6ff', color: '#1d4ed8' }}>Isaiah 43:2</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Color Palette Comparison ─────────────────────────── */
function PaletteComparison() {
  const current = [
    { name: 'Primary', hex: '#2563eb', label: 'blue-600' },
    { name: 'Background', hex: '#ffffff', label: 'white', border: true },
    { name: 'Surface', hex: '#f9fafb', label: 'gray-50' },
    { name: 'Text', hex: '#111827', label: 'gray-900' },
    { name: 'Muted', hex: '#6b7280', label: 'gray-500' },
    { name: 'Border', hex: '#e5e7eb', label: 'gray-200', border: true },
  ];

  const proposed = [
    { name: 'Primary', value: 'var(--rec-blue-deep)', label: 'Warm Deep Blue' },
    { name: 'Gold', value: 'var(--rec-gold)', label: 'Sacred Gold' },
    { name: 'Cream', value: 'var(--rec-cream)', label: 'Warm Cream' },
    { name: 'Dark', value: 'var(--rec-dark)', label: 'Warm Dark' },
    { name: 'Muted', value: 'var(--rec-muted)', label: 'Warm Muted' },
    { name: 'Amber', value: 'var(--rec-amber)', label: 'Warm Amber' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--rec-muted)', marginBottom: 12 }}>CURRENT</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {current.map(c => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: c.hex,
                border: c.border ? '1px solid #e5e7eb' : 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}></div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--rec-dark)' }}>{c.name}</div>
                <div style={{ fontSize: 10, color: 'var(--rec-muted)' }}>{c.label}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 12, padding: '8px 12px', borderRadius: 8,
          background: 'oklch(0.97 0.01 0 / 0.5)', fontSize: 11, color: '#dc2626',
          lineHeight: 1.5,
        }}>
          ⚠ Default Tailwind palette — generic, cold, lacks brand identity
        </div>
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--rec-amber)', marginBottom: 12 }}>PROPOSED</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {proposed.map(c => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: c.value,
                boxShadow: '0 1px 3px oklch(0.3 0.03 75 / 0.12)',
              }}></div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--rec-dark)' }}>{c.name}</div>
                <div style={{ fontSize: 10, color: 'var(--rec-muted)' }}>{c.label}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 12, padding: '8px 12px', borderRadius: 8,
          background: 'oklch(0.94 0.04 75 / 0.4)', fontSize: 11, color: 'var(--rec-amber)',
          lineHeight: 1.5, fontWeight: 500,
        }}>
          ✦ Warm, spiritual, cohesive — matches brand imagery
        </div>
      </div>
    </div>
  );
}

/* ── Typography Comparison ────────────────────────────── */
function TypographyComparison() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--rec-muted)', marginBottom: 16 }}>CURRENT</div>
        <div style={{ fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#111', lineHeight: 1.1, marginBottom: 8 }}>
            Heading — System UI
          </div>
          <div style={{ fontSize: 15, color: '#555', lineHeight: 1.6 }}>
            Body text using Geist/system font. Clean but personality-neutral. Every SaaS looks like this.
          </div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--rec-amber)', marginBottom: 16 }}>PROPOSED</div>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 32, color: 'var(--rec-dark)', lineHeight: 1.1, marginBottom: 8 }}>
            Heading — DM Serif Display
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'var(--rec-muted)', lineHeight: 1.6 }}>
            Body text using DM Sans. Warm, readable, with character. Pairs beautifully with the serif headline.
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  Callout, SectionHeader, BeforeAfter, ImprovedLandingHero, CurrentLandingHero,
  ImprovedDashboard, CurrentDashboard, PaletteComparison, TypographyComparison,
});
