/* Admin dashboard — KPI strip, charts, recent activity, system status, site settings */
const { useState: useStateAdmin } = React;

/* ── Sparkline ───────────────────────────────────────────── */
const Sparkline = ({ data, w = 220, h = 48, color = "var(--primary)" }) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = w / (data.length - 1 || 1);
  const points = data.map((v, i) => `${i * stepX},${h - ((v - min) / range) * (h - 4) - 2}`).join(" ");
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#spark-grad)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ── KPI card ────────────────────────────────────────────── */
const KPI = ({ label, value, sub, trend, trendData, icon, accent }) => (
  <div className="card" style={{ padding: 18, position: "relative", overflow: "hidden" }}>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
      <div>
        <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
        <div className="font-serif" style={{ fontSize: 30, fontWeight: 400, marginTop: 4, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
          {trend !== undefined && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 2, color: trend >= 0 ? "oklch(0.55 0.13 155)" : "var(--danger)", fontWeight: 600 }}>
              <Icon name={trend >= 0 ? "arrowUp" : "arrowDown"} size={11} />
              {Math.abs(trend)}%
            </span>
          )}
          <span>{sub}</span>
        </div>
      </div>
      {icon && (
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: accent === "gold" ? "var(--accent-bg)" : "var(--primary-soft)",
          color: accent === "gold" ? "var(--accent-fg)" : "var(--primary)",
          display: "grid", placeItems: "center", flexShrink: 0,
        }}>
          <Icon name={icon} size={18} />
        </div>
      )}
    </div>
    {trendData && (
      <div style={{ marginTop: 10, marginLeft: -2, marginRight: -2 }}>
        <Sparkline data={trendData} w={260} h={36} color={accent === "gold" ? "var(--gold)" : "var(--primary)"} />
      </div>
    )}
  </div>
);

