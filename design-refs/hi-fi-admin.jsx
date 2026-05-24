/* Admin Console — matches dreamlink3.0/app/admin/page.tsx */

function AdminMockup() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--warm-paper)', overflow: 'hidden' }}>
      <ProductHeader active="Overview" isAdmin={true} />
      <div style={{ padding: '32px 48px 60px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Topbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 className="font-serif" style={{ fontSize: 32, color: 'var(--warm-darker)', fontWeight: 400, lineHeight: 1.1 }}>
              Overview
            </h1>
            <p style={{ fontSize: 13, color: 'var(--warm-muted)', marginTop: 4 }}>
              <span className="wordmark" style={{ fontSize: 14, color: 'var(--warm-darker)' }}>DreamRiver</span> activity and health · last 14 days
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 14px', background: 'white', border: '1px solid var(--warm-line)',
              borderRadius: 8, fontSize: 12.5,
            }}>
              <span style={{ color: 'var(--warm-muted)' }}>◷ Updated</span>
              <span style={{ fontWeight: 600 }}>10:42 AM</span>
            </div>
            <OutlineButton size="md">⬇ Export</OutlineButton>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
          <KpiCard label="Total Users" value="2,043" sub="vs. last week" trend={12} sparkline={[8,12,9,14,18,15,22]} />
          <KpiCard label="Dreams Analyzed" value="18,724" sub="142 today · 891 this week" trend={8} sparkline={[40,52,48,60,55,72,68]} />
          <KpiCard label="Active Subscriptions" value="287" sub="vs. last week" trend={24} sparkline={[3,5,4,7,8,6,12]} gold />
          <KpiCard label="AI Calls Today" value="1,329" sub="Avg 9.2 dreams/user" trend={-3} sparkline={[180,210,195,220,205,190,175]} gold />
        </div>

        {/* Chart + Signups */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 18 }}>
          <DreamsChart />
          <RecentSignups />
        </div>

        {/* Issues + Site Settings */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 18 }}>
          <RecentIssues />
          <SiteSettings />
        </div>

        {/* System status */}
        <SystemStatus />
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, trend, sparkline, gold }) {
  const up = trend >= 0;
  const max = Math.max(...sparkline, 1);
  return (
    <div style={{
      background: gold ? 'linear-gradient(165deg, oklch(0.96 0.04 75), oklch(0.92 0.06 75))' : 'white',
      border: '1px solid ' + (gold ? 'oklch(0.85 0.08 75)' : 'var(--warm-line)'),
      borderRadius: 12, padding: 18,
      boxShadow: '0 1px 2px oklch(0.18 0.02 250 / 0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--warm-muted)', letterSpacing: '0.04em' }}>{label}</div>
        <span style={{
          fontSize: 10.5, fontWeight: 700,
          color: up ? 'var(--success)' : 'var(--danger)',
          padding: '2px 7px', borderRadius: 100,
          background: up ? 'oklch(0.96 0.06 155)' : 'oklch(0.96 0.05 25)',
        }}>{up ? '↑' : '↓'} {Math.abs(trend)}%</span>
      </div>
      <div className="font-serif" style={{ fontSize: 30, color: gold ? 'var(--gold-deep)' : 'var(--warm-darker)', lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--warm-muted)', marginBottom: 10 }}>{sub}</div>
      {/* sparkline */}
      <svg viewBox={`0 0 140 28`} width="100%" height={28} preserveAspectRatio="none">
        <polyline
          points={sparkline.map((v, i) => `${(i / (sparkline.length - 1)) * 140},${28 - (v / max) * 24}`).join(' ')}
          fill="none" stroke={gold ? 'var(--gold-deep)' : 'var(--warm-darker)'} strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}

function DreamsChart() {
  const data = [22,18,28,34,26,38,42,46,38,52,48,58,62,68];
  const max = Math.max(...data);
  return (
    <div style={{
      background: 'white', border: '1px solid var(--warm-line)',
      borderRadius: 12, padding: 20,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--warm-darker)' }}>Dreams analyzed</div>
          <div style={{ fontSize: 11.5, color: 'var(--warm-muted)', marginTop: 2 }}>Last 14 days</div>
        </div>
        <div style={{ display: 'flex', gap: 2, padding: 2, background: 'oklch(0.96 0.012 75)', borderRadius: 8, fontSize: 11 }}>
          {['14d','30d','90d'].map((t, i) => (
            <span key={t} style={{
              padding: '5px 11px', borderRadius: 6,
              background: i === 0 ? 'white' : 'transparent',
              color: i === 0 ? 'var(--warm-darker)' : 'var(--warm-muted)',
              fontWeight: i === 0 ? 600 : 500,
              boxShadow: i === 0 ? '0 1px 2px oklch(0.18 0.02 250 / 0.1)' : 'none',
            }}>{t}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160 }}>
        {data.map((v, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: '100%', height: `${(v / max) * 140}px`,
              background: i === data.length - 1
                ? 'linear-gradient(to top, var(--gold-deep), var(--gold))'
                : 'linear-gradient(to top, oklch(0.85 0.04 75), oklch(0.92 0.05 75))',
              borderRadius: '4px 4px 0 0',
            }} />
            <span style={{ fontSize: 9, color: 'var(--warm-muted)' }}>{14 - i}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentSignups() {
  const items = [
    { i: 'JD', n: 'Jamie Daniels', t: '2 min ago', plan: 'visionary' },
    { i: 'RP', n: 'Ravi Patel', t: '14 min ago', plan: 'free' },
    { i: 'SK', n: 'Sara Kim', t: '38 min ago', plan: 'prophet' },
    { i: 'MO', n: 'Marcus O.', t: '1 hr ago', plan: 'free' },
    { i: 'LT', n: 'Lily Tang', t: '2 hr ago', plan: 'visionary' },
  ];
  const planChip = (p) => {
    const colors = {
      prophet:   { bg: 'var(--night)', fg: 'var(--gold-light)' },
      visionary: { bg: 'oklch(0.95 0.05 75)', fg: 'var(--gold-deep)' },
      free:      { bg: 'oklch(0.95 0.012 75)', fg: 'var(--warm-muted)' },
    };
    const c = colors[p];
    return (
      <span style={{
        padding: '2px 8px', borderRadius: 100,
        background: c.bg, color: c.fg,
        fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
      }}>{p}</span>
    );
  };
  return (
    <div style={{ background: 'white', border: '1px solid var(--warm-line)', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--warm-darker)' }}>Recent signups</div>
        <span style={{ fontSize: 11, color: 'var(--gold-deep)', fontWeight: 600 }}>View all →</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(it => (
          <div key={it.i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--night-soft), var(--gold))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 11, fontWeight: 600,
            }}>{it.i}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--warm-darker)', fontWeight: 500 }}>{it.n}</div>
              <div style={{ fontSize: 11, color: 'var(--warm-muted)' }}>{it.t}</div>
            </div>
            {planChip(it.plan)}
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentIssues() {
  const items = [
    { t: 'OpenAI rate limit', m: 'TimeoutError: openai-analysis took >30s', d: '12 min ago', sev: 'warn', count: 3 },
    { t: 'Stripe webhook failed', m: 'POST /api/stripe/webhook returned 502', d: '1 hr ago', sev: 'high', count: 1 },
    { t: 'Image generation', m: 'FLUX.2 returned 503 for aesthetic=ethereal', d: '4 hr ago', sev: 'warn', count: 2 },
  ];
  const sevColor = (s) => s === 'high' ? { bg: 'oklch(0.96 0.05 25)', fg: 'var(--danger)' } : { bg: 'oklch(0.96 0.06 75)', fg: 'var(--gold-deep)' };
  return (
    <div style={{ background: 'white', border: '1px solid var(--warm-line)', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--warm-darker)' }}>Recent issues</div>
        <span style={{ fontSize: 11, color: 'var(--gold-deep)', fontWeight: 600 }}>Open Sentry →</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {items.map((it, i) => {
          const c = sevColor(it.sev);
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: 12, background: 'oklch(0.99 0.005 75)',
              border: '1px solid var(--warm-line)', borderRadius: 8,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: c.fg, marginTop: 6, flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--warm-darker)' }}>{it.t}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 100, background: c.bg, color: c.fg, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{it.sev}</span>
                  {it.count > 1 && <span style={{ fontSize: 11, color: 'var(--warm-muted)' }}>×{it.count}</span>}
                </div>
                <div className="font-mono" style={{ fontSize: 11.5, color: 'var(--warm-muted)', lineHeight: 1.4 }}>{it.m}</div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--warm-muted)', whiteSpace: 'nowrap' }}>{it.d}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SiteSettings() {
  return (
    <div style={{ background: 'white', border: '1px solid var(--warm-line)', borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--warm-darker)', marginBottom: 16 }}>Site settings</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--warm-darker)' }}>Coming-soon mode</div>
            <div style={{ fontSize: 11, color: 'var(--warm-muted)' }}>Visitors see waitlist page</div>
          </div>
          <div style={{ width: 40, height: 22, borderRadius: 100, background: 'oklch(0.85 0.01 75)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 2, left: 2, width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px dashed var(--warm-line)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--warm-darker)' }}>Free-tier daily limit</div>
            <div style={{ fontSize: 11, color: 'var(--warm-muted)' }}>Dreams per user / day</div>
          </div>
          <span style={{
            padding: '5px 11px', borderRadius: 6, background: 'oklch(0.96 0.012 75)',
            border: '1px solid var(--warm-line)', fontSize: 13, fontWeight: 600,
            color: 'var(--warm-darker)',
          }}>3</span>
        </div>
      </div>
    </div>
  );
}

function SystemStatus() {
  const items = [
    { l: 'Database', d: 'Supabase PostgreSQL', s: 'ok' },
    { l: 'AI Analysis', d: 'OpenAI gpt-4.1-mini · Edge', s: 'ok' },
    { l: 'Image Generation', d: 'FLUX.2 klein 9B', s: 'ok' },
    { l: 'Payments', d: 'Stripe — not connected', s: 'pending' },
    { l: 'Error Monitoring', d: 'Sentry + client_error_logs', s: 'ok' },
    { l: 'Email', d: 'Not configured', s: 'pending' },
  ];
  const dot = (s) => s === 'ok' ? 'var(--success)' : 'var(--gold-deep)';
  return (
    <div style={{ background: 'white', border: '1px solid var(--warm-line)', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--warm-darker)' }}>System status</div>
        <span style={{ fontSize: 11, color: 'var(--warm-muted)' }}>All times in UTC</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {items.map(it => (
          <div key={it.l} style={{
            padding: 14, borderRadius: 8,
            border: '1px solid var(--warm-line)',
            background: 'oklch(0.99 0.005 75)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot(it.s) }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--warm-darker)' }}>{it.l}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--warm-muted)' }}>{it.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { AdminMockup });
