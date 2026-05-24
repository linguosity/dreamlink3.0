/* User Settings dashboard — left rail nav + multi-section content
 * Brand-aligned with DreamRiver palette (warm parchment + sacred blue + gold)
 */
const { useState: useStateUser } = React;

/* ── Section heading ─────────────────────────────────────── */
const SectionHead = ({ eyebrow, title, desc, action }) => (
  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
    <div>
      {eyebrow && (
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 6 }}>
          {eyebrow}
        </div>
      )}
      <h2 className="font-serif" style={{ fontSize: 26, fontWeight: 400, lineHeight: 1.15, color: "var(--foreground)" }}>{title}</h2>
      {desc && <p style={{ fontSize: 13.5, color: "var(--muted-foreground)", marginTop: 4, maxWidth: 560 }}>{desc}</p>}
    </div>
    {action}
  </div>
);

/* ── Field wrapper ───────────────────────────────────────── */
const Field = ({ label, hint, children, htmlFor }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <label htmlFor={htmlFor} style={{ fontSize: 13, fontWeight: 500 }}>{label}</label>
    {children}
    {hint && <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{hint}</p>}
  </div>
);

/* ── Toggle row ──────────────────────────────────────────── */
const ToggleRow = ({ icon, title, desc, value, onChange }) => (
  <button
    onClick={() => onChange(!value)}
    style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "12px 14px",
      borderRadius: "var(--radius)",
      width: "100%", textAlign: "left",
      transition: "background .15s",
      background: "transparent",
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = "var(--muted)"}
    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
  >
    {icon && (
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: "var(--accent-bg)", color: "var(--accent-fg)",
        display: "grid", placeItems: "center", flexShrink: 0,
      }}>
        <Icon name={icon} size={16} />
      </div>
    )}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
      {desc && <div style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginTop: 2 }}>{desc}</div>}
    </div>
    <div className={`switch ${value ? "on" : ""}`} />
  </button>
);

/* ── Profile summary card ────────────────────────────────── */
const ProfileCard = ({ user, plan }) => {
  const initials = user.name.split(" ").map(s => s[0]).slice(0,2).join("");
  return (
    <div className="card" style={{ padding: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(135deg, var(--blue-deep), var(--blue-soft))",
          color: "white", display: "grid", placeItems: "center",
          fontSize: 18, fontWeight: 600, fontFamily: "DM Serif Display, serif",
        }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{user.name}</div>
          <div className="truncate" style={{ fontSize: 12.5, color: "var(--muted-foreground)" }}>{user.email}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <span className={`badge ${plan === "prophet" ? "badge-gold" : plan === "visionary" ? "badge-blue" : "badge-muted"}`}>
          {plan === "free" ? "Free Plan" : plan === "visionary" ? "Visionary" : "Prophet"}
        </span>
        <span className="badge badge-success">
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }}></span>
          Active
        </span>
      </div>

      <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Dreams</div>
          <div className="font-serif" style={{ fontSize: 22, marginTop: 2 }}>47</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Streak</div>
          <div className="font-serif" style={{ fontSize: 22, marginTop: 2 }}>12 <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontFamily: "DM Sans" }}>days</span></div>
        </div>
      </div>
    </div>
  );
};

/* ── Sidebar nav for user settings ───────────────────────── */
const USER_NAV = [
  { id: "account", label: "Account", icon: "user" },
  { id: "preferences", label: "Preferences", icon: "settings" },
  { id: "analysis", label: "Dream Analysis", icon: "sparkles" },
  { id: "image", label: "Image Style", icon: "palette" },
  { id: "plan", label: "Plan & Billing", icon: "creditCard" },
];

const SidebarNav = ({ items, current, onSelect, footer }) => (
  <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
    {items.map(item => {
      const active = item.id === current;
      return (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          style={{
            display: "flex", alignItems: "center", gap: 11,
            padding: "9px 12px",
            borderRadius: 8,
            fontSize: 13.5,
            fontWeight: active ? 500 : 400,
            color: active ? "var(--primary)" : "var(--foreground)",
            background: active ? "var(--primary-soft)" : "transparent",
            transition: "background .12s, color .12s",
          }}
          onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--muted)"; }}
          onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
        >
          <Icon name={item.icon} size={16} />
          <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
          {item.badge && <span className="badge badge-gold" style={{ fontSize: 10 }}>{item.badge}</span>}
        </button>
      );
    })}
    {footer}
  </nav>
);

