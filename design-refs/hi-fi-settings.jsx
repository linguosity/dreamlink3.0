/* Settings — matches dreamlink3.0/app/settings/page.tsx (left rail + sections) */

function SettingsMockup() {
  const NAV = [
    { id: 'account', label: 'Account', icon: '👤' },
    { id: 'preferences', label: 'Preferences', icon: '⚙', active: true },
    { id: 'analysis', label: 'Dream Analysis', icon: '✦' },
    { id: 'image', label: 'Image Style', icon: '⌖' },
    { id: 'plan', label: 'Plan', icon: '☆' },
  ];

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--warm-paper)', overflow: 'hidden' }}>
      <ProductHeader active="Settings" />

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 32, padding: '40px 64px 60px', maxWidth: 1200, margin: '0 auto' }}>

        {/* ── Left rail ─────────────────────────────────── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Profile card */}
          <div style={{
            background: 'white', border: '1px solid var(--warm-line)',
            borderRadius: 14, padding: 18,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--night-soft), var(--gold))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 15, fontWeight: 600,
              }}>EM</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--warm-darker)' }}>Emily M.</div>
                <div style={{ fontSize: 11.5, color: 'var(--warm-muted)' }}>emily@email.com</div>
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: 11.5, color: 'var(--warm-muted)',
              paddingTop: 12, borderTop: '1px dashed var(--warm-line)',
            }}>
              <span>14 dreams</span>
              <span style={{
                padding: '2px 8px', borderRadius: 100,
                background: 'var(--night)', color: 'var(--gold-light)',
                fontSize: 10, fontWeight: 700,
              }}>PROPHET</span>
            </div>
          </div>

          {/* Nav */}
          <div>
            <div className="font-mono" style={{
              fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--warm-muted)',
              padding: '0 12px', marginBottom: 6,
            }}>Settings</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {NAV.map(n => (
                <div key={n.id} style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '9px 12px',
                  borderRadius: 8,
                  background: n.active ? 'oklch(0.95 0.05 75)' : 'transparent',
                  borderLeft: n.active ? '3px solid var(--gold)' : '3px solid transparent',
                  paddingLeft: n.active ? 9 : 12,
                  color: n.active ? 'var(--gold-deep)' : 'var(--warm-dark)',
                  fontSize: 13.5, fontWeight: n.active ? 600 : 500,
                }}>
                  <span style={{ width: 16, textAlign: 'center', opacity: 0.7 }}>{n.icon}</span>
                  <span>{n.label}</span>
                </div>
              ))}
            </nav>
          </div>

          {/* Upgrade CTA */}
          <div style={{
            background: 'linear-gradient(165deg, var(--night) 0%, var(--night-deep) 100%)',
            borderRadius: 14, padding: 18,
            color: 'var(--cream)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.15 }}>
              <MoonwaterMark size={80} />
            </div>
            <div style={{ position: 'relative' }}>
              <Eyebrow color="var(--gold-light)">Already a Prophet</Eyebrow>
              <div className="font-serif" style={{ fontSize: 18, color: 'var(--cream)', marginTop: 8, marginBottom: 6 }}>
                Manage subscription
              </div>
              <div style={{ fontSize: 12, color: 'oklch(0.78 0.025 75)', marginBottom: 12, lineHeight: 1.5 }}>
                Next billing May 31 · $9.99/mo
              </div>
              <span style={{
                display: 'inline-block', padding: '7px 14px', borderRadius: 100,
                background: 'var(--gold)', color: 'var(--night-deep)',
                fontSize: 12, fontWeight: 700,
              }}>Open portal →</span>
            </div>
          </div>
        </aside>

        {/* ── Main ──────────────────────────────────────── */}
        <main style={{ minWidth: 0 }}>
          <div style={{ marginBottom: 28 }}>
            <Eyebrow>Experience</Eyebrow>
            <h1 className="font-serif" style={{ fontSize: 36, color: 'var(--warm-darker)', fontWeight: 400, marginTop: 6 }}>
              Preferences
            </h1>
            <p style={{ fontSize: 14, color: 'var(--warm-muted)', marginTop: 4 }}>
              Tune notifications, search, and how DreamRiver appears for you.
            </p>
          </div>

          <SettingsGroup title="Notifications">
            <ToggleRow
              label="Email notifications"
              desc="Get notified when an interpretation is ready or a pattern emerges."
              on={true}
            />
            <ToggleRow
              label="Dream reminders"
              desc="A gentle nudge each evening to journal before sleep."
              on={true}
              extra={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--warm-muted)' }}>Time</span>
                  <div style={{
                    padding: '6px 14px', borderRadius: 8,
                    border: '1px solid var(--warm-line)',
                    background: 'white', fontSize: 13, color: 'var(--warm-darker)',
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                  }}>9:00 PM <span style={{ color: 'var(--warm-muted)' }}>▾</span></div>
                </div>
              }
            />
          </SettingsGroup>

          <SettingsGroup title="Interpretation">
            <ToggleRow
              label="Include biblical references"
              desc="Show supporting scripture verses inline with every interpretation."
              on={true}
            />
            <SelectRow
              label="Language"
              desc="The voice of your interpretations."
              value="English"
            />
          </SettingsGroup>

          <SettingsGroup title="Privacy">
            <ToggleRow
              label="Anonymous pattern research"
              desc="Allow DreamRiver to use anonymized themes (no dream content) to improve interpretations for everyone."
              on={false}
            />
          </SettingsGroup>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 28 }}>
            <GoldButton size="md">Save preferences</GoldButton>
          </div>
        </main>
      </div>
    </div>
  );
}

function SettingsGroup({ title, children }) {
  return (
    <section style={{
      background: 'white', border: '1px solid var(--warm-line)',
      borderRadius: 14, padding: 28, marginBottom: 18,
    }}>
      <div className="font-serif" style={{ fontSize: 19, color: 'var(--warm-darker)', marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--warm-line)' }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {children}
      </div>
    </section>
  );
}

function ToggleRow({ label, desc, on, extra }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--warm-darker)', marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 12.5, color: 'var(--warm-muted)', lineHeight: 1.55, maxWidth: 540 }}>{desc}</div>
        {extra}
      </div>
      <div style={{
        position: 'relative', width: 40, height: 22,
        borderRadius: 100, flexShrink: 0,
        background: on ? 'var(--gold)' : 'oklch(0.85 0.01 75)',
        transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: on ? 20 : 2,
          width: 18, height: 18, borderRadius: '50%',
          background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.2s',
        }} />
      </div>
    </div>
  );
}

function SelectRow({ label, desc, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--warm-darker)', marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 12.5, color: 'var(--warm-muted)', lineHeight: 1.55 }}>{desc}</div>
      </div>
      <div style={{
        padding: '8px 14px', borderRadius: 8,
        border: '1px solid var(--warm-line)',
        background: 'white', fontSize: 13, color: 'var(--warm-darker)',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        minWidth: 140,
      }}>
        {value} <span style={{ color: 'var(--warm-muted)', marginLeft: 'auto' }}>▾</span>
      </div>
    </div>
  );
}

Object.assign(window, { SettingsMockup });
