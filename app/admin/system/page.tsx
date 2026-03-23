import { getAdminClient } from "@/utils/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getSystemMetrics() {
  const admin = getAdminClient();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    aiCallsToday,
    aiCallsWeek,
    aiCallsTotal,
    recentInteractions,
    dreamsWithImages,
    totalDreams,
  ] = await Promise.all([
    admin
      .from("chatgpt_interactions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart),
    admin
      .from("chatgpt_interactions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    admin
      .from("chatgpt_interactions")
      .select("id", { count: "exact", head: true }),
    admin
      .from("chatgpt_interactions")
      .select("model, temperature, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("dream_entries")
      .select("id", { count: "exact", head: true })
      .not("image_url", "is", null),
    admin.from("dream_entries").select("id", { count: "exact", head: true }),
  ]);

  // Model usage breakdown
  const modelCounts = new Map<string, number>();
  recentInteractions.data?.forEach((i) => {
    const model = i.model || "unknown";
    modelCounts.set(model, (modelCounts.get(model) || 0) + 1);
  });

  const imageGenRate =
    (totalDreams.count || 0) > 0
      ? Math.round(((dreamsWithImages.count || 0) / (totalDreams.count || 0)) * 100)
      : 0;

  return {
    aiCalls: {
      today: aiCallsToday.count || 0,
      thisWeek: aiCallsWeek.count || 0,
      total: aiCallsTotal.count || 0,
    },
    modelUsage: Array.from(modelCounts.entries()).map(([model, count]) => ({
      model,
      count,
    })),
    imageGenRate,
    totalImages: dreamsWithImages.count || 0,
    envStatus: {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseService: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      flux: !!process.env.BFL_API_KEY,
      stripe: !!process.env.STRIPE_SECRET_KEY,
      sentry: !!process.env.SENTRY_DSN,
      vercelUrl: !!process.env.VERCEL_URL,
    },
  };
}

export default async function SystemPage() {
  const metrics = await getSystemMetrics();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
        <p className="text-muted-foreground mt-1">
          API usage, service status, and environment configuration
        </p>
      </div>

      {/* AI Usage */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              AI Calls Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.aiCalls.today}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              AI Calls This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.aiCalls.thisWeek}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total AI Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.aiCalls.total.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Model Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Model Usage (last 50 calls)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.modelUsage.length === 0 ? (
              <p className="text-sm text-muted-foreground">No AI calls yet</p>
            ) : (
              <div className="space-y-2">
                {metrics.modelUsage.map(({ model, count }) => (
                  <div
                    key={model}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-mono text-xs">{model}</span>
                    <span className="text-muted-foreground">{count} calls</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Image Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Image Generation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Total images generated</span>
              <span className="font-bold">{metrics.totalImages}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Success rate</span>
              <span className="font-bold">{metrics.imageGenRate}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Provider</span>
              <span className="text-muted-foreground">FLUX.2 klein 9B</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Environment Variables */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Environment Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <EnvItem
              label="Supabase URL"
              configured={metrics.envStatus.supabaseUrl}
            />
            <EnvItem
              label="Supabase Anon Key"
              configured={metrics.envStatus.supabaseAnon}
            />
            <EnvItem
              label="Supabase Service Role"
              configured={metrics.envStatus.supabaseService}
            />
            <EnvItem
              label="OpenAI API Key"
              configured={metrics.envStatus.openai}
            />
            <EnvItem
              label="FLUX API Key (BFL)"
              configured={metrics.envStatus.flux}
            />
            <EnvItem
              label="Stripe Secret Key"
              configured={metrics.envStatus.stripe}
            />
            <EnvItem label="Sentry DSN" configured={metrics.envStatus.sentry} />
            <EnvItem
              label="Vercel URL"
              configured={metrics.envStatus.vercelUrl}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EnvItem({
  label,
  configured,
}: {
  label: string;
  configured: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-2 h-2 rounded-full ${configured ? "bg-green-500" : "bg-red-500"}`}
      />
      <span className="text-sm">{label}</span>
      <span
        className={`text-xs ml-auto ${configured ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
      >
        {configured ? "Set" : "Missing"}
      </span>
    </div>
  );
}
