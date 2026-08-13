// app/(admin)/layout.tsx
//
// The admin console shell — sidebar, content column, nothing else.
//
// This layout is deliberately synchronous. It used to be the same file as the
// auth gate below it, and that cost 3.6 seconds of frozen UI on every
// navigation into /admin: a segment's loading.tsx can only paint once that
// segment's own layout has resolved, so an async layout starves its own
// loading boundary. Two serial Supabase round trips ran before anything could
// render, and React held the previous page — consumer navbar and all — on
// screen for the duration.
//
// Split in two, the shell renders immediately, app/(admin)/loading.tsx paints
// the skeleton inside it, and the gate in ./admin/layout.tsx resolves behind
// that boundary. The version and branch strings are plain env reads, so
// nothing here awaits.

import { AdminSidebar } from "./admin/_components/sidebar";

export const metadata = {
  title: "DreamRiver Admin",
  description: "Admin dashboard for DreamRiver",
};

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <main id="main-content" className="overflow-x-hidden">
        <div className="px-8 py-7 max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
