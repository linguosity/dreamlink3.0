"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Droplet,
  DollarSign,
  Wand2,
  Server,
  type LucideIcon,
} from "lucide-react";

const ADMIN_NAV: Array<{ href: string; label: string; Icon: LucideIcon }> = [
  { href: "/admin", label: "Overview", Icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", Icon: Users },
  { href: "/admin/dreams", label: "Dreams", Icon: Droplet },
  { href: "/admin/revenue", label: "Revenue", Icon: DollarSign },
  { href: "/admin/prompts", label: "Prompts", Icon: Wand2 },
  { href: "/admin/system", label: "System", Icon: Server },
];

export function AdminSidebar({
  buildVersion,
  buildBranch,
  buildHealthy,
}: {
  buildVersion: string;
  buildBranch: string;
  buildHealthy: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="bg-card/40 border-r border-border flex flex-col p-4 sticky top-0 h-screen overflow-y-auto">
      <div className="flex items-center gap-2.5 px-2 pb-4">
        <div
          className="w-8 h-8 rounded-lg grid place-items-center shrink-0"
          style={{
            background:
              "linear-gradient(135deg, var(--blue-deep), var(--blue-soft))",
          }}
          aria-hidden
        >
          <Droplet className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="font-serif text-base font-semibold leading-none">
            DreamRiver
          </div>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gold mt-1">
            Admin
          </div>
        </div>
      </div>

      <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground px-3 mt-2 mb-1.5">
        Console
      </div>
      <nav className="flex flex-col gap-0.5">
        {ADMIN_NAV.map(({ href, label, Icon }) => {
          const active =
            href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] transition-colors ${
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="px-3.5 py-3 rounded-lg border border-border bg-cream/40">
        <div className="text-[11px] font-medium text-muted-foreground mb-1">
          Build
        </div>
        <div className="font-mono text-[11.5px]">
          v{buildVersion} · {buildBranch}
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              buildHealthy
                ? "bg-emerald-500 animate-pulse"
                : "bg-amber-500"
            }`}
          />
          {buildHealthy ? "All systems normal" : "Degraded — check System"}
        </div>
      </div>

      <Link
        href="/"
        className="text-xs text-muted-foreground hover:text-foreground mt-3 px-3"
      >
        ← Back to App
      </Link>
    </aside>
  );
}
