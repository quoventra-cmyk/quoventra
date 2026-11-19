"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Briefcase,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const adminNav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users & Businesses", icon: Users },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/ai", label: "AI Monitoring", icon: Sparkles },
  { href: "/admin/industries", label: "Industries", icon: Briefcase },
  { href: "/admin/ads", label: "Advertisements", icon: Megaphone },
  { href: "/admin/logs", label: "Audit Logs", icon: Activity },
] as const;

export function AdminShell({
  adminEmail,
  adminRole,
  children,
}: {
  adminEmail: string;
  adminRole: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-muted/20 text-foreground">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <BrandLogo href="/admin" />
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Shield className="h-3 w-3 text-primary" />
            Admin
          </Badge>
        </div>

        <nav className="flex-1 p-3 space-y-1" aria-label="Admin navigation">
          {adminNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3 text-xs space-y-1">
          <p className="font-medium truncate">{adminEmail}</p>
          <p className="text-muted-foreground capitalize">
            {adminRole.replace("_", " ")}
          </p>
          <Link
            href="/dashboard"
            className="inline-block pt-1 text-primary hover:underline"
          >
            ← Back to Business App
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
          <span className="text-sm font-semibold">
            Quoventra Platform Administration
          </span>
          <Link
            href="/dashboard"
            className="md:hidden text-xs text-primary hover:underline"
          >
            Business App
          </Link>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