/* ── Bar chart for 14-day dreams ─────────────────────────── */
const BarChart = ({ data }) => {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 180, padding: "0 4px" }}>
      {data.map((d, i) => {
        const pct = (d.count / max) * 100;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%" }}>
            <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", position: "relative" }}>
              <div title={`${d.count} dreams · ${d.date}`} style={{
                width: "100%",
                height: `${pct}%`,
                minHeight: d.count ? 3 : 0,
                background: i === data.length - 1
                  ? "linear-gradient(180deg, var(--primary), var(--blue-soft))"
                  : "linear-gradient(180deg, oklch(0.75 0.08 235), oklch(0.85 0.05 235))",
                borderRadius: "4px 4px 0 0",
                transition: "all .3s",
              }} />
            </div>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" }}>
              {new Date(d.date).getDate()}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ── Status pill ─────────────────────────────────────────── */
const StatusPill = ({ status }) => {
  const map = {
    operational: { label: "Operational", bg: "oklch(0.95 0.05 155)", fg: "oklch(0.40 0.13 155)", dot: "oklch(0.55 0.15 155)" },
    degraded: { label: "Degraded", bg: "oklch(0.95 0.05 75)", fg: "oklch(0.50 0.14 75)", dot: "var(--gold)" },
    pending: { label: "Pending", bg: "var(--muted)", fg: "var(--muted-foreground)", dot: "oklch(0.65 0.01 75)" },
    down: { label: "Down", bg: "oklch(0.95 0.05 25)", fg: "var(--danger)", dot: "var(--danger)" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 10px", borderRadius: 999, background: s.bg, color: s.fg, fontSize: 11.5, fontWeight: 500 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, animation: status === "operational" ? "pulse-dot 2s ease-in-out infinite" : "none" }} />
      {s.label}
    </span>
  );
};

/* ── Admin nav ───────────────────────────────────────────── */
const ADMIN_NAV = [
  { id: "overview", label: "Overview", icon: "layout" },
  { id: "users", label: "Users", icon: "users" },
  { id: "dreams", label: "Dreams", icon: "droplet" },
  { id: "revenue", label: "Revenue", icon: "dollar" },
  { id: "prompts", label: "Prompts", icon: "wand" },
  { id: "system", label: "System", icon: "server" },
];

/* ── Mock data ───────────────────────────────────────────── */
const dreamsByDay = [
  { date: "2026-04-18", count: 42 }, { date: "2026-04-19", count: 38 },
  { date: "2026-04-20", count: 51 }, { date: "2026-04-21", count: 47 },
  { date: "2026-04-22", count: 55 }, { date: "2026-04-23", count: 62 },
  { date: "2026-04-24", count: 49 }, { date: "2026-04-25", count: 58 },
  { date: "2026-04-26", count: 66 }, { date: "2026-04-27", count: 71 },
  { date: "2026-04-28", count: 64 }, { date: "2026-04-29", count: 78 },
  { date: "2026-04-30", count: 82 }, { date: "2026-05-01", count: 91 },
];

const recentSignups = [
  { id: "a3f9c2b1", time: "12m ago", plan: "free" },
  { id: "8e2d4a55", time: "47m ago", plan: "visionary" },
  { id: "c7b1e09f", time: "1h ago", plan: "free" },
  { id: "f2a8d6c3", time: "2h ago", plan: "free" },
  { id: "b4e0a1f7", time: "3h ago", plan: "prophet" },
  { id: "9d3c8b21", time: "5h ago", plan: "free" },
  { id: "5f7a2e14", time: "8h ago", plan: "visionary" },
];

const recentErrors = [
  { type: "openai_timeout", msg: "Edge function exceeded 60s — analysis aborted on profound depth.", time: "23m ago", user: "a3f9c2b1", device: "iPhone" },
  { type: "image_gen_failed", msg: "FLUX webhook returned 503 — retrying with backoff.", time: "1h ago", user: "8e2d4a55", device: "Mac" },
  { type: "auth_session", msg: "Session refresh failed: cookie missing on /protected/dream.", time: "2h ago", user: null, device: "Android" },
];

const prompts = [
  { name: "dream-analysis-shallow", version: "v3.2", calls: 1247, status: "operational" },
  { name: "dream-analysis-deep", version: "v2.8", calls: 412, status: "operational" },
  { name: "dream-analysis-profound", version: "v1.4", calls: 87, status: "degraded" },
  { name: "image-prompt-photoreal", version: "v2.1", calls: 1746, status: "operational" },
];

/* ── Admin dashboard ─────────────────────────────────────── */
const AdminDashboard = () => {
  const [section, setSection] = useStateAdmin("overview");
  const [comingSoon, setComingSoon] = useStateAdmin(false);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", height: "100%" }}>
      {/* Left rail */}
      <aside style={{
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        padding: "22px 16px",
        display: "flex", flexDirection: "column",
        overflow: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 18px" }}>
          <BrandMark size={28} color="var(--blue-deep)" stroke={1.6} />
          <div>
            <div className="wordmark" style={{ fontSize: 18, lineHeight: 1 }}>DreamRiver</div>
            <div style={{ fontSize: 10.5, color: "var(--gold)", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 3 }}>Admin</div>
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted-foreground)", margin: "8px 12px 6px" }}>Console</div>
        <SidebarNav items={ADMIN_NAV} current={section} onSelect={setSection} />

        <div style={{ flex: 1 }} />

        <div style={{ padding: "12px 14px", background: "var(--cream)", borderRadius: 10, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4, fontWeight: 500 }}>Build</div>
          <div className="font-mono" style={{ fontSize: 11.5 }}>v3.0.14 · main</div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "oklch(0.55 0.15 155)" }} />
            All systems normal
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ overflow: "auto", padding: "26px 32px 60px", position: "relative", zIndex: 1 }}>
        {/* Topbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 className="font-serif" style={{ fontSize: 28, lineHeight: 1.1 }}>Overview</h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>DreamRiver activity and health · last 14 days</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12.5 }}>
              <Icon name="clock" size={13} style={{ color: "var(--muted-foreground)" }} />
              <span style={{ color: "var(--muted-foreground)" }}>Updated</span>
              <span style={{ fontWeight: 500 }}>just now</span>
            </div>
            <button className="btn btn-outline" style={{ fontSize: 12.5 }}>
              <Icon name="chart" size={14}/> Export
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
          <KPI label="Total Users" value="3,847" sub="vs. last week" trend={12} trendData={[120,135,142,150,162,180,205]} icon="users" />
          <KPI label="Dreams Analyzed" value="14,209" sub="91 today · 423 this week" trend={18} trendData={dreamsByDay.map(d => d.count)} icon="droplet" />
          <KPI label="Active Subscriptions" value="412" sub="$2,047 MRR" trend={6} trendData={[380,386,391,398,402,408,412]} icon="creditCard" accent="gold" />
          <KPI label="AI Calls Today" value="91" sub="Avg 3.7 dreams/user" trend={-4} trendData={[112,98,104,87,95,82,91]} icon="sparkles" accent="gold" />
        </div>

        {/* Chart + signups */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 22 }}>
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Dreams analyzed</div>
                <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 2 }}>Last 14 days</div>
              </div>
              <div style={{ display: "flex", gap: 4, padding: 3, background: "var(--muted)", borderRadius: 8, fontSize: 12 }}>
                {["14d", "30d", "90d"].map((t, i) => (
                  <button key={t} style={{
                    padding: "4px 10px", borderRadius: 6,
                    background: i === 0 ? "var(--card)" : "transparent",
                    fontWeight: i === 0 ? 600 : 400,
                    color: i === 0 ? "var(--foreground)" : "var(--muted-foreground)",
                    boxShadow: i === 0 ? "var(--shadow-sm)" : "none",
                  }}>{t}</button>
                ))}
              </div>
            </div>
            <BarChart data={dreamsByDay} />
          </div>

          <div className="card" style={{ padding: 22, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Recent signups</div>
              <a style={{ fontSize: 12, color: "var(--primary)", fontWeight: 500 }}>View all</a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
              {recentSignups.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: i < recentSignups.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: `oklch(0.85 0.06 ${(i * 47) % 360})`, display: "grid", placeItems: "center", color: "white", fontSize: 10, fontWeight: 600 }}>
                      {s.id.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-mono" style={{ fontSize: 12 }}>{s.id.slice(0, 8)}…</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {s.plan !== "free" && (
                      <span className={`badge ${s.plan === "prophet" ? "badge-gold" : "badge-blue"}`} style={{ fontSize: 10 }}>{s.plan}</span>
                    )}
                    <span style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>{s.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent issues + Site settings */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 22 }}>
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--danger)", animation: "pulse-dot 2s ease-in-out infinite" }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>Recent issues</div>
                <span className="badge badge-danger" style={{ fontSize: 10 }}>{recentErrors.length}</span>
              </div>
              <a style={{ fontSize: 12, color: "var(--primary)", fontWeight: 500 }}>Open Sentry →</a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recentErrors.map((e, i) => (
                <div key={i} style={{ padding: "12px 14px", border: "1px solid oklch(0.92 0.05 25)", background: "oklch(0.99 0.01 25)", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span className="font-mono" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--danger)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{e.type}</span>
                    <span style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>{e.time}</span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.45 }}>{e.msg}</div>
                  <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11.5, color: "var(--muted-foreground)" }}>
                    {e.user && <span className="font-mono">{e.user}…</span>}
                    <span>{e.device}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 22 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Site settings</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <ToggleRow icon="cloud" title="Coming-soon mode" desc="Route all visitors to /coming-soon" value={comingSoon} onChange={setComingSoon} />
              <ToggleRow icon="shield" title="Maintenance banner" desc="Show site-wide maintenance notice" value={false} onChange={() => {}} />
              <ToggleRow icon="flask" title="Test mode globally" desc="Enable matrix testing for all admins" value={false} onChange={() => {}} />
            </div>

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 8 }}>Active model</div>
              <div className="font-mono" style={{ fontSize: 12.5, padding: "8px 10px", background: "var(--cream)", borderRadius: 6 }}>OPENAI_MODEL=gpt-4.1-mini</div>
            </div>
          </div>
        </div>

        {/* System status + Prompts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="card" style={{ padding: 22 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>System status</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {[
                { label: "Database", detail: "Supabase PostgreSQL", status: "operational" },
                { label: "AI Analysis", detail: "OpenAI gpt-4.1-mini · Edge", status: "operational" },
                { label: "Image Generation", detail: "FLUX.2 klein 9B", status: "degraded" },
                { label: "Payments", detail: "Stripe — not connected", status: "pending" },
                { label: "Error Monitoring", detail: "Sentry + client_error_logs", status: "operational" },
                { label: "Email", detail: "Not configured", status: "pending" },
              ].map((s, i) => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: i < 5 ? "1px solid var(--border)" : "none" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 1 }}>{s.detail}</div>
                  </div>
                  <StatusPill status={s.status} />
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Prompt registry</div>
              <a style={{ fontSize: 12, color: "var(--primary)", fontWeight: 500 }}>Manage →</a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {prompts.map((p, i) => (
                <div key={p.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: i < prompts.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="font-mono" style={{ fontSize: 12.5, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 2, display: "flex", gap: 10 }}>
                      <span>{p.version}</span>
                      <span>·</span>
                      <span>{p.calls.toLocaleString()} calls</span>
                    </div>
                  </div>
                  <StatusPill status={p.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

window.AdminDashboard = AdminDashboard;