/* ── Account section ─────────────────────────────────────── */
const AccountSection = ({ user }) => (
  <>
    <SectionHead
      eyebrow="Identity"
      title="Account"
      desc="Your sign-in identity and security. Email changes route through support."
    />
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Field label="Display name" htmlFor="name">
          <input id="name" className="input" defaultValue={user.name} />
        </Field>
        <Field label="Email address" htmlFor="email" hint="To change, please contact support.">
          <input id="email" className="input" defaultValue={user.email} disabled />
        </Field>
        <Field label="Password" htmlFor="pw">
          <div style={{ display: "flex", gap: 8 }}>
            <input id="pw" type="password" className="input" defaultValue="••••••••••" disabled />
            <button className="btn btn-outline">Reset</button>
          </div>
        </Field>
        <Field label="Time zone" htmlFor="tz">
          <select id="tz" className="input" defaultValue="America/Los_Angeles">
            <option>America/Los_Angeles</option>
            <option>America/Denver</option>
            <option>America/Chicago</option>
            <option>America/New_York</option>
            <option>Europe/London</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
        <button className="btn btn-primary"><Icon name="check" size={14}/> Save changes</button>
      </div>
    </div>

    <div className="card" style={{ padding: 24, marginTop: 18, borderColor: "oklch(0.92 0.05 25)" }}>
      <SectionHead title="Danger zone" desc="Account deletion is processed manually within 30 days. Reach out to delete your account." />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "12px 0" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Delete account & data</div>
          <div style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginTop: 2 }}>Removes all dreams, analyses, and profile data.</div>
        </div>
        <button className="btn btn-outline" style={{ color: "var(--danger)", borderColor: "oklch(0.85 0.10 25)" }}>Request deletion</button>
      </div>
    </div>
  </>
);

