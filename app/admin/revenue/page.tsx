// app/admin/revenue/page.tsx
//
// Revenue & subscriptions dashboard (rebuilt 2026-06-09).
// Shows: subscription KPIs + subscribe rate, plan distribution (active only),
// newsletter signup funnel, recent payments, and 30-day AI spend so revenue
// can be read against cost.
//
// NOTE: subscriptions/payments stay empty until the Stripe webhook fixes land
// (docs/stripe-fix-spec.md). The panels are wired to the real tables and
// populate automatically once they do. payments.amount is Stripe cents.

import { getAdminClient } from "@/utils/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { openAiCostUsd, formatUsd } from "@/utils/pricing";

const DAY_MS = 24 * 60 * 60 * 1000;

interface PaymentRow {
  id: string;
  user_id: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  created_at: string | null;
}

async function getRevenueMetrics() {
  const admin = getAdminClient();
  const now = Date.now();
  const weekAgo = new Date(now - 7 * DAY_MS).toISOString();
  const thirtyAgo = new Date(now - 30 * DAY_MS).toISOString();

  const [
    subsResult,
    totalUsersResult,
    newsletterTotal,
    newsletterWeek,
    newsletterBySource,
    recentPayments,
    succeededPayments30d,
    aiUsage30d,
  ] = await Promise.all([
    // Small table (≤1 row per user); plan × status grouping happens in JS.
    admin.from("subscriptions").select("plan, status, created_at"),
    admin.from("profile").select("id", { count: "exact", head: true }),
    admin
      .from("newsletter_signups")
      .select("id", { count: "exact", head: true }),
    admin
      .from("newsletter_signups")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    admin.from("newsletter_signups").select("source"),
    admin
      .from("payments")
      .select("id, user_id, amount, currency, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("payments")
      .select("amount")
      .eq("status", "succeeded")
      .gte("created_at", thirtyAgo),
    admin
      .from("chatgpt_interactions")
      .select("input_tokens, output_tokens, image_cost_usd")
      .gte("created_at", thirtyAgo),
  ]);

  const subscriptions = (subsResult.data || []) as Array<{
    plan: string | null;
    status: string | null;
  }>;

  // Plan distribution counts ACTIVE subscriptions only (2026-06-09 audit fix:
  // previously grouped all rows, so canceled subs inflated the distribution).
  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const planCounts = new Map<string, number>();
  activeSubs.forEach((sub) => {
    const plan = sub.plan || "unknown";
    planCounts.set(plan, (planCounts.get(plan) || 0) + 1);
  });

  // Status breakdown across all rows (active / trialing / past_due / canceled).
  const statusCounts = new Map<string, number>();
  subscriptions.forEach((sub) => {
    const status = sub.status || "unknown";
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
  });

  const totalUsers = totalUsersResult.count || 0;
  const activeCount = activeSubs.length;
  // Subscribe rate: share of all registered users with an active paid plan.
  const subscribeRate =
    totalUsers > 0 ? Math.round((activeCount / totalUsers) * 1000) / 10 : 0;

  // Newsletter source breakdown.
  const sourceCounts = new Map<string, number>();
  ((newsletterBySource.data || []) as Array<{ source: string | null }>).forEach(
    (r) => {
      const s = r.source || "unknown";
      sourceCounts.set(s, (sourceCounts.get(s) || 0) + 1);
    },
  );

  // Revenue (last 30d) — payments.amount is Stripe cents.
  const revenue30dUsd =
    ((succeededPayments30d.data || []) as Array<{ amount: number | null }>)
      .reduce((sum, p) => sum + (p.amount ?? 0), 0) / 100;

  // AI spend (last 30d): token costs at the rates in utils/pricing.ts
  // (pinned to gpt-4.1-mini — update when the model changes) + image costs
  // as stamped at generation time.
  let aiSpend30dUsd = 0;
  ((aiUsage30d.data || []) as Array<{
    input_tokens: number | null;
    output_tokens: number | null;
    image_cost_usd: number | null;
  }>).forEach((r) => {
    aiSpend30dUsd +=
      openAiCostUsd(r.input_tokens, r.output_tokens) +
      (r.image_cost_usd != null ? Number(r.image_cost_usd) : 0);
  });

  return {
    totalSubscriptionRows: subscriptions.length,
    activeSubscriptions: activeCount,
    subscribeRate,
    totalUsers,
    planDistribution: Array.from(planCounts.entries()).map(
      ([plan, count]) => ({ plan, count }),
    ),
    statusBreakdown: Array.from(statusCounts.entries()).map(
      ([status, count]) => ({ status, count }),
    ),
    newsletterTotal: newsletterTotal.count || 0,
    newsletterWeek: newsletterWeek.count || 0,
    newsletterBySource: Array.from(sourceCounts.entries()).map(
      ([source, count]) => ({ source, count }),
    ),
    recentPayments: (recentPayments.data || []) as PaymentRow[],
    revenue30dUsd,
    aiSpend30dUsd,
    stripeConnected: !!process.env.STRIPE_SECRET_KEY,
    webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
  };
}

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default async function RevenuePage() {
  const m = await getRevenueMetrics();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Revenue</h1>
        <p className="text-muted-foreground mt-1">
          Subscriptions, payments, signups, and AI spend
        </p>
      </div>

      {(!m.stripeConnected || !m.webhookConfigured) && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Stripe not fully configured</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {!m.stripeConnected && (
                    <>Missing <code className="text-xs bg-muted px-1 py-0.5 rounded">STRIPE_SECRET_KEY</code>. </>
                  )}
                  {!m.webhookConfigured && (
                    <>Missing <code className="text-xs bg-muted px-1 py-0.5 rounded">STRIPE_WEBHOOK_SECRET</code>. </>
                  )}
                  Subscription and payment data stays empty until the webhook
                  writes succeed (see docs/stripe-fix-spec.md).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI strip */}
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi
          label="Active Subscriptions"
          value={m.activeSubscriptions.toLocaleString()}
          sub={`${m.totalSubscriptionRows} subscription records total`}
        />
        <Kpi
          label="Subscribe Rate"
          value={`${m.subscribeRate}%`}
          sub={`${m.activeSubscriptions} paid of ${m.totalUsers} users`}
        />
        <Kpi
          label="Revenue (30d)"
          value={`$${m.revenue30dUsd.toFixed(2)}`}
          sub="Succeeded payments, last 30 days"
        />
        <Kpi
          label="AI Spend (30d)"
          value={formatUsd(m.aiSpend30dUsd)}
          sub="OpenAI tokens + image generation"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Plan distribution (active only) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Plan Distribution (active)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {m.planDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active subscriptions yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {m.planDistribution.map(({ plan, count }) => (
                  <li
                    key={plan}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="capitalize">{plan}</span>
                    <span className="font-semibold">{count}</span>
                  </li>
                ))}
              </ul>
            )}
            {m.statusBreakdown.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">
                  All records by status
                </p>
                <ul className="space-y-1">
                  {m.statusBreakdown.map(({ status, count }) => (
                    <li
                      key={status}
                      className="flex items-center justify-between text-xs text-muted-foreground"
                    >
                      <span className="capitalize">{status}</span>
                      <span>{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Newsletter funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Newsletter Signups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold">{m.newsletterTotal}</span>
              <span className="text-sm text-muted-foreground">
                total · {m.newsletterWeek} in the last 7 days
              </span>
            </div>
            {m.newsletterBySource.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">By source</p>
                <ul className="space-y-1">
                  {m.newsletterBySource.map(({ source, count }) => (
                    <li
                      key={source}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="capitalize">
                        {source.replace(/_/g, " ")}
                      </span>
                      <span className="font-semibold">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent payments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {m.recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No payments recorded yet. This table populates once the Stripe
              webhook fixes land (docs/stripe-fix-spec.md).
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-3 px-2 font-medium">Date</th>
                    <th className="text-left py-3 px-2 font-medium">User</th>
                    <th className="text-left py-3 px-2 font-medium">Amount</th>
                    <th className="text-left py-3 px-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {m.recentPayments.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-border/50 hover:bg-muted/50"
                    >
                      <td className="py-3 px-2 text-muted-foreground">
                        {p.created_at
                          ? new Date(p.created_at).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="py-3 px-2 font-mono text-xs">
                        {p.user_id ? `${p.user_id.slice(0, 12)}…` : "unlinked"}
                      </td>
                      <td className="py-3 px-2">
                        {p.amount != null
                          ? `$${(p.amount / 100).toFixed(2)} ${(p.currency || "usd").toUpperCase()}`
                          : "—"}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            p.status === "succeeded"
                              ? "bg-green-500/10 text-green-600"
                              : "bg-red-500/10 text-red-600"
                          }`}
                        >
                          {p.status || "unknown"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
