// Server card: reads the current analytics-digest config and hands it to the
// client form. Lives on /admin/system alongside the other operational cards.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsDigestConfig } from "@/lib/analyticsDigest";
import AnalyticsDigestForm from "./AnalyticsDigestForm";

export async function AnalyticsDigestCard() {
  const config = await getAnalyticsDigestConfig();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Analytics digest</CardTitle>
      </CardHeader>
      <CardContent>
        <AnalyticsDigestForm initial={config} />
      </CardContent>
    </Card>
  );
}
