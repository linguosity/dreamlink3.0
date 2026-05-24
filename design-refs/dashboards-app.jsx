/* Top-level app — switches between User Settings and Admin via Tweaks */
const { useState: useStateApp } = React;

const App = () => {
  const [tweaks, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "view": "user",
    "showAmbient": true,
    "denseMode": false
  }/*EDITMODE-END*/);

  React.useEffect(() => {
    document.querySelector(".ambient").style.display = tweaks.showAmbient ? "block" : "none";
  }, [tweaks.showAmbient]);

  return (
    <>
      {/* View switcher pinned top-right of viewport (always visible, subtle) */}
      <div style={{
        position: "fixed", top: 16, right: 20, zIndex: 50,
        display: "flex", alignItems: "center", gap: 8,
        padding: 4, background: "var(--card)",
        border: "1px solid var(--border)", borderRadius: 999,
        boxShadow: "var(--shadow)",
      }}>
        {[
          { id: "user", label: "User Settings", icon: "user" },
          { id: "admin", label: "Admin Console", icon: "shield" },
        ].map(v => {
          const active = tweaks.view === v.id;
          return (
            <button key={v.id} onClick={() => setTweak("view", v.id)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "6px 14px", borderRadius: 999,
                fontSize: 12.5, fontWeight: active ? 600 : 500,
                background: active ? "var(--primary)" : "transparent",
                color: active ? "white" : "var(--muted-foreground)",
                transition: "all .15s",
              }}
            >
              <Icon name={v.icon} size={13} />
              {v.label}
            </button>
          );
        })}
      </div>

      {tweaks.view === "user" ? <UserDashboard /> : <AdminDashboard />}

      <TweaksPanel title="Tweaks">
        <TweakSection title="View">
          <TweakRadio label="Dashboard" value={tweaks.view} onChange={(v) => setTweak("view", v)}
            options={[{value: "user", label: "User"}, {value: "admin", label: "Admin"}]} />
        </TweakSection>
        <TweakSection title="Atmosphere">
          <TweakToggle label="Ambient water glow" checked={tweaks.showAmbient} onChange={(v) => setTweak("showAmbient", v)} />
          <TweakToggle label="Dense mode (reduce spacing)" checked={tweaks.denseMode} onChange={(v) => setTweak("denseMode", v)} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
