import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function useVersionCheck() {
  const currentVersion = useRef<string | null>(null);

  useEffect(() => {
    
    async function checkVersion() {
      try {
        const res = await fetch("/version.json", { cache: "no-store" });
        const { version } = await res.json();
        
        if (currentVersion.current && currentVersion.current !== version) {
          toast("New version available", {
            description: "Click to refresh and get the latest updates.",
            action: {
              label: "Refresh",
              onClick: () => window.location.reload(),
            },
            duration: 0, // stays up until clicked
          });
        }
        currentVersion.current = version;
      } catch (e) {
        // Ignore network errors
        console.log("Version check failed:", e);
      }
    }
    
    // Check immediately, then every 5 minutes — and only while the tab is
    // visible (audit: a 30s no-store poll from the root layout meant constant
    // background network churn on every open tab).
    checkVersion();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") checkVersion();
    }, 5 * 60 * 1000);

    const onVisible = () => {
      if (document.visibilityState === "visible") checkVersion();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}