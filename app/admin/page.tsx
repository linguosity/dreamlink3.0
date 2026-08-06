import { getAdminClient } from "@/utils/supabase/admin";
import {
  Users,
  Droplet,
  CreditCard,
  Sparkles,
  Clock,
  BarChart3,
} from "lucide-react";
import { KpiCard } from "./_components/kpi-card";
import { DreamsBarChart } from "./_components/bar-chart";
import { RecentSignups, type SignupItem } from "./_components/recent-signups";
import { RecentIssues } from "./_components/recent-issues";
import { SystemStatus } from "./_components/system-status";
import SiteSettingsCard from "./components/SiteSettingsCard";
import SocialLinksCard from "./components/SocialLinksCard";
import FounderTasksCard from "./_components/founder-tasks-card";

const DAY_MS = 24 * 60 * 60 * 1000;

interface DashboardMetrics {
  totalUsers: number;
  totalDreams: number;
  dreamsToday: number;
  dreamsThisWeek: number;
  activeSubscriptions: number;
  aiCallsToday: number;
  avgDreamsPerUser: number;
  recentSignups: SignupItem[];
  dreamsByDay: Array<{ date: string; count: number }>;
  recentErrors: Array<{
    id: string;
    error_type: string;
    error_message: string;
    user_agent: string | null;
    created_at: string;
    user_id: string | null;
  }>;
  // 7-day trends
  usersTrend: number;
  dreamsTrend: number;
  subsTrend: number;
  aiCallsTrend: number;
  // Sparkline data (last 7 days)
  usersSparkline: number[];
  subsSparkline: number[];
  aiCallsSparkline: number[];
}

// Compute % change between (last 7d sum) vs (prior 7d sum). Returns 0 when
// prior == 0 to avoid Infinity surfaces.
function computeTrend(last7: number, prior7: number): number {
  if (prior7 === 0) return last7 === 0 ? 0 : 100;
  return Math.round(((last7 - prior7) / prior7) * 100);
}

// Bucket created_at timestamps into the last N UTC calendar days (oldest
// first, today last). 2026-06-09 audit fix: the old version bucketed into
// rolling 24h windows anchored at "now" but the bar chart labeled buckets
// with calendar dates, so counts could land under the wrong date label.
// Supabase `timestamp` columns are UTC; treat tz-less strings as UTC too.
function utcDayKey(ts: string): string {
  const normalized = /Z|[+-]\d{2}:?\d{2}$/.test(ts) ? ts : `${ts}Z`;
  return new Date(normalized).toISOString().split("T")[0];
}

function bucketByDay(
  createdAts: string[],
  days: number,
): { sparkline: number[]; total: number; dayKeys: string[] } {
  const dayKeys: string[] = [];
  const indexByKey = new Map<string, number>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    const key = d.toISOString().split("T")[0];
    indexByKey.set(key, dayKeys.length);
    dayKeys.push(key);
  }

  const buckets = new Array<number>(days).fill(0);
  let total = 0;
  for (const ts of createdAts) {
    const idx = indexByKey.get(utcDayKey(ts));
    if (idx !== undefined) {
      buckets[idx]++;
      total++;
    }
  }
  return { sparkline: buckets, total, dayKeys };
}

