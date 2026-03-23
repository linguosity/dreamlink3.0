import { getAdminClient } from "@/utils/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UserRow {
  user_id: string;
  created_at: string;
  reading_level: string | null;
  image_aesthetic: string | null;
  is_admin: boolean | null;
  dream_count: number;
  last_dream: string | null;
}

async function getUsers(): Promise<{
  users: UserRow[];
  totalCount: number;
  activeToday: number;
  activeThisWeek: number;
}> {
  const admin = getAdminClient();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get all profiles with their dream counts
  const { data: profiles, count } = await admin
    .from("profile")
    .select("user_id, created_at, reading_level, image_aesthetic, is_admin", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .limit(50);

  // Get dream counts per user
  const { data: dreamCounts } = await admin
    .from("dream_entries")
    .select("user_id, created_at");

  // Aggregate dream data per user
  const userDreamMap = new Map<string, { count: number; lastDream: string | null }>();
  dreamCounts?.forEach((d) => {
    const existing = userDreamMap.get(d.user_id);
    if (!existing) {
      userDreamMap.set(d.user_id, { count: 1, lastDream: d.created_at });
    } else {
      existing.count++;
      if (d.created_at > (existing.lastDream || "")) {
        existing.lastDream = d.created_at;
      }
    }
  });

  // Count active users
  let activeToday = 0;
  let activeThisWeek = 0;
  userDreamMap.forEach((data) => {
    if (data.lastDream && data.lastDream >= todayStart) activeToday++;
    if (data.lastDream && data.lastDream >= weekAgo) activeThisWeek++;
  });

  const users: UserRow[] = (profiles || []).map((p) => {
    const dreamData = userDreamMap.get(p.user_id);
    return {
      user_id: p.user_id,
      created_at: p.created_at,
      reading_level: p.reading_level,
      image_aesthetic: p.image_aesthetic,
      is_admin: p.is_admin,
      dream_count: dreamData?.count || 0,
      last_dream: dreamData?.lastDream || null,
    };
  });

  return {
    users,
    totalCount: count || 0,
    activeToday,
    activeThisWeek,
  };
}

export default async function UsersPage() {
  const { users, totalCount, activeToday, activeThisWeek } = await getUsers();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground mt-1">User accounts and activity</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeThisWeek}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Users (most recent)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-3 px-2 font-medium">User ID</th>
                  <th className="text-left py-3 px-2 font-medium">Joined</th>
                  <th className="text-left py-3 px-2 font-medium">Dreams</th>
                  <th className="text-left py-3 px-2 font-medium">
                    Last Active
                  </th>
                  <th className="text-left py-3 px-2 font-medium">
                    Reading Level
                  </th>
                  <th className="text-left py-3 px-2 font-medium">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.user_id}
                    className="border-b border-border/50 hover:bg-muted/50"
                  >
                    <td className="py-3 px-2 font-mono text-xs">
                      {user.user_id.slice(0, 12)}...
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-2">{user.dream_count}</td>
                    <td className="py-3 px-2 text-muted-foreground">
                      {user.last_dream
                        ? new Date(user.last_dream).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="py-3 px-2 text-muted-foreground capitalize">
                      {user.reading_level?.replace(/_/g, " ") || "Default"}
                    </td>
                    <td className="py-3 px-2">
                      {user.is_admin ? (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Admin
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          User
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
