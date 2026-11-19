import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Clock,
  FileCheck2,
  FileText,
  Receipt,
  Sparkles,
  Zap,
} from "lucide-react";
import { AdSlot } from "@/components/ads/ad-slot";
import {
  BusinessPerformanceCard,
  KpiSparklineGrid,
} from "@/components/dashboard/analytics-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveBusinessContext, requireAuthUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";
import { formatCurrency } from "@/lib/pricing/engine";
import { getEligibleAdForPlacement } from "@/services/ads/queries";
import {
  getBusinessAnalytics,
  type AnalyticsDateRange,
} from "@/services/analytics/queries";
import { getBusinessEntitlements } from "@/services/subscriptions/entitlements";

const VALID_RANGES = new Set<AnalyticsDateRange>(["7d", "30d", "90d", "all"]);

interface ActivityItem {
  id: string;
  kind: "estimate" | "quotation" | "invoice";
  label: string;
  meta: string;
  status: string;
  createdAt: string;
  href: string;
}

function getStatusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "approved" || s === "paid" || s === "completed") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900";
  }
  if (s === "sent" || s === "viewed" || s === "partial") {
    return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900";
  }
  if (s === "rejected" || s === "overdue") {
    return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900";
  }
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);

  if (!context) {
    redirect("/dashboard/onboarding");
  }

  const { range: rawRange } = await searchParams;
  const range: AnalyticsDateRange = VALID_RANGES.has(
    rawRange as AnalyticsDateRange
  )
    ? (rawRange as AnalyticsDateRange)
    : "30d";

  const insforge = await createInsForgeServerClient();
  const [analytics, entitlements, estimatesRes, quotationsRes, invoicesRes] =
    await Promise.all([
      getBusinessAnalytics(context.business.id, range),
      getBusinessEntitlements(context.business.id),
      insforge.database
        .from("estimates")
        .select("id, estimate_number, title, status, total, created_at")
        .eq("business_id", context.business.id)
        .order("created_at", { ascending: false })
        .limit(3),
      insforge.database
        .from("quotations")
        .select("id, quotation_number, title, status, total, created_at")
        .eq("business_id", context.business.id)
        .order("created_at", { ascending: false })
        .limit(2),
      insforge.database
        .from("invoices")
        .select("id, invoice_number, title, status, total, created_at")
        .eq("business_id", context.business.id)
        .order("created_at", { ascending: false })
        .limit(2),
    ]);

  const ad = await getEligibleAdForPlacement(
    "dashboard_free_banner",
    entitlements.showAds
  );

  const activities: ActivityItem[] = [
    ...(estimatesRes.data ?? []).map((e) => ({
      id: `est-${e.id}`,
      kind: "estimate" as const,
      label: `Estimate ${e.estimate_number}${e.title ? ` — ${e.title}` : ""}`,
      meta: formatCurrency(Number(e.total ?? 0), context.business.currency),
      status: String(e.status ?? "draft"),
      createdAt: String(e.created_at),
      href: `/dashboard/estimates/${e.id}`,
    })),
    ...(quotationsRes.data ?? []).map((q) => ({
      id: `qtn-${q.id}`,
      kind: "quotation" as const,
      label: `Quotation ${q.quotation_number}${q.title ? ` — ${q.title}` : ""}`,
      meta: formatCurrency(Number(q.total ?? 0), context.business.currency),
      status: String(q.status ?? "draft"),
      createdAt: String(q.created_at),
      href: `/dashboard/quotations/${q.id}`,
    })),
    ...(invoicesRes.data ?? []).map((inv) => ({
      id: `inv-${inv.id}`,
      kind: "invoice" as const,
      label: `Invoice ${inv.invoice_number}${inv.title ? ` — ${inv.title}` : ""}`,
      meta: formatCurrency(Number(inv.total ?? 0), context.business.currency),
      status: String(inv.status ?? "draft"),
      createdAt: String(inv.created_at),
      href: `/dashboard/invoices/${inv.id}`,
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const firstName = user.name.trim().split(/\s+/)[0] || "there";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Hero Welcome Banner with Laptop Mockup */}
      <section className="relative overflow-hidden rounded-3xl bg-[linear-gradient(115deg,#071447_0%,#0f3cc9_42%,#2f74ff_72%,#8b5cf6_100%)] px-6 py-7 sm:px-9 sm:py-8 text-white shadow-xl shadow-blue-900/15">
        {/* Sweeping background light wave */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-35"
          viewBox="0 0 1200 320"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M420,320 C560,180 760,40 1200,20 L1200,320 Z"
            fill="url(#heroWave1)"
          />
          <path
            d="M640,320 C760,210 920,120 1200,90 L1200,320 Z"
            fill="url(#heroWave2)"
          />
          <defs>
            <linearGradient id="heroWave1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="heroWave2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ddd6fe" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>

        <div className="relative grid gap-6 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6 space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl leading-tight">
                Welcome back, {firstName}!
              </h1>
              <p className="max-w-lg text-sm sm:text-base font-medium text-blue-100/95 leading-relaxed">
                Create professional estimates, quotations and invoices with the
                power of AI.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link href="/dashboard/ai-estimate">
                <Button
                  size="lg"
                  className="rounded-xl bg-white text-[#0f2976] hover:bg-blue-50 font-bold shadow-md px-5"
                >
                  <Sparkles className="h-4 w-4 text-[#2563eb]" aria-hidden="true" />
                  Create with AI
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/dashboard/analytics">
                <Button
                  size="lg"
                  variant="ghost"
                  className="rounded-xl border border-white/30 bg-[#0b1f5e]/55 text-white hover:bg-white/15 hover:text-white backdrop-blur-xs px-5"
                >
                  <BarChart3 className="h-4 w-4" aria-hidden="true" />
                  View Analytics
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Laptop Image + Save 80% Callout */}
          <div className="lg:col-span-6 hidden sm:flex items-center justify-end gap-3">
            <div className="relative -my-4">
              <Image
                src="/hero-laptop.png"
                alt="Quoventra Professional Estimate"
                width={460}
                height={310}
                className="w-72 md:w-80 lg:w-[22rem] h-auto object-contain drop-shadow-[0_18px_28px_rgba(7,20,71,0.45)] select-none"
                priority
              />
            </div>

            {/* Save 80% Callout Bubble */}
            <div className="relative self-center hidden xl:flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 text-slate-900 shadow-xl shrink-0">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-[#1d63ff]">
                <Zap className="h-4 w-4 fill-[#1d63ff]" aria-hidden="true" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-extrabold text-slate-900">
                  Save 80%
                </p>
                <p className="text-[11px] font-medium text-slate-500">
                  of your time
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 KPI Sparkline Cards */}
      <Suspense fallback={null}>
        <KpiSparklineGrid
          currency={context.business.currency}
          data={analytics}
        />
      </Suspense>

      {/* Main 2-Column Split: Left (Business Performance + Recent Activity) | Right (Quick Actions + Grow Your Business) */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-8 space-y-6">
          <Suspense fallback={null}>
            <BusinessPerformanceCard basePath="/dashboard" data={analytics} />
          </Suspense>

          <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#1d63ff]" aria-hidden="true" />
                <CardTitle className="text-lg font-extrabold">
                  Recent Activity
                </CardTitle>
              </div>
              <Link
                href="/dashboard/estimates"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#1d63ff] hover:text-blue-700"
              >
                View All
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No estimates, quotations, or invoices created yet.
                  </p>
                  <Link href="/dashboard/ai-estimate">
                    <Button size="sm" className="rounded-xl">
                      <Sparkles className="h-4 w-4" />
                      Create Your First Estimate
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border/70">
                  {activities.map((item) => {
                    const Icon =
                      item.kind === "estimate"
                        ? FileText
                        : item.kind === "quotation"
                          ? FileCheck2
                          : Receipt;
                    const iconTone =
                      item.kind === "estimate"
                        ? "bg-blue-50 text-[#1d63ff] dark:bg-blue-950/60 dark:text-blue-400"
                        : item.kind === "quotation"
                          ? "bg-violet-50 text-[#7c3aed] dark:bg-violet-950/60 dark:text-violet-400"
                          : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400";

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="flex items-center justify-between gap-4 py-3 first:pt-1 last:pb-1 hover:bg-muted/40 -mx-2 px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconTone}`}
                          >
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {item.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.createdAt).toLocaleDateString()} •{" "}
                              {item.meta}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`capitalize rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${getStatusBadgeClass(item.status)}`}
                        >
                          {item.status}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          {/* Quick Actions Vibrant Gradient Card */}
          <div className="rounded-2xl bg-[linear-gradient(135deg,#2563eb_0%,#4f46e5_52%,#7c3aed_100%)] p-5 text-white shadow-lg shadow-blue-600/20 space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-extrabold text-lg">
                <Zap className="h-4 w-4 fill-white" aria-hidden="true" />
                Quick Actions
              </div>
              <p className="text-xs font-medium text-blue-100">
                Get started in seconds
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/dashboard/ai-estimate"
                className="flex items-center justify-between rounded-xl bg-white px-3 py-3 text-xs font-bold text-slate-900 shadow-xs hover:bg-blue-50 transition-colors"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Sparkles className="h-3.5 w-3.5 text-[#2563eb] shrink-0" />
                  <span className="truncate">Generate with AI</span>
                </span>
                <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
              </Link>
              <Link
                href="/dashboard/estimates"
                className="flex items-center justify-between rounded-xl bg-white px-3 py-3 text-xs font-bold text-slate-900 shadow-xs hover:bg-blue-50 transition-colors"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <FileText className="h-3.5 w-3.5 text-[#1d63ff] shrink-0" />
                  <span className="truncate">Create Estimate</span>
                </span>
                <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
              </Link>
              <Link
                href="/dashboard/quotations"
                className="flex items-center justify-between rounded-xl bg-white px-3 py-3 text-xs font-bold text-slate-900 shadow-xs hover:bg-blue-50 transition-colors"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <FileCheck2 className="h-3.5 w-3.5 text-[#7c3aed] shrink-0" />
                  <span className="truncate">Create Quotation</span>
                </span>
                <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
              </Link>
              <Link
                href="/dashboard/invoices"
                className="flex items-center justify-between rounded-xl bg-white px-3 py-3 text-xs font-bold text-slate-900 shadow-xs hover:bg-blue-50 transition-colors"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Receipt className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Create Invoice</span>
                </span>
                <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
              </Link>
            </div>
          </div>

          {/* Grow Your Business Card */}
          <Card className="relative overflow-hidden rounded-2xl border-indigo-100 dark:border-indigo-900/60 bg-gradient-to-br from-white via-[#f5f3ff] to-[#ede9fe] dark:from-card dark:via-indigo-950/30 dark:to-violet-950/30 shadow-xs">
            <CardContent className="p-5">
              <div className="space-y-2.5 min-w-0">
                <Badge
                  variant="outline"
                  className="rounded-full border-indigo-200 bg-white/90 text-[#5b21b6] dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                >
                  Grow Your Business
                </Badge>
                <div className="space-y-1">
                  <h2 className="text-base font-extrabold text-foreground leading-snug">
                    Unlock the full potential of Quoventra
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Automate your workflow, get more clients, and grow faster on{" "}
                    {entitlements.planName}.
                  </p>
                </div>
                <Link href="/dashboard/subscription" className="inline-block pt-0.5">
                  <Button
                    size="sm"
                    className="rounded-xl bg-gradient-to-r from-[#6d28d9] to-[#4f46e5] text-white hover:from-[#5b21b6] hover:to-[#4338ca] shadow-sm"
                  >
                    Upgrade to Pro
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AdSlot ad={ad} />
    </div>
  );
}