async function getMetrics(): Promise<DashboardMetrics> {
  const admin = getAdminClient();
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS).toISOString();
  const fortnightAgo = new Date(now.getTime() - 14 * DAY_MS).toISOString();

  const [
    usersTotal,
    dreamsTotal,
    dreamsToday,
    dreamsThisWeek,
    activeSubs,
    aiCallsToday,
    recentSignupsRes,
    recentSignupSubs,
    recentErrorsRes,
    profileCreatedRecent,
    subscriptionsCreatedRecent,
    aiCallsCreatedRecent,
    dreamsCreatedRecent,
  ] = await Promise.all([
    admin.from("profile").select("id", { count: "exact", head: true }),
    admin.from("dream_entries").select("id", { count: "exact", head: true }),
    admin
      .from("dream_entries")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart),
    admin
      .from("dream_entries")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    admin
      .from("chatgpt_interactions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart),
    admin
      .from("profile")
      .select("user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    // Plan-by-user lookup for the recent signups list
    admin
      .from("subscriptions")
      .select("user_id, plan, status")
      .eq("status", "active"),
    admin
      .from("client_error_logs")
      .select(
        "id, error_type, error_message, user_agent, created_at, user_id",
      )
      .order("created_at", { ascending: false })
      .limit(8),
    // Last 14 days of timestamps — used for both sparklines and trend math
    admin
      .from("profile")
      .select("created_at")
      .gte("created_at", fortnightAgo),
    admin
      .from("subscriptions")
      .select("created_at, status")
      .gte("created_at", fortnightAgo),
    admin
      .from("chatgpt_interactions")
      .select("created_at")
      .gte("created_at", fortnightAgo),
    admin
      .from("dream_entries")
      .select("created_at")
      .gte("created_at", fortnightAgo)
      .order("created_at", { ascending: true }),
  ]);

  // Daily buckets for last 14 days, then split into last 7 / prior 7
  const usersTimestamps = (profileCreatedRecent.data ?? []).map(
    (r: any) => r.created_at,
  );
  const subsTimestamps = (subscriptionsCreatedRecent.data ?? [])
    .filter((r: any) => r.status === "active")
    .map((r: any) => r.created_at);
  const aiTimestamps = (aiCallsCreatedRecent.data ?? []).map(
    (r: any) => r.created_at,
  );
  const dreamsTimestamps = (dreamsCreatedRecent.data ?? []).map(
    (r: any) => r.created_at,
  );

  const usersBuckets14 = bucketByDay(usersTimestamps, 14);
  const subsBuckets14 = bucketByDay(subsTimestamps, 14);
  const aiBuckets14 = bucketByDay(aiTimestamps, 14);
  const dreamsBuckets14 = bucketByDay(dreamsTimestamps, 14);

  const sumLast7 = (arr: number[]) =>
    arr.slice(7).reduce((a, b) => a + b, 0);
  const sumPrior7 = (arr: number[]) =>
    arr.slice(0, 7).reduce((a, b) => a + b, 0);

  const usersSparkline = usersBuckets14.sparkline.slice(7);
  const subsSparkline = subsBuckets14.sparkline.slice(7);
  const aiCallsSparkline = aiBuckets14.sparkline.slice(7);

  // 14-day series for the bar chart — labels come from the same UTC day keys
  // the counts were bucketed into, so they can't drift apart.
  const dreamsByDay: Array<{ date: string; count: number }> =
    dreamsBuckets14.dayKeys.map((date, idx) => ({
      date,
      count: dreamsBuckets14.sparkline[idx] ?? 0,
    }));

  // Plan map for signup list
  const planByUser = new Map<string, "visionary" | "prophet">();
  for (const row of (recentSignupSubs.data ?? []) as Array<{
    user_id: string;
    plan: string;
  }>) {
    if (row.plan === "visionary" || row.plan === "prophet") {
      planByUser.set(row.user_id, row.plan);
    }
  }

  const recentSignups: SignupItem[] = (
    (recentSignupsRes.data ?? []) as Array<{
      user_id: string;
      created_at: string;
    }>
  ).map((s) => ({
    user_id: s.user_id,
    created_at: s.created_at,
    plan: planByUser.get(s.user_id) ?? "free",
  }));

  const totalUsers = usersTotal.count ?? 0;
  const totalDreams = dreamsTotal.count ?? 0;

  return {
    totalUsers,
    totalDreams,
    dreamsToday: dreamsToday.count ?? 0,
    dreamsThisWeek: dreamsThisWeek.count ?? 0,
    activeSubscriptions: activeSubs.count ?? 0,
    aiCallsToday: aiCallsToday.count ?? 0,
    avgDreamsPerUser:
      totalUsers > 0 ? Math.round((totalDreams / totalUsers) * 10) / 10 : 0,
    recentSignups,
    dreamsByDay,
    recentErrors: (recentErrorsRes.data ?? []) as DashboardMetrics["recentErrors"],
    usersTrend: computeTrend(
      sumLast7(usersBuckets14.sparkline),
      sumPrior7(usersBuckets14.sparkline),
    ),
    dreamsTrend: computeTrend(
      sumLast7(dreamsBuckets14.sparkline),
      sumPrior7(dreamsBuckets14.sparkline),
    ),
    subsTrend: computeTrend(
      sumLast7(subsBuckets14.sparkline),
      sumPrior7(subsBuckets14.sparkline),
    ),
    aiCallsTrend: computeTrend(
      sumLast7(aiBuckets14.sparkline),
      sumPrior7(aiBuckets14.sparkline),
    ),
    usersSparkline,
    subsSparkline,
    aiCallsSparkline,
  };
}

