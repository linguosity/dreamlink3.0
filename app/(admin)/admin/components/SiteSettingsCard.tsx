import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getComingSoonEnabled } from "@/lib/siteSettings";
import ComingSoonToggle from "./ComingSoonToggle";

export default async function SiteSettingsCard() {
  const enabled = await getComingSoonEnabled();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Site Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between gap-4 mb-2">
            <div>
              <h3 className="text-sm font-semibold">Coming-soon mode</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                When ON, public visitors see the /coming-soon splash. Admins
                (allowlisted email or <code className="font-mono">is_admin</code>) bypass.
              </p>
            </div>
            <ComingSoonToggle initialEnabled={enabled} />
          </div>
          <p className="text-xs text-muted-foreground border-l-2 border-border pl-3 mt-3">
            Sign-up is also gated server-side: when ON, only emails in
            <code className="font-mono">{" "}ADMIN_EMAIL_ALLOWLIST{" "}</code>
            can create accounts. Non-allowlisted users see an error and are
            directed to the waitlist.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
