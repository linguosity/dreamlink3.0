import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "./_components/sidebar";

export const metadata = {
  title: "DreamRiver Admin",
  description: "Admin dashboard for DreamRiver",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profile")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  // process.env.npm_package_version is set by Node at runtime; falls back to
  // the literal string when missing (e.g. in production where npm doesn't run).
  const version = process.env.npm_package_version ?? "3.0.0";
  const branch = process.env.VERCEL_GIT_COMMIT_REF ?? "local";

  return (
    <div className="min-h-screen bg-background grid grid-cols-[240px_1fr]">
      <AdminSidebar
        buildVersion={version}
        buildBranch={branch}
        buildHealthy={true}
      />
      <main className="overflow-x-hidden">
        <div className="px-8 py-7 max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
