/* Splash / Landing — matches dreamlink3.0/app/landing/page.tsx structure with v2 Moonwater applied */

function SplashMockup() {
  const STEPS = [
    { n: 1, title: 'Write', desc: 'Describe your dream in your own words.', icon: '✎' },
    { n: 2, title: 'Analyze', desc: 'AI finds biblical themes and scripture connections.', icon: '✦' },
    { n: 3, title: 'Reflect', desc: 'Read your personalized interpretation with Bible verses.', icon: '☼' },
  ];
  const FEATURES = [
    { title: 'Biblical References', desc: 'Every interpretation grounded in scripture, not speculation.', icon: '✝' },
    { title: 'AI Dream Analysis', desc: 'Advanced AI trained to understand dream symbolism.', icon: '✦' },
    { title: 'Personalized Reading Levels', desc: 'From simple to scholarly, matched to your preference.', icon: '☰' },
  ];
  const FAQS = [
    { q: 'Is DreamRiver affiliated with a specific church or denomination?', open: true },
    { q: 'How does the AI generate biblical interpretations?', open: false },
    { q: 'Is my dream journal private?', open: false },
    { q: 'Do I need to pay to start?', open: false },
  ];

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--cream-soft)', overflow: 'hidden' }}>
      {/* ─ Header (light) ─────────────────────────────── */}
      <SiteHeader />

      {/* ─ HERO (Night) ───────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(160deg, var(--night-deep) 0%, var(--night) 50%, var(--night-soft) 100%)',
        padding: '80px 64px 120px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* moon glow corner */}
        <div style={{
          position: 'absolute', top: -120, right: 200, width: 360, height: 360, borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(0.5 0.12 75 / 0.30) 0%, transparent 60%)',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, left: -60, width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(0.4 0.08 245 / 0.35) 0%, transparent 60%)',
        }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 64, alignItems: 'center', position: 'relative' }}>
          <div>
            <h1 className="font-serif" style={{
              fontSize: 72, lineHeight: 1.04, color: 'var(--cream)',
              fontWeight: 400, maxWidth: 520, marginBottom: 28, textWrap: 'balance',
            }}>
              Discover What God Is Saying Through Your Dreams
            </h1>
            <p style={{
              fontSize: 18, lineHeight: 1.55, color: 'oklch(0.82 0.02 75)',
              maxWidth: 480, marginBottom: 36,
            }}>
              AI-powered biblical dream interpretation. Journal your dreams, receive scripture-backed insights in seconds.
            </p>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
              <GoldButton size="lg">Start Your Dream Journal — Free</GoldButton>
              <OutlineButton size="lg" on="dark">See an example</OutlineButton>
            </div>
            <p style={{ fontSize: 13.5, color: 'oklch(0.7 0.03 75)', marginBottom: 36 }}>
              Free forever. No credit card required.
            </p>

            {/* social proof */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ display: 'flex' }}>
                {['EM', 'JT', 'AK', 'SR'].map((init, i) => (
                  <div key={init} style={{
                    width: 38, height: 38, borderRadius: '50%',
                    marginLeft: i === 0 ? 0 : -10,
                    background: 'var(--night-soft)',
                    border: '2px solid var(--night)',
                    color: 'var(--cream)',
                    fontSize: 11, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{init}</div>
                ))}
              </div>
              <div>
                <div style={{ display: 'flex', gap: 2, color: 'var(--gold)', marginBottom: 2 }}>
                  {[1,2,3,4,5].map(i => <span key={i} style={{ fontSize: 14 }}>★</span>)}
                </div>
                <div style={{ fontSize: 13, color: 'oklch(0.8 0.025 75)' }}>
                  Joined by <strong style={{ color: 'var(--cream)' }}>2,000+ believers</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Phone mock */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <PhoneMock />
          </div>
        </div>
      </section>

      {/* ─ How It Works ───────────────────────────────── */}
      <section style={{ background: 'var(--warm-white)', padding: '80px 64px' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 className="font-serif" style={{ fontSize: 44, color: 'var(--warm-darker)', fontWeight: 400, marginBottom: 12 }}>
            How It Works
          </h2>
          <p style={{ fontSize: 16, color: 'var(--warm-muted)' }}>
            Three simple steps from dream to scripture-grounded insight.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 48, maxWidth: 920, margin: '0 auto', position: 'relative' }}>
          {/* connecting arrows */}
          <div style={{
            position: 'absolute', top: 32, left: 'calc(33% + 36px)', right: 'calc(33% + 36px)',
            height: 1, background: 'var(--warm-line)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: 'var(--gold)', fontSize: 14, transform: 'translateX(-6px)' }}>›</span>
            <span style={{ color: 'var(--gold)', fontSize: 14, transform: 'translateX(6px)' }}>›</span>
          </div>
          {STEPS.map(s => (
            <div key={s.n} style={{ textAlign: 'center', position: 'relative' }}>
              <div style={{
                width: 68, height: 68, borderRadius: '50%',
                background: 'linear-gradient(135deg, oklch(0.95 0.04 75), oklch(0.92 0.06 75))',
                color: 'var(--gold-deep)',
                margin: '0 auto 18px', fontSize: 26,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid oklch(0.85 0.08 75)',
                position: 'relative',
              }}>
                {s.icon}
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'var(--gold)', color: 'var(--night-deep)',
                  fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{s.n}</span>
              </div>
              <h3 className="font-serif" style={{ fontSize: 22, color: 'var(--warm-darker)', fontWeight: 400, marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--warm-muted)', maxWidth: 200, margin: '0 auto', lineHeight: 1.55 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─ Sample Interpretation ──────────────────────── */}
      <section style={{ background: 'var(--cream-soft)', padding: '80px 64px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Eyebrow>See it in action</Eyebrow>
          <h2 className="font-serif" style={{ fontSize: 36, color: 'var(--warm-darker)', fontWeight: 400, marginTop: 12 }}>
            A real interpretation
          </h2>
        </div>
        <div style={{
          maxWidth: 720, margin: '0 auto',
          background: 'white',
          border: '1px solid var(--warm-line)',
          borderRadius: 18, padding: '48px 56px',
          boxShadow: '0 8px 24px oklch(0.18 0.02 250 / 0.06)',
        }}>
          <div className="font-serif" style={{ color: 'var(--gold)', fontSize: 80, lineHeight: 0.4, marginBottom: 16 }}>“</div>
          <blockquote className="font-serif" style={{
            fontSize: 28, lineHeight: 1.25, color: 'var(--warm-darker)',
            marginBottom: 24, fontStyle: 'italic',
          }}>
            I was walking across a bridge over a river of golden light…
          </blockquote>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--warm-dark)', marginBottom: 6 }}>Analysis:</div>
            <p style={{ fontSize: 14.5, color: 'var(--warm-dark)', lineHeight: 1.65 }}>
              Your dream of crossing a bridge over golden light speaks to a season of divine transition. The glowing river represents God's presence guiding you through change, while the bridge symbolizes faith carrying you from one chapter to the next.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <ScripturePill>Isaiah 43:2</ScripturePill>
            <ScripturePill>Psalm 23:4</ScripturePill>
            <ScripturePill>Revelation 22:1</ScripturePill>
          </div>
        </div>
      </section>

      {/* ─ Features ───────────────────────────────────── */}
      <section style={{ background: 'var(--warm-white)', padding: '80px 64px' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 className="font-serif" style={{ fontSize: 44, color: 'var(--warm-darker)', fontWeight: 400, marginBottom: 12 }}>
            Features
          </h2>
          <p style={{ fontSize: 16, color: 'var(--warm-muted)' }}>
            Built for believers who want to hear God in their dreams.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background: 'white',
              border: '1px solid var(--warm-line)',
              borderRadius: 18, padding: 32,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'oklch(0.95 0.05 75)',
                color: 'var(--gold-deep)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, marginBottom: 20,
                border: '1px solid oklch(0.85 0.08 75)',
              }}>{f.icon}</div>
              <h3 className="font-serif" style={{ fontSize: 22, color: 'var(--warm-darker)', fontWeight: 400, marginBottom: 10 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--warm-muted)', lineHeight: 1.55 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─ FAQ ────────────────────────────────────────── */}
      <section style={{ background: 'var(--cream-soft)', padding: '80px 64px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 className="font-serif" style={{ fontSize: 36, color: 'var(--warm-darker)', fontWeight: 400, marginBottom: 12 }}>
            Frequently Asked Questions
          </h2>
          <p style={{ fontSize: 15, color: 'var(--warm-muted)' }}>Everything you need to know before you start.</p>
        </div>
        <div style={{ maxWidth: 720, margin: '0 auto', borderTop: '1px solid var(--warm-line)', borderBottom: '1px solid var(--warm-line)' }}>
          {FAQS.map((f, i) => (
            <div key={i} style={{
              padding: '20px 0',
              borderTop: i === 0 ? 'none' : '1px solid var(--warm-line)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--warm-darker)' }}>{f.q}</span>
                <span style={{ color: 'var(--gold)', fontSize: 16, transform: f.open ? 'rotate(180deg)' : 'none' }}>▾</span>
              </div>
              {f.open && (
                <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.65, color: 'var(--warm-muted)', paddingRight: 36 }}>
                  No. DreamRiver provides scripture-grounded interpretations and welcomes believers from every tradition. All scripture references use widely accepted translations.
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─ Final CTA (Night) ──────────────────────────── */}
      <section style={{
        background: 'linear-gradient(165deg, var(--night) 0%, var(--night-deep) 100%)',
        padding: '96px 64px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
          width: 400, height: 200, borderRadius: '50%',
          background: 'radial-gradient(ellipse, oklch(0.5 0.12 75 / 0.25) 0%, transparent 60%)',
        }} />
        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
          <h2 className="font-serif" style={{ fontSize: 48, color: 'var(--cream)', fontWeight: 400, lineHeight: 1.1, marginBottom: 36, textWrap: 'balance' }}>
            Begin Your Spiritual Dream Journey Today
          </h2>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center' }}>
            <GoldButton size="lg">Start Your Dream Journal — Free</GoldButton>
            <span style={{ color: 'oklch(0.78 0.025 75)', fontSize: 14, textDecoration: 'underline', textUnderlineOffset: 4 }}>See an example</span>
          </div>
          <p style={{ marginTop: 36, fontSize: 13.5, color: 'oklch(0.65 0.03 75)', maxWidth: 380, margin: '36px auto 0' }}>
            This app is not affiliated with any particular church or denomination. All are welcome.
          </p>
        </div>
      </section>

      {/* ─ Footer ─────────────────────────────────────── */}
      <footer style={{ background: 'var(--night-deep)', padding: '48px 64px 32px', color: 'oklch(0.75 0.025 75)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 48, marginBottom: 32 }}>
          <div>
            <Lockup markSize={22} wordSize={22} color="var(--cream)" on="dark" />
            <p style={{ fontSize: 13, color: 'oklch(0.68 0.025 75)', maxWidth: 240, marginTop: 14, lineHeight: 1.55 }}>
              AI-powered dream interpretation with biblical wisdom.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              {['Subscribe', '→'].map((s, i) => (
                <span key={s} style={{
                  padding: i === 0 ? '8px 14px' : '8px 12px',
                  background: i === 0 ? 'oklch(0.22 0.03 250)' : 'var(--gold)',
                  border: i === 0 ? '1px solid oklch(0.35 0.04 250)' : 'none',
                  borderRadius: i === 0 ? '6px 0 0 6px' : '0 6px 6px 0',
                  fontSize: 12, color: i === 0 ? 'oklch(0.65 0.03 75)' : 'var(--night-deep)',
                  fontWeight: i === 0 ? 400 : 700,
                }}>{i === 0 ? 'your@email.com' : '→'}</span>
              ))}
            </div>
          </div>
          {[
            { h: 'Product', items: ['Features', 'Free Trial'] },
            { h: 'Support', items: ['Help Center', 'Contact'] },
            { h: 'Legal', items: ['Privacy Policy', 'Terms of Service'] },
          ].map(col => (
            <div key={col.h}>
              <h4 style={{ fontSize: 13, color: 'var(--cream)', marginBottom: 14, fontWeight: 600 }}>{col.h}</h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {col.items.map(i => <li key={i} style={{ fontSize: 13, color: 'oklch(0.7 0.025 75)' }}>{i}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div style={{
          paddingTop: 20, borderTop: '1px solid oklch(0.28 0.03 250)',
          textAlign: 'center', fontSize: 12, color: 'oklch(0.55 0.02 250)',
        }}>
          © 2026 DreamRiver. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

/* Phone mockup with v2 branding */
function PhoneMock() {
  return (
    <div style={{
      width: 320, height: 600,
      borderRadius: 42,
      background: '#0a0a0a',
      padding: 10,
      boxShadow: '0 24px 64px oklch(0.08 0.02 250 / 0.6)',
      position: 'relative',
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 36,
        background: 'var(--cream-soft)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* status bar */}
        <div style={{
          padding: '14px 24px 0', display: 'flex', justifyContent: 'space-between',
          fontSize: 12, fontWeight: 600, color: 'var(--warm-darker)',
        }}>
          <span>9:41</span>
          <span>● ● ● ●</span>
        </div>

        {/* nav */}
        <div style={{
          padding: '20px 18px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <ContainedLockup iconSize={26} wordSize={17} />
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--night-soft), var(--gold))',
          }} />
        </div>

        {/* dream input */}
        <div style={{ padding: '14px 18px', flex: 1 }}>
          <Eyebrow>Dream Journal</Eyebrow>
          <div className="font-serif" style={{ fontSize: 20, color: 'var(--warm-darker)', marginTop: 6, marginBottom: 14 }}>New Entry</div>

          <div style={{
            background: 'white', borderRadius: 12, padding: 14,
            border: '1px solid var(--warm-line)',
            fontSize: 13, color: 'var(--warm-dark)', lineHeight: 1.55, minHeight: 90,
          }}>
            I was walking across a bridge over a river of golden light<span style={{ display: 'inline-block', width: 1.5, height: 13, background: 'var(--warm-darker)', marginLeft: 2, verticalAlign: '-2px', animation: 'blink 1s infinite' }} />
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            <ScripturePill>Isaiah 43:2</ScripturePill>
            <ScripturePill>Psalm 23:4</ScripturePill>
          </div>

          <div style={{ marginTop: 18 }}>
            <GoldButton size="md" style={{ width: '100%', justifyContent: 'center', padding: '12px 18px' }}>
              ✦ Get Interpretation
            </GoldButton>
          </div>

          <div style={{
            marginTop: 14, padding: 14, borderRadius: 12,
            background: 'oklch(0.95 0.04 75 / 0.6)',
            border: '1px solid oklch(0.85 0.08 75)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold-deep)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
              ✦ Your Interpretation
            </div>
            <div style={{ fontSize: 12, color: 'var(--warm-dark)', lineHeight: 1.55 }}>
              Your dream of crossing a bridge over golden light speaks to a season of divine transition…
            </div>
          </div>
        </div>

        {/* tab bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-around',
          padding: '12px 0 18px', borderTop: '1px solid var(--warm-line)',
          background: 'oklch(0.97 0.012 75)',
        }}>
          {[
            { l: 'Journal', active: true },
            { l: 'Library' },
            { l: 'Insights' },
            { l: 'Settings' },
          ].map(t => (
            <div key={t.l} style={{ textAlign: 'center' }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6, margin: '0 auto 4px',
                background: t.active ? 'var(--gold)' : 'oklch(0.85 0.01 75)',
              }} />
              <div style={{ fontSize: 9, fontWeight: t.active ? 600 : 500, color: t.active ? 'var(--gold-deep)' : 'var(--warm-muted)' }}>
                {t.l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SplashMockup });
