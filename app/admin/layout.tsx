import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = {
  title: "Dreamlink Admin",
  description: "Admin dashboard for Dreamlink",
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

  if (!user) {
    redirect("/sign-in");
  }

  // Double-check admin status (middleware also checks, but defense in depth)
  const { data: profile } = await supabase
    .from("profile")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin top bar */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="text-lg font-semibold tracking-tight"
            >
              Dreamlink Admin
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <Link
                href="/admin"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Overview
              </Link>
              <Link
                href="/admin/users"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Users
              </Link>
              <Link
                href="/admin/dreams"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Dreams
              </Link>
              <Link
                href="/admin/revenue"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Revenue
              </Link>
              <Link
                href="/admin/prompts"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Prompts
              </Link>
              <Link
                href="/admin/system"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                System
              </Link>
            </nav>
          </div>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to App
          </Link>
        </div>
      </div>

      {/* Page content */}
      <main className="container px-4 py-8">{children}</main>
    </div>
  );
}
