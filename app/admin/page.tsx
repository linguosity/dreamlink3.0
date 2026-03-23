import { createClient } from "@/utils/supabase/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminOverviewCharts } from "./components/AdminOverviewCharts";

interface DashboardMetrics {
  totalUsers: number;
  totalDreams: number;
  dreamsToday: number;
  dreamsThisWeek: number;
  activeSubscriptions: number;
  totalRevenue: number;
  avgDreamsPerUser: number;
  aiCallsToday: number;
  recentSignups: Array<{
    user_id: string;
    created_at: string;
  }>;
  dreamsByDay: Array<{
    date: string;
    count: number;
  }>;
}

async function getMetrics(): Promise<DashboardMetrics> {
  const admin = getAdminClient();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Run all queries in parallel for speed
  const [
    usersResult,
    dreamsResult,
    dreamsTodayResult,
    dreamsWeekResult,
    subscriptionsResult,
    aiCallsTodayResult,
    recentSignupsResult,
  ] = await Promise.all([
    // Total users
    admin.from("profile").select("id", { count: "exact", head: true }),
    // Total dreams
    admin.from("dream_entries").select("id", { count: "exact", head: true }),
    // Dreams today
    admin
      .from("dream_entries")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart),
    // Dreams this week
    admin
      .from("dream_entries")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    // Active subscriptions
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    // AI calls today
    admin
      .from("chatgpt_interactions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart),
    // Recent signups (last 10)
    admin
      .from("profile")
      .select("user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Get dreams by day for the last 14 days
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentDreams } = await admin
    .from("dream_entries")
    .select("created_at")
    .gte("created_at", twoWeeksAgo)
    .order("created_at", { ascending: true });

  // Aggregate dreams by day
  const dreamsByDayMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split("T")[0];
    dreamsByDayMap.set(key, 0);
  }
  recentDreams?.forEach((dream) => {
    const key = dream.created_at.split("T")[0];
    if (dreamsByDayMap.has(key)) {
      dreamsByDayMap.set(key, (dreamsByDayMap.get(key) || 0) + 1);
    }
  });

  const totalUsers = usersResult.count || 0;
  const totalDreams = dreamsResult.count || 0;

  return {
    totalUsers,
    totalDreams,
    dreamsToday: dreamsTodayResult.count || 0,
    dreamsThisWeek: dreamsWeekResult.count || 0,
    activeSubscriptions: subscriptionsResult.count || 0,
    totalRevenue: 0, // Populated once Stripe is connected
    avgDreamsPerUser: totalUsers > 0 ? Math.round((totalDreams / totalUsers) * 10) / 10 : 0,
    aiCallsToday: aiCallsTodayResult.count || 0,
    recentSignups: recentSignupsResult.data || [],
    dreamsByDay: Array.from(dreamsByDayMap.entries()).map(([date, count]) => ({
      date,
      count,
    })),
  };
}

export default async function AdminDashboard() {
  const metrics = await getMetrics();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of Dreamlink activity and health
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={metrics.totalUsers.toLocaleString()}
          subtitle="All registered accounts"
        />
        <MetricCard
          title="Dreams Analyzed"
          value={metrics.totalDreams.toLocaleString()}
          subtitle={`${metrics.dreamsToday} today · ${metrics.dreamsThisWeek} this week`}
        />
        <MetricCard
          title="Active Subscriptions"
          value={metrics.activeSubscriptions.toLocaleString()}
          subtitle="Paid plans"
        />
        <MetricCard
          title="AI Calls Today"
          value={metrics.aiCallsToday.toLocaleString()}
          subtitle={`Avg ${metrics.avgDreamsPerUser} dreams/user`}
        />
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dreams Analyzed (14 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminOverviewCharts data={metrics.dreamsByDay} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Signups</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.recentSignups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No signups yet</p>
            ) : (
              <div className="space-y-3">
                {metrics.recentSignups.map((signup) => (
                  <div
                    key={signup.user_id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-mono text-xs text-muted-foreground truncate max-w-[140px]">
                      {signup.user_id.slice(0, 8)}...
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatRelativeTime(signup.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <StatusItem
              label="Database"
              status="operational"
              detail="Supabase PostgreSQL"
            />
            <StatusItem
              label="AI Analysis"
              status="operational"
              detail="OpenAI gpt-4o-mini"
            />
            <StatusItem
              label="Image Generation"
              status="operational"
              detail="FLUX.2 klein 9B"
            />
            <StatusItem
              label="Payments"
              status="pending"
              detail="Stripe not connected"
            />
            <StatusItem
              label="Error Monitoring"
              status="pending"
              detail="Sentry not connected"
            />
            <StatusItem
              label="Email"
              status="pending"
              detail="Not configured"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function StatusItem({
  label,
  status,
  detail,
}: {
  label: string;
  status: "operational" | "degraded" | "pending";
  detail: string;
}) {
  const colors = {
    operational: "bg-green-500",
    degraded: "bg-yellow-500",
    pending: "bg-gray-400",
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
