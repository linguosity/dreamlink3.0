/* Dream Journal — matches dreamlink3.0/app/page.tsx (CompactDreamInput + AnimatedDreamGrid) */

function JournalMockup() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--warm-paper)', overflow: 'hidden' }}>
      <ProductHeader active="Journal" />

      <div style={{ padding: '40px 64px 60px', maxWidth: 1120, margin: '0 auto' }}>

        {/* Welcome */}
        <div style={{ marginBottom: 36 }}>
          <Eyebrow>Tuesday · May 26, 2026</Eyebrow>
          <h1 className="font-serif" style={{ fontSize: 44, color: 'var(--warm-darker)', fontWeight: 400, marginTop: 8, textWrap: 'balance' }}>
            Welcome back, <span style={{ fontStyle: 'italic' }}>Emily</span>.
          </h1>
          <p style={{ fontSize: 15, color: 'var(--warm-muted)', marginTop: 6 }}>
            14 dreams journaled · 12 interpretations · 3 themes recurring this month.
          </p>
        </div>

        {/* Dream Input */}
        <div style={{
          background: 'white',
          border: '1px solid var(--warm-line)',
          borderRadius: 18,
          padding: 32,
          marginBottom: 48,
          boxShadow: '0 4px 12px oklch(0.18 0.02 250 / 0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="font-serif" style={{ fontSize: 22, color: 'var(--warm-darker)' }}>New entry</div>
            <span style={{ fontSize: 12, color: 'var(--warm-muted)' }}>↻ Reading level · Celestial Insight</span>
          </div>
          <div style={{
            border: '1px solid var(--gold)',
            outline: '3px solid oklch(0.72 0.14 75 / 0.16)',
            borderRadius: 12, padding: '14px 18px',
            background: 'oklch(0.99 0.008 75)',
            minHeight: 100,
          }}>
            <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--warm-darker)' }}>
              I was walking across a bridge over a river of golden light. The water moved slowly, almost like it was breathing. On the other side, I could see a figure waiting—but I couldn't make out their face<span style={{ display: 'inline-block', width: 1.5, height: 16, background: 'var(--warm-darker)', marginLeft: 2, verticalAlign: '-3px', animation: 'blink 1s infinite' }} />
            </div>
          </div>
          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 18, fontSize: 12, color: 'var(--warm-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--gold)' }}>⌖</span> Add tags
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--gold)' }}>☾</span> Mood
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--gold)' }}>○</span> Voice note
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <OutlineButton size="md">Save draft</OutlineButton>
              <GoldButton size="md">✦ Get Interpretation</GoldButton>
            </div>
          </div>
        </div>

        {/* Gallery title */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="font-serif" style={{ fontSize: 28, color: 'var(--warm-darker)', fontWeight: 400 }}>
            Your dream gallery
          </h2>
          <div style={{ display: 'flex', gap: 10, fontSize: 12.5, color: 'var(--warm-muted)' }}>
            <span style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--gold)', color: 'var(--night-deep)', fontWeight: 600 }}>All</span>
            <span style={{ padding: '4px 10px', borderRadius: 6 }}>This month</span>
            <span style={{ padding: '4px 10px', borderRadius: 6 }}>Recurring themes</span>
            <span style={{ padding: '4px 10px', borderRadius: 6 }}>Starred</span>
          </div>
        </div>

        {/* Featured analyzed dream */}
        <FeaturedDreamCard />

        {/* Grid of more dreams */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 18 }}>
          <DreamMiniCard
            title="The lighthouse on still water"
            date="May 23"
            tag="Guidance"
            tagColor="oklch(0.55 0.10 235)"
            scripture="Psalm 119:105"
            snippet="A tall lighthouse stood at the edge of a glassy lake. The beam swept slowly, but never landed on me…"
            imageGradient="linear-gradient(160deg, oklch(0.45 0.10 245) 0%, oklch(0.65 0.14 70) 100%)"
          />
          <DreamMiniCard
            title="Climbing the white staircase"
            date="May 21"
            tag="Transition"
            tagColor="var(--gold-deep)"
            scripture="Genesis 28:12"
            snippet="Steps made of cloud, leading somewhere I couldn't see. Each one held my weight, surprisingly…"
            imageGradient="linear-gradient(160deg, oklch(0.95 0.04 75) 0%, oklch(0.78 0.10 60) 100%)"
            interpretationReady={true}
          />
          <DreamMiniCard
            title="An open door in the wheat field"
            date="May 18"
            tag="Provision"
            tagColor="oklch(0.55 0.13 130)"
            scripture="Matthew 13:24"
            snippet="The wheat parted as I walked. A door, free-standing, just open—wide. Light behind it…"
            imageGradient="linear-gradient(160deg, oklch(0.82 0.12 95) 0%, oklch(0.60 0.14 50) 100%)"
          />
        </div>

        {/* Insight prompt */}
        <div style={{
          marginTop: 36,
          background: 'oklch(0.96 0.025 75)',
          border: '1px solid oklch(0.85 0.06 75)',
          borderRadius: 14, padding: 22,
          display: 'flex', alignItems: 'center', gap: 22,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'oklch(0.93 0.04 75)',
            border: '1px solid oklch(0.85 0.08 75)',
            color: 'var(--gold-deep)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
            flexShrink: 0,
          }}>☼</div>
          <div style={{ flex: 1 }}>
            <div className="font-serif" style={{ fontSize: 17, color: 'var(--warm-darker)' }}>A pattern is emerging</div>
            <div style={{ fontSize: 13, color: 'var(--warm-muted)', marginTop: 4 }}>
              Three of your last seven dreams involve <strong style={{ color: 'var(--warm-dark)' }}>thresholds — bridges, doors, staircases</strong>. DreamRiver can write you a longer reflection on that pattern.
            </div>
          </div>
          <OutlineButton size="md">View pattern →</OutlineButton>
        </div>
      </div>
    </div>
  );
}