// 2026-06-09 audit fix: this list used to be fully hardcoded (every service
// "operational" regardless of reality, Stripe "not connected" regardless of
// env). Now driven by env configuration, mirroring app/admin/system/page.tsx.
// "configured" ≠ "healthy" — these are config checks, not live health probes.
function getSystemItems() {
  const configured = (ok: boolean) =>
    ok ? ("operational" as const) : ("pending" as const);
  return [
    {
      label: "Database",
      detail: "Supabase PostgreSQL",
      status: configured(
        Boolean(
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
            process.env.SUPABASE_SERVICE_ROLE_KEY,
        ),
      ),
    },
    {
      label: "AI Analysis",
      detail: `OpenAI ${process.env.OPENAI_MODEL || "gpt-5.6-luna"} · Edge`,
      status: configured(Boolean(process.env.OPENAI_API_KEY)),
    },
    {
      label: "Image Generation",
      detail: "FLUX.2 klein 9B",
      status: configured(Boolean(process.env.BFL_API_KEY)),
    },
    {
      label: "Payments",
      detail: process.env.STRIPE_SECRET_KEY
        ? "Stripe configured"
        : "Stripe — not configured",
      status: configured(
        Boolean(
          process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET,
        ),
      ),
    },
    {
      label: "Error Monitoring",
      detail: "Sentry + client_error_logs",
      status: configured(
        Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
      ),
    },
    { label: "Email", detail: "Not configured", status: "pending" as const },
  ];
}

export default async function AdminDashboard() {
  const m = await getMetrics();
  const lastUpdated = new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="space-y-5">
      {/* Topbar */}
      <div className="flex items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="font-serif text-[28px] leading-[1.1]">Overview</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            <span className="wordmark text-primary">DreamRiver</span>{" "}
            activity and health · last 14 days
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-card border rounded-lg text-[12.5px]">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">Updated</span>
            <span className="font-medium">{lastUpdated}</span>
          </div>
          <button
            type="button"
            disabled
            title="Export coming soon"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[12.5px] bg-card hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <BarChart3 className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Founder checklist — seeded weekly from the Monday brief */}
      <FounderTasksCard />

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard
          label="Total Users"
          value={m.totalUsers.toLocaleString()}
          sub="vs. last week"
          trend={m.usersTrend}
          trendData={m.usersSparkline}
          Icon={Users}
        />
        <KpiCard
          label="Dreams Analyzed"
          value={m.totalDreams.toLocaleString()}
          sub={`${m.dreamsToday} today · ${m.dreamsThisWeek} this week`}
          trend={m.dreamsTrend}
          trendData={m.dreamsByDay.map((d) => d.count)}
          Icon={Droplet}
        />
        <KpiCard
          label="Active Subscriptions"
          value={m.activeSubscriptions.toLocaleString()}
          sub="vs. last week"
          trend={m.subsTrend}
          trendData={m.subsSparkline}
          Icon={CreditCard}
          variant="violet"
        />
        <KpiCard
          label="AI Calls Today"
          value={m.aiCallsToday.toLocaleString()}
          sub={`Avg ${m.avgDreamsPerUser} dreams/user`}
          trend={m.aiCallsTrend}
          trendData={m.aiCallsSparkline}
          Icon={Sparkles}
          variant="violet"
        />
      </div>

      {/* Chart + signups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <div className="lg:col-span-2 rounded-[var(--radius-lg)] border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[13px] font-semibold">Dreams analyzed</div>
              <div className="text-[11.5px] text-muted-foreground mt-0.5">
                Last 14 days
              </div>
            </div>
          </div>
          <DreamsBarChart data={m.dreamsByDay} />
        </div>

        <RecentSignups items={m.recentSignups} />
      </div>

      {/* Issues + Site settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        <div className="lg:col-span-2">
          <RecentIssues items={m.recentErrors} />
        </div>
        <div className="space-y-3.5">
          <SiteSettingsCard />
          {/* Landing-footer social icons — hidden until a URL is saved */}
          <SocialLinksCard />
        </div>
      </div>

      {/* System status (env-configuration checks) */}
      <SystemStatus items={getSystemItems()} />
    </div>
  );
}
