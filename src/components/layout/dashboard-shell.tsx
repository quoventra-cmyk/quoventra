"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  Calculator,
  ChevronDown,
  CreditCard,
  Crown,
  FileCheck2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  userEmail: string;
  userName: string;
  businessName: string | null;
  planName?: string;
  isPlatformAdmin?: boolean;
  children: ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/dashboard/ai-estimate",
    label: "AI Estimate",
    icon: Sparkles,
    badge: "AI",
  },
  { href: "/dashboard/estimates", label: "Estimates", icon: FileText },
  { href: "/dashboard/quotations", label: "Quotations", icon: FileCheck2 },
  { href: "/dashboard/invoices", label: "Invoices", icon: Receipt },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/products", label: "Products & Services", icon: Package },
  { href: "/dashboard/pricing", label: "Pricing Rules", icon: Calculator },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/subscription", label: "Subscription", icon: CreditCard },
  { href: "/dashboard/profile", label: "Settings", icon: Building2 },
] as const;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Q";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function DashboardShell({
  userEmail,
  userName,
  businessName,
  planName = "Starter",
  isPlatformAdmin = false,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMenuOpen, setNewMenuOpen] = useState(false);

  const initials = getInitials(userName);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/dashboard/ai-estimate?prompt=${encodeURIComponent(q)}`);
    setSearchQuery("");
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-card/95 backdrop-blur-xs transition-all duration-200 sticky top-0 h-screen",
          collapsed ? "w-[74px]" : "w-64"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-border/70">
          {!collapsed ? <BrandLogo href="/dashboard" showTagline /> : null}
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className={cn(
              "rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
              collapsed && "mx-auto"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav
          className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
          aria-label="Workspace"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all duration-150",
                  active
                    ? "bg-gradient-to-r from-[#1d63ff] to-[#3b82f6] text-white font-bold shadow-md shadow-blue-600/25"
                    : "font-semibold text-slate-600 hover:bg-muted/80 hover:text-foreground dark:text-slate-300",
                  collapsed && "justify-center px-2"
                )}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-white" : "text-slate-500 dark:text-slate-400"
                    )}
                    aria-hidden="true"
                  />
                  {!collapsed ? (
                    <span className="truncate">{item.label}</span>
                  ) : null}
                </span>
                {!collapsed && "badge" in item && item.badge ? (
                  <span
                    className={cn(
                      "ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      active
                        ? "bg-white/20 text-white"
                        : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}

          {isPlatformAdmin ? (
            <Link
              href="/admin"
              title={collapsed ? "Admin Panel" : undefined}
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 border border-indigo-200/70 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100/80 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300",
                collapsed && "justify-center px-2"
              )}
            >
              <span className="flex items-center gap-3 min-w-0">
                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                {!collapsed ? <span className="truncate">Admin Panel</span> : null}
              </span>
            </Link>
          ) : null}
        </nav>

        <div className="p-3 space-y-3 border-t border-border/70">
          {!collapsed ? (
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 via-blue-50 to-violet-50 dark:from-indigo-950/50 dark:via-blue-950/40 dark:to-violet-950/50 border border-indigo-100 dark:border-indigo-900/60 p-3.5 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xs">
                  <Crown className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-foreground truncate">
                    {planName} Plan
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground truncate">
                    {businessName ?? "Workspace Active"}
                  </p>
                </div>
              </div>
              <Link href="/dashboard/subscription" className="block">
                <Button
                  size="sm"
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 shadow-sm shadow-indigo-600/20"
                >
                  Manage Plan
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          ) : null}

          <div
            className={cn(
              "flex items-center justify-between gap-2 rounded-xl px-2 py-1.5",
              collapsed && "justify-center px-0"
            )}
          >
            {!collapsed ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-xs">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {userName}
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground truncate">
                    {userEmail}
                  </p>
                </div>
              </div>
            ) : null}
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/80 bg-card/90 backdrop-blur-md px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="md:hidden rounded-xl p-2 text-muted-foreground hover:bg-muted"
              aria-label="Toggle workspace menu"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            <form
              onSubmit={handleSearchSubmit}
              className="hidden sm:flex items-center flex-1 max-w-md relative"
            >
              <Search
                className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search or describe a job (e.g. "basement remodel")'
                className="h-10 w-full rounded-xl border border-border bg-muted/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:bg-card focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              />
            </form>

            <div className="sm:hidden flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold truncate">
                {businessName ?? "Workspace Setup"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {businessName ? (
              <Badge
                variant="outline"
                className="hidden lg:inline-flex rounded-full border-blue-200 bg-blue-50/70 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300"
              >
                {businessName}
              </Badge>
            ) : null}

            <Link
              href="/dashboard/notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
            </Link>

            <div className="relative">
              <Button
                type="button"
                size="sm"
                onClick={() => setNewMenuOpen((prev) => !prev)}
                className="h-9 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm shadow-blue-600/25 px-3.5"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>New</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-80" aria-hidden="true" />
              </Button>

              {newMenuOpen ? (
                <div
                  className="absolute right-0 mt-2 w-52 rounded-2xl border border-border bg-card p-1.5 shadow-xl z-40"
                  onMouseLeave={() => setNewMenuOpen(false)}
                >
                  <Link
                    href="/dashboard/ai-estimate"
                    onClick={() => setNewMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    Generate with AI
                  </Link>
                  <Link
                    href="/dashboard/estimates"
                    onClick={() => setNewMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <FileText className="h-4 w-4 text-blue-600" />
                    New Estimate
                  </Link>
                  <Link
                    href="/dashboard/quotations"
                    onClick={() => setNewMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <FileCheck2 className="h-4 w-4 text-violet-600" />
                    Quotations
                  </Link>
                  <Link
                    href="/dashboard/invoices"
                    onClick={() => setNewMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Receipt className="h-4 w-4 text-emerald-600" />
                    Invoices
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {mobileOpen ? (
          <nav
            className="md:hidden border-b border-border bg-card px-4 py-3 space-y-1"
            aria-label="Mobile workspace"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                    active
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <form action={signOutAction} className="pt-2 border-t border-border">
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </form>
          </nav>
        ) : null}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