/* ── Featured analyzed dream — large card showing the analysis output ── */
function FeaturedDreamCard() {
  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--warm-line)',
      borderRadius: 18,
      overflow: 'hidden',
      boxShadow: '0 6px 20px oklch(0.18 0.02 250 / 0.06)',
      display: 'grid', gridTemplateColumns: '420px 1fr',
    }}>
      {/* Image side */}
      <div style={{
        background: 'linear-gradient(165deg, var(--night-deep) 0%, oklch(0.28 0.08 245) 50%, oklch(0.5 0.12 75) 100%)',
        position: 'relative',
        minHeight: 480,
        padding: 28,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        {/* AI-generated dream image placeholder */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 30% 70%, oklch(0.65 0.12 75 / 0.5) 0%, transparent 60%), radial-gradient(circle at 70% 30%, oklch(0.7 0.08 230 / 0.4) 0%, transparent 50%)',
        }} />
        {/* Subtle wave overlay */}
        <svg viewBox="0 0 400 480" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, opacity: 0.25 }}>
          {[260, 300, 340, 380].map((y, i) => (
            <path
              key={i}
              d={`M0 ${y} C 80 ${y - 20}, 140 ${y + 16}, 220 ${y} S 360 ${y - 24}, 400 ${y}`}
              stroke="var(--cream)" strokeWidth={1.5} fill="none" opacity={0.7 - i * 0.15}
            />
          ))}
        </svg>

        <div style={{ position: 'relative' }}>
          <Eyebrow color="var(--gold-light)">Featured · Today, 6:47 AM</Eyebrow>
          <div className="font-serif" style={{
            fontSize: 30, lineHeight: 1.15, color: 'var(--cream)',
            marginTop: 12, textWrap: 'balance', fontStyle: 'italic',
          }}>
            “A bridge over a river of golden light.”
          </div>
        </div>
        <div style={{ position: 'relative', display: 'flex', gap: 8 }}>
          <span style={{
            padding: '3px 10px', borderRadius: 100,
            background: 'oklch(0.22 0.04 250 / 0.7)', color: 'var(--gold-light)',
            fontSize: 11, fontWeight: 600,
            backdropFilter: 'blur(6px)',
            border: '1px solid oklch(0.4 0.06 245)',
          }}>Transition</span>
          <span style={{
            padding: '3px 10px', borderRadius: 100,
            background: 'oklch(0.22 0.04 250 / 0.7)', color: 'var(--gold-light)',
            fontSize: 11, fontWeight: 600,
            backdropFilter: 'blur(6px)',
            border: '1px solid oklch(0.4 0.06 245)',
          }}>Divine presence</span>
        </div>
      </div>

      {/* Analysis side */}
      <div style={{ padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="font-serif" style={{ fontSize: 24, color: 'var(--warm-darker)' }}>Your interpretation</div>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, background: 'var(--success)', borderRadius: '50%' }} /> Ready
          </span>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div className="font-serif" style={{ fontSize: 15, color: 'var(--gold-deep)', marginBottom: 6, fontWeight: 600 }}>Theme</div>
          <div style={{ fontSize: 14, color: 'var(--warm-dark)', lineHeight: 1.55 }}>
            A season of <strong>divine transition</strong> — the bridge as faith, the golden river as God's presence guiding you through change.
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div className="font-serif" style={{ fontSize: 15, color: 'var(--gold-deep)', marginBottom: 6, fontWeight: 600 }}>Analysis</div>
          <p style={{ fontSize: 13.5, color: 'var(--warm-dark)', lineHeight: 1.65 }}>
            Your dream of crossing a bridge over golden light speaks to a season of divine transition. The slow-moving water — "almost breathing" — recalls the Spirit hovering over the waters in Genesis. The unseen figure across the bridge is the call to walk forward in faith before you know who is waiting. This dream is an invitation to move toward what God is preparing, not what you can already see.
          </p>
        </div>

        <div style={{ marginBottom: 22 }}>
          <div className="font-serif" style={{ fontSize: 15, color: 'var(--gold-deep)', marginBottom: 10, fontWeight: 600 }}>Scripture</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              { ref: 'Isaiah 43:2', text: '"When you pass through the waters, I will be with you; and through the rivers, they shall not overflow you."' },
              { ref: 'Psalm 23:4', text: '"Yea, though I walk through the valley of the shadow of death, I will fear no evil…"' },
              { ref: 'Revelation 22:1', text: '"And he shewed me a pure river of water of life, clear as crystal, proceeding out of the throne of God…"' },
            ].map(s => (
              <div key={s.ref} style={{ display: 'flex', gap: 14 }}>
                <ScripturePill>{s.ref}</ScripturePill>
                <span style={{ fontSize: 12.5, color: 'var(--warm-muted)', lineHeight: 1.55, fontStyle: 'italic', flex: 1 }}>
                  {s.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          paddingTop: 16, borderTop: '1px solid var(--warm-line)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--warm-muted)' }}>
            <span>⌖ Pattern: thresholds (3)</span>
            <span>★ Star</span>
            <span>↗ Share</span>
          </div>
          <OutlineButton size="md">Read full reflection →</OutlineButton>
        </div>
      </div>
    </div>
  );
}

