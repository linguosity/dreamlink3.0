/* Print app — renders both User and Admin dashboards stacked for PDF export */
const PrintApp = () => (
  <>
    <div className="print-page" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BrandMark size={16} color="var(--blue-deep)" stroke={1.7} />
          <div className="wordmark" style={{ fontSize: 16, lineHeight: 1 }}>DreamRiver</div>
          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>— User Settings</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Page 1 of 2</div>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <UserDashboard />
      </div>
    </div>
    <div className="print-page" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BrandMark size={16} color="var(--blue-deep)" stroke={1.7} />
          <div className="wordmark" style={{ fontSize: 16, lineHeight: 1 }}>DreamRiver</div>
          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>— Admin Console</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Page 2 of 2</div>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <AdminDashboard />
      </div>
    </div>
  </>
);

ReactDOM.createRoot(document.getElementById("root")).render(<PrintApp />);

/* Auto-print after fonts and JSX are ready */
(async () => {
  try { await document.fonts.ready; } catch (e) {}
  setTimeout(() => {
    if (window.location.search.includes("autoprint") || true) {
      window.print();
    }
  }, 800);
})();
