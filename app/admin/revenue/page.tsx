import { getAdminClient } from "@/utils/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getRevenueMetrics() {
  const admin = getAdminClient();

  const [subsResult, activeResult, trialingResult] = await Promise.all([
    admin.from("subscriptions").select("*"),
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "trialing"),
  ]);

  const subscriptions = subsResult.data || [];

  // Plan distribution
  const planCounts = new Map<string, number>();
  subscriptions.forEach((sub) => {
    const plan = sub.plan || "free";
    planCounts.set(plan, (planCounts.get(plan) || 0) + 1);
  });

  return {
    totalSubscriptions: subscriptions.length,
    activeSubscriptions: activeResult.count || 0,
    trialingSubscriptions: trialingResult.count || 0,
    planDistribution: Array.from(planCounts.entries()).map(([plan, count]) => ({
      plan,
      count,
    })),
    stripeConnected: !!process.env.STRIPE_SECRET_KEY,
  };
}

export default async function RevenuePage() {
  const metrics = await getRevenueMetrics();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Revenue</h1>
        <p className="text-muted-foreground mt-1">
          Subscriptions, payments, and plan distribution
        </p>
      </div>

      {!metrics.stripeConnected && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Stripe Not Connected</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add your <code className="text-xs bg-muted px-1 py-0.5 rounded">STRIPE_SECRET_KEY</code> and{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">STRIPE_WEBHOOK_SECRET</code>{" "}
                  environment variables to enable payment processing. Revenue
                  data below shows database records only.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.activeSubscriptions}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Trialing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.trialingSubscriptions}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalSubscriptions}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.planDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No subscription data yet. Once users subscribe, plan breakdowns
              will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {metrics.planDistribution.map(({ plan, count }) => {
                const percentage =
                  metrics.totalSubscriptions > 0
                    ? Math.round((count / metrics.totalSubscriptions) * 100)
                    : 0;
                return (
                  <div key={plan} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize font-medium">{plan}</span>
                      <span className="text-muted-foreground">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stripe Setup Guide</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>To enable full payment processing:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Create a Stripe account at stripe.com</li>
            <li>
              Get your API keys from the Stripe Dashboard (Developers &gt; API
              keys)
            </li>
            <li>
              Add <code className="bg-muted px-1 py-0.5 rounded text-xs">STRIPE_SECRET_KEY</code> and{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">STRIPE_PUBLISHABLE_KEY</code> to
              your Vercel environment variables
            </li>
            <li>
              Set up a webhook endpoint pointing to{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">/api/stripe/webhook</code>
            </li>
            <li>
              Add the <code className="bg-muted px-1 py-0.5 rounded text-xs">STRIPE_WEBHOOK_SECRET</code>{" "}
              to your environment variables
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