/* Smaller dream tile */
function DreamMiniCard({ title, date, tag, tagColor, scripture, snippet, imageGradient, interpretationReady }) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--warm-line)',
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      <div style={{
        height: 130, background: imageGradient, position: 'relative',
        display: 'flex', alignItems: 'flex-start', padding: 14,
      }}>
        <span style={{
          padding: '3px 9px', borderRadius: 100,
          background: 'oklch(0.18 0.02 250 / 0.7)',
          color: 'var(--cream)',
          fontSize: 10, fontWeight: 600,
          backdropFilter: 'blur(6px)',
        }}>{tag}</span>
        {interpretationReady && (
          <span style={{
            marginLeft: 'auto',
            padding: '3px 9px', borderRadius: 100,
            background: 'oklch(0.62 0.13 155 / 0.9)',
            color: 'white', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>● New</span>
        )}
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <div className="font-serif" style={{ fontSize: 16, color: 'var(--warm-darker)', lineHeight: 1.2, flex: 1 }}>{title}</div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--warm-muted)', marginBottom: 10 }}>{date}</div>
        <p style={{ fontSize: 12.5, color: 'var(--warm-muted)', lineHeight: 1.55, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {snippet}
        </p>
        <ScripturePill>{scripture}</ScripturePill>
      </div>
    </div>
  );
}

Object.assign(window, { JournalMockup });
