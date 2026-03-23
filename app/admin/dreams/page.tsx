import { getAdminClient } from "@/utils/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getDreamMetrics() {
  const admin = getAdminClient();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [totalResult, todayResult, weekResult, monthResult, recentDreams, citationsResult] =
    await Promise.all([
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
        .from("dream_entries")
        .select("id", { count: "exact", head: true })
        .gte("created_at", monthAgo),
      admin
        .from("dream_entries")
        .select("id, title, user_id, tags, image_url, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      admin
        .from("bible_citations")
        .select("id", { count: "exact", head: true }),
    ]);

  // Get tag distribution from recent dreams
  const tagCounts = new Map<string, number>();
  recentDreams.data?.forEach((dream) => {
    (dream.tags || []).forEach((tag: string) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Count dreams with images
  const dreamsWithImages =
    recentDreams.data?.filter((d) => d.image_url).length || 0;

  return {
    total: totalResult.count || 0,
    today: todayResult.count || 0,
    thisWeek: weekResult.count || 0,
    thisMonth: monthResult.count || 0,
    totalCitations: citationsResult.count || 0,
    recentDreams: recentDreams.data || [],
    topTags,
    dreamsWithImages,
    recentCount: recentDreams.data?.length || 0,
  };
}

export default async function DreamsPage() {
  const metrics = await getDreamMetrics();
  const imageRate =
    metrics.recentCount > 0
      ? Math.round((metrics.dreamsWithImages / metrics.recentCount) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dream Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Dream submission patterns and content insights
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Dreams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.thisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.thisWeek} this week · {metrics.today} today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bible Citations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalCitations.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Image Gen Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{imageRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              of recent 20 dreams
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent dreams table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Dreams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-3 px-2 font-medium">Title</th>
                      <th className="text-left py-3 px-2 font-medium">Tags</th>
                      <th className="text-left py-3 px-2 font-medium">Image</th>
                      <th className="text-left py-3 px-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.recentDreams.map((dream) => (
                      <tr
                        key={dream.id}
                        className="border-b border-border/50 hover:bg-muted/50"
                      >
                        <td className="py-3 px-2 max-w-[200px] truncate">
                          {dream.title || "Untitled"}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-1 flex-wrap">
                            {(dream.tags || []).slice(0, 3).map((tag: string) => (
                              <span
                                key={tag}
                                className="text-[10px] bg-muted px-1.5 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          {dream.image_url ? (
                            <span className="text-green-500 text-xs">Yes</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              No
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground text-xs">
                          {new Date(dream.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Popular tags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Popular Tags</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.topTags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tags yet</p>
            ) : (
              <div className="space-y-2">
                {metrics.topTags.map(([tag, count]) => (
                  <div key={tag} className="flex items-center justify-between">
                    <span className="text-sm">{tag}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