/* ── Preferences section ─────────────────────────────────── */
const PreferencesSection = () => {
  const [prefs, setPrefs] = useStateUser({
    emailNotifications: true,
    dreamReminders: true,
    biblicalRefs: true,
    multiKeyword: false,
    darkMode: false,
  });
  const set = (k) => (v) => setPrefs(p => ({ ...p, [k]: v }));

  return (
    <>
      <SectionHead
        eyebrow="Experience"
        title="Preferences"
        desc="Tune notifications, search, and how DreamRiver appears for you."
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 12 }}>Notifications</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <ToggleRow icon="mail" title="Email updates" desc="Weekly summaries and product news" value={prefs.emailNotifications} onChange={set("emailNotifications")} />
            <ToggleRow icon="bell" title="Dream reminders" desc="A nudge to journal each night" value={prefs.dreamReminders} onChange={set("dreamReminders")} />
          </div>
          {prefs.dreamReminders && (
            <div style={{ marginTop: 12, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <Field label="Reminder time" htmlFor="rt">
                <input id="rt" type="time" defaultValue="21:00" className="input" style={{ maxWidth: 140 }} />
              </Field>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 12 }}>Interface</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <ToggleRow icon="book" title="Biblical references" desc="Include scripture in dream analyses" value={prefs.biblicalRefs} onChange={set("biblicalRefs")} />
            <ToggleRow icon="search" title="Multi-keyword search" desc="Filter dreams by multiple terms" value={prefs.multiKeyword} onChange={set("multiKeyword")} />
            <ToggleRow icon="moon" title="Dark mode" desc="Warm-tinted dark for nighttime" value={prefs.darkMode} onChange={set("darkMode")} />
          </div>
          <div style={{ marginTop: 12, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <Field label="Language" htmlFor="lang">
              <select id="lang" className="input" defaultValue="en">
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </Field>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <button className="btn btn-primary"><Icon name="check" size={14}/> Save preferences</button>
      </div>
    </>
  );
};

/* ── Analysis section ────────────────────────────────────── */
const READING_LEVELS = [
  { id: "radiant", label: "Radiant Clarity", sub: "Simple, everyday language", words: "150–250 words" },
  { id: "celestial", label: "Celestial Insight", sub: "Standard theological depth", words: "250–400 words" },
  { id: "prophetic", label: "Prophetic Wisdom", sub: "Advanced with scholarly references", words: "400–600 words" },
  { id: "divine", label: "Divine Revelation", sub: "Scholarly in-depth exegesis", words: "600+ words" },
];

const DEPTHS = [
  { id: "shallow", label: "Shallow", blurb: "Topic + 1–3 supporting points + summary.", plan: "free" },
  { id: "deep", label: "Deep", blurb: "Adds symbol-by-symbol breakdown + life application.", plan: "visionary" },
  { id: "profound", label: "Profound", blurb: "Three lenses + cross-references + reflection prompts.", plan: "prophet" },
];

const PLAN_RANK = { free: 0, visionary: 1, prophet: 2 };

const AnalysisSection = ({ plan, isAdmin }) => {
  const [reading, setReading] = useStateUser("celestial");
  const [bible, setBible] = useStateUser("KJV");
  const [depth, setDepth] = useStateUser("shallow");
  const [testMode, setTestMode] = useStateUser(false);

  return (
    <>
      <SectionHead
        eyebrow="Interpretation"
        title="Dream Analysis"
        desc="Reading level shapes the language; analysis depth controls how far the AI explores."
      />

      <div className="card" style={{ padding: 22 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Reading level</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {READING_LEVELS.map(r => (
            <button key={r.id} onClick={() => setReading(r.id)}
              className={reading === r.id ? "ring-primary" : ""}
              style={{
                padding: "12px 14px", borderRadius: 10, textAlign: "left",
                background: reading === r.id ? "var(--primary-soft)" : "var(--card)",
                border: "1px solid var(--border)",
                transition: "all .15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.label}</div>
                <span className="badge badge-muted" style={{ fontSize: 10 }}>{r.words}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>{r.sub}</div>
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
          <Field label="Bible version" hint="Used for scripture references in analyses">
            <select className="input" value={bible} onChange={e => setBible(e.target.value)}>
              <option value="KJV">King James Version (KJV)</option>
              <option value="NIV">New International Version (NIV)</option>
              <option value="ESV">English Standard Version (ESV)</option>
              <option value="NKJV">New King James Version (NKJV)</option>
            </select>
          </Field>
          <Field label="Default mood tag" hint="Pre-fills when journaling new dreams">
            <select className="input" defaultValue="reflective">
              <option value="reflective">Reflective</option>
              <option value="vivid">Vivid</option>
              <option value="prophetic">Prophetic</option>
              <option value="unsettled">Unsettled</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="card" style={{ padding: 22, marginTop: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>Analysis depth</span>
          {plan !== "prophet" && !isAdmin && <a style={{ fontSize: 12, color: "var(--primary)", fontWeight: 500 }}>Upgrade to unlock all →</a>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {DEPTHS.map(d => {
            const locked = !isAdmin && PLAN_RANK[d.plan] > PLAN_RANK[plan];
            const selected = depth === d.id;
            return (
              <button key={d.id}
                disabled={locked}
                onClick={() => !locked && setDepth(d.id)}
                className={selected && !locked ? "ring-primary" : ""}
                style={{
                  padding: "14px 16px", borderRadius: 10, textAlign: "left",
                  border: "1px solid var(--border)",
                  background: selected && !locked ? "var(--primary-soft)" : locked ? "var(--muted)" : "var(--card)",
                  opacity: locked ? 0.6 : 1,
                  cursor: locked ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 14,
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  border: `2px solid ${selected && !locked ? "var(--primary)" : "var(--border-strong)"}`,
                  display: "grid", placeItems: "center", flexShrink: 0,
                }}>
                  {selected && !locked && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)" }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{d.label}</span>
                    {locked && <Icon name="lock" size={11} style={{ color: "var(--muted-foreground)" }} />}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginTop: 2 }}>{d.blurb}</div>
                </div>
                {d.plan !== "free" && (
                  <span className={`badge ${d.plan === "prophet" ? "badge-gold" : "badge-blue"}`}>
                    {d.plan === "prophet" ? "Prophet" : "Visionary"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {isAdmin && (
        <div className="card" style={{ padding: 22, marginTop: 18, borderColor: "oklch(0.85 0.10 75)", background: "linear-gradient(180deg, oklch(0.99 0.02 75), white)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-bg)", color: "var(--accent-fg)", display: "grid", placeItems: "center" }}>
                <Icon name="flask" size={16} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  Test Mode <span className="badge badge-gold" style={{ fontSize: 10 }}>Admin</span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--muted-foreground)" }}>Fan one submission across multiple settings to compare side-by-side.</div>
              </div>
            </div>
            <div className={`switch ${testMode ? "on" : ""}`} onClick={() => setTestMode(!testMode)} style={{ cursor: "pointer" }} />
          </div>
          {testMode && (
            <div style={{ marginTop: 12, padding: 14, background: "var(--cream)", borderRadius: 8, fontSize: 12.5, color: "var(--muted-foreground)" }}>
              Matrix size: <strong style={{ color: "var(--foreground)" }}>6 cards</strong> per submission (3 depths × 2 reading levels × 1 aesthetic).
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <button className="btn btn-primary"><Icon name="check" size={14}/> Save analysis settings</button>
      </div>
    </>
  );
};

/* ── Image Style section ─────────────────────────────────── */
const AESTHETICS = [
  { id: "photo", name: "Photorealistic Vision", desc: "Cinematic, life-like with rich detail", tier: "free", grad: "linear-gradient(135deg, oklch(0.55 0.07 235), oklch(0.40 0.10 250))" },
  { id: "watercolor", name: "Watercolor Reverie", desc: "Soft washes and dreamy edges", tier: "free", grad: "linear-gradient(135deg, oklch(0.85 0.06 235), oklch(0.75 0.10 75))" },
  { id: "renaissance", name: "Renaissance Allegory", desc: "Classical symbolism, oil-paint depth", tier: "visionary", grad: "linear-gradient(135deg, oklch(0.45 0.10 60), oklch(0.30 0.05 30))" },
  { id: "celestial", name: "Celestial Tapestry", desc: "Star-fields and luminous fabric", tier: "visionary", grad: "linear-gradient(135deg, oklch(0.30 0.10 270), oklch(0.55 0.13 240))" },
  { id: "prophetic", name: "Prophetic Vision", desc: "Bold, vivid, symbolic intensity", tier: "prophet", grad: "linear-gradient(135deg, oklch(0.50 0.18 30), oklch(0.65 0.16 60))" },
  { id: "byzantine", name: "Byzantine Icon", desc: "Gold-leaf, sacred geometry", tier: "prophet", grad: "linear-gradient(135deg, oklch(0.72 0.14 75), oklch(0.55 0.13 50))" },
];

const ImageStyleSection = ({ plan }) => {
  const [selected, setSelected] = useStateUser("watercolor");
  const tierRank = PLAN_RANK[plan];

  return (
    <>
      <SectionHead
        eyebrow="Aesthetic"
        title="Dream Image Style"
        desc="Choose how AI-generated dream images look. Each dream becomes one image."
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {AESTHETICS.map(a => {
          const locked = PLAN_RANK[a.tier] > tierRank;
          const isSelected = selected === a.id && !locked;
          return (
            <button key={a.id}
              disabled={locked}
              onClick={() => !locked && setSelected(a.id)}
              className={isSelected ? "ring-primary" : ""}
              style={{
                padding: 0,
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--card)",
                overflow: "hidden",
                textAlign: "left",
                opacity: locked ? 0.55 : 1,
                cursor: locked ? "not-allowed" : "pointer",
                transition: "all .15s",
                position: "relative",
              }}
            >
              <div style={{ height: 110, background: a.grad, position: "relative" }}>
                {locked && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)", display: "grid", placeItems: "center" }}>
                    <Icon name="lock" size={20} style={{ color: "white" }} />
                  </div>
                )}
                {a.tier !== "free" && (
                  <span className={`badge ${a.tier === "prophet" ? "badge-gold" : "badge-blue"}`} style={{ position: "absolute", top: 10, right: 10 }}>
                    {a.tier === "prophet" ? "Prophet" : "Visionary"}
                  </span>
                )}
              </div>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 3 }}>{a.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <button className="btn btn-primary"><Icon name="check" size={14}/> Save image style</button>
      </div>
    </>
  );
};

/* ── Plan section ────────────────────────────────────────── */
const PLANS = [
  { id: "free", name: "Free", price: "$0", per: "forever", features: ["Daily journal", "Shallow analysis", "Photorealistic + Watercolor", "Limited scripture references"], cta: "Current plan" },
  { id: "visionary", name: "Visionary", price: "$4.99", per: "per month", features: ["Everything in Free", "Deep analysis", "+ Renaissance & Celestial styles", "Unlimited scripture references", "Pattern tracking"], cta: "Upgrade", featured: true },
  { id: "prophet", name: "Prophet", price: "$9.99", per: "per month", features: ["Everything in Visionary", "Profound analysis", "+ Byzantine & Prophetic styles", "Symbol dictionary", "Export & backup"], cta: "Upgrade" },
];

const PlanSection = ({ plan }) => (
  <>
    <SectionHead
      eyebrow="Subscription"
      title="Plan & Billing"
      desc="Your access tier shapes analysis depth and the image styles available to you."
    />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
      {PLANS.map(p => {
        const isCurrent = p.id === plan;
        return (
          <div key={p.id} className="card" style={{
            padding: 22,
            position: "relative",
            borderColor: p.featured ? "var(--primary)" : "var(--border)",
            borderWidth: p.featured ? 2 : 1,
            background: p.featured ? "linear-gradient(180deg, var(--primary-soft), var(--card))" : "var(--card)",
          }}>
            {p.featured && (
              <span className="badge badge-blue" style={{ position: "absolute", top: -10, left: 18 }}>Most popular</span>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="font-serif" style={{ fontSize: 22 }}>{p.name}</div>
              {isCurrent && <span className="badge badge-success">Current</span>}
            </div>
            <div style={{ marginTop: 10, marginBottom: 14 }}>
              <span className="font-serif" style={{ fontSize: 36 }}>{p.price}</span>
              <span style={{ fontSize: 13, color: "var(--muted-foreground)", marginLeft: 6 }}>{p.per}</span>
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 9, marginBottom: 18 }}>
              {p.features.map(f => (
                <li key={f} style={{ display: "flex", gap: 9, fontSize: 13 }}>
                  <Icon name="check" size={14} style={{ color: "var(--primary)", marginTop: 3, flexShrink: 0 }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              className={isCurrent ? "btn btn-outline" : "btn btn-primary"}
              style={{ width: "100%", justifyContent: "center" }}
              disabled={isCurrent}
            >
              {isCurrent ? "Current plan" : p.cta}
            </button>
          </div>
        );
      })}
    </div>

    <div className="card" style={{ padding: 22, marginTop: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: 12 }}>Billing history</div>
      <div style={{ fontSize: 13, color: "var(--muted-foreground)", padding: "20px 0", textAlign: "center" }}>
        No charges yet — you're on the Free plan.
      </div>
    </div>
  </>
);

/* ── User Settings layout ────────────────────────────────── */
const UserDashboard = ({ initialUser }) => {
  const [section, setSection] = useStateUser("preferences");
  const user = initialUser || { name: "Sarah Chen", email: "sarah.chen@gmail.com" };
  const plan = "visionary";
  const isAdmin = true;

  const sections = {
    account: <AccountSection user={user} />,
    preferences: <PreferencesSection />,
    analysis: <AnalysisSection plan={plan} isAdmin={isAdmin} />,
    image: <ImageStyleSection plan={plan} />,
    plan: <PlanSection plan={plan} />,
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", height: "100%", gap: 0 }}>
      {/* Left rail */}
      <aside style={{
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        padding: "22px 16px",
        display: "flex", flexDirection: "column",
        overflow: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px 18px" }}>
          <BrandMark size={22} color="var(--blue-deep)" stroke={1.7} />
          <div className="wordmark" style={{ fontSize: 18, lineHeight: 1 }}>DreamRiver</div>
        </div>
        <ProfileCard user={user} plan={plan} />
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted-foreground)", margin: "22px 12px 8px" }}>Settings</div>
        <SidebarNav items={USER_NAV} current={section} onSelect={setSection} />

        <div style={{ flex: 1 }} />

        <div style={{ marginTop: 16, padding: "14px 16px", background: "linear-gradient(135deg, oklch(0.95 0.04 75), oklch(0.99 0.01 75))", borderRadius: 12, border: "1px solid oklch(0.88 0.06 75)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Icon name="sparkles" size={14} style={{ color: "var(--gold)" }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-fg)" }}>Try Prophet</div>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginBottom: 10 }}>Unlock profound analysis and all 6 image styles.</div>
          <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px", width: "100%", justifyContent: "center" }}>Upgrade →</button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{
        overflow: "auto",
        padding: "32px 40px 60px",
        position: "relative",
        zIndex: 1,
      }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          {sections[section]}
        </div>
      </main>
    </div>
  );
};

window.UserDashboard = UserDashboard;
window.SidebarNav = SidebarNav;
window.SectionHead = SectionHead;
window.Field = Field;
window.ToggleRow = ToggleRow;
