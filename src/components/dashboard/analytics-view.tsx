"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  CheckCircle2,
  DollarSign,
  FileCheck2,
  FileText,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/pricing/engine";
import { cn } from "@/lib/utils";
import type {
  AnalyticsDateRange,
  BusinessAnalyticsData,
} from "@/services/analytics/queries";

const RANGES: { value: AnalyticsDateRange; label: string; short: string }[] = [
  { value: "7d", label: "Last 7 days", short: "7D" },
  { value: "30d", label: "Last 30 days", short: "30D" },
  { value: "90d", label: "Last 90 days", short: "90D" },
  { value: "all", label: "All time", short: "All" },
];

function Sparkline({
  values,
  strokeColor,
  fillId,
}: {
  values: number[];
  strokeColor: string;
  fillId: string;
}) {
  const safeValues =
    values.length >= 2 ? values : [0, values[0] ?? 0, (values[0] ?? 0) * 1.15];
  const max = Math.max(1, ...safeValues);
  const width = 220;
  const height = 44;

  const points = safeValues.map((val, idx) => {
    const x = (idx / (safeValues.length - 1)) * width;
    const y = height - 6 - (val / max) * (height - 14);
    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-11 overflow-visible"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${fillId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KpiSparklineGrid({
  currency,
  data,
}: {
  currency: string;
  data: BusinessAnalyticsData;
}) {
  const { metrics, timeline } = data;
  const estimatesSeries = timeline.map((b) => b.estimatesCount);
  const quotesSeries = timeline.map(
    (b) => b.approvedQuotations + b.rejectedQuotations
  );
  const invoicesSeries = timeline.map((b) => b.paymentsCount);
  const revenueSeries = timeline.map((b) => b.collectedRevenue);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="rounded-2xl border-border/80 bg-card shadow-xs overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-5 pb-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e6f0ff] text-[#1d63ff] dark:bg-blue-950/60 dark:text-blue-400">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-3xl font-black tracking-tight text-foreground leading-none">
                  {metrics.totalEstimates}
                </p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  Total Estimates
                </p>
              </div>
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              {formatCurrency(metrics.estimatedRevenue, currency)}
            </span>
          </div>
        </CardContent>
        <div className="mt-3">
          <Sparkline
            values={estimatesSeries}
            strokeColor="#1d63ff"
            fillId="spark-blue"
          />
        </div>
      </Card>

      <Card className="rounded-2xl border-border/80 bg-card shadow-xs overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-5 pb-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#efe9ff] text-[#7c3aed] dark:bg-violet-950/60 dark:text-violet-400">
                <FileCheck2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-3xl font-black tracking-tight text-foreground leading-none">
                  {metrics.totalQuotations}
                </p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  Total Quotations
                </p>
              </div>
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              {metrics.approvalRatePercent != null
                ? `${metrics.approvalRatePercent}% won`
                : `${metrics.approvedQuotations} appr`}
            </span>
          </div>
        </CardContent>
        <div className="mt-3">
          <Sparkline
            values={quotesSeries}
            strokeColor="#7c3aed"
            fillId="spark-violet"
          />
        </div>
      </Card>

      <Card className="rounded-2xl border-border/80 bg-card shadow-xs overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-5 pb-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e3fcef] text-[#10b981] dark:bg-emerald-950/60 dark:text-emerald-400">
                <DollarSign className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-3xl font-black tracking-tight text-foreground leading-none">
                  {metrics.totalInvoices}
                </p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  Total Invoices
                </p>
              </div>
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              {formatCurrency(metrics.collectedRevenue, currency)}
            </span>
          </div>
        </CardContent>
        <div className="mt-3">
          <Sparkline
            values={revenueSeries.some((v) => v > 0) ? revenueSeries : invoicesSeries}
            strokeColor="#10b981"
            fillId="spark-emerald"
          />
        </div>
      </Card>

      <Card className="rounded-2xl border-border/80 bg-card shadow-xs overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-5 pb-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff4e0] text-[#f59e0b] dark:bg-amber-950/60 dark:text-amber-400">
                <Users className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-3xl font-black tracking-tight text-foreground leading-none">
                  {metrics.newCustomers}
                </p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  Customers
                </p>
              </div>
            </div>
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              {formatCurrency(metrics.outstandingBalance, currency)} due
            </span>
          </div>
        </CardContent>
        <div className="mt-3">
          <Sparkline
            values={quotesSeries.map((v, i) => v + (estimatesSeries[i] ?? 0))}
            strokeColor="#f59e0b"
            fillId="spark-amber"
          />
        </div>
      </Card>
    </div>
  );
}

export function BusinessPerformanceCard({
  basePath,
  data,
}: {
  basePath: string;
  data: BusinessAnalyticsData;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentRange =
    (searchParams.get("range") as AnalyticsDateRange) || data.range;

  const { metrics, timeline } = data;
  const chartPoints =
    timeline.length > 0
      ? timeline
      : [
          {
            label: "Start",
            estimatesCount: 0,
            approvedQuotations: 0,
            rejectedQuotations: 0,
            paymentsCount: 0,
            estimatedRevenue: 0,
            collectedRevenue: 0,
          },
          {
            label: "Current",
            estimatesCount: metrics.totalEstimates,
            approvedQuotations: metrics.approvedQuotations,
            rejectedQuotations: metrics.rejectedQuotations,
            paymentsCount: metrics.paidInvoices,
            estimatedRevenue: metrics.estimatedRevenue,
            collectedRevenue: metrics.collectedRevenue,
          },
        ];

  const maxChartCount = Math.max(
    4,
    ...chartPoints.map((b) =>
      Math.max(
        b.estimatesCount,
        b.approvedQuotations + b.rejectedQuotations,
        b.paymentsCount
      )
    )
  );

  const svgWidth = 640;
  const svgHeight = 205;
  const padX = 28;
  const padY = 18;
  const innerW = svgWidth - padX * 2;
  const innerH = svgHeight - padY * 2;

  function buildSeries(selector: (b: (typeof chartPoints)[number]) => number) {
    const pts = chartPoints.map((b, i) => {
      const x =
        chartPoints.length === 1
          ? padX + innerW / 2
          : padX + (i / (chartPoints.length - 1)) * innerW;
      const y = padY + innerH - (selector(b) / maxChartCount) * innerH;
      return { x, y };
    });
    const d = pts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");
    const areaD =
      pts.length > 0
        ? `${d} L ${pts[pts.length - 1].x.toFixed(1)} ${padY + innerH} L ${pts[0].x.toFixed(1)} ${padY + innerH} Z`
        : "";
    return { pts, d, areaD };
  }

  const estLine = buildSeries((b) => b.estimatesCount);
  const quoLine = buildSeries(
    (b) => b.approvedQuotations + b.rejectedQuotations
  );
  const invLine = buildSeries((b) => b.paymentsCount);

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg font-extrabold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#1d63ff]" aria-hidden="true" />
            Business Performance
          </CardTitle>
          <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground pt-0.5">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#1d63ff]" />
              Estimates
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#7c3aed]" />
              Quotations
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
              Invoices
            </span>
          </div>
        </div>

        <div className="inline-flex rounded-xl border border-border bg-muted/60 p-1 self-start sm:self-auto">
          {RANGES.map((r) => {
            const isActive = currentRange === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => router.push(`${basePath}?range=${r.value}`)}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-semibold transition-all",
                  isActive
                    ? "bg-[#1d63ff] text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r.short}
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-52 min-w-[400px]"
            role="img"
            aria-label="Business performance chart"
          >
            <defs>
              <linearGradient id="perf-area-blue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1d63ff" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#1d63ff" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const y = padY + innerH * (1 - t);
              return (
                <g key={t}>
                  <line
                    x1={padX}
                    y1={y}
                    x2={svgWidth - padX}
                    y2={y}
                    stroke="currentColor"
                    className="text-border"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={4}
                    y={y + 4}
                    fontSize="10"
                    className="fill-muted-foreground"
                  >
                    {Math.round(maxChartCount * t)}
                  </text>
                </g>
              );
            })}

            {estLine.areaD ? (
              <path d={estLine.areaD} fill="url(#perf-area-blue)" />
            ) : null}

            <path
              d={estLine.d}
              fill="none"
              stroke="#1d63ff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={quoLine.d}
              fill="none"
              stroke="#7c3aed"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={invLine.d}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {estLine.pts.map((p, idx) => (
              <circle
                key={`e-${idx}`}
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="#1d63ff"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            ))}
            {quoLine.pts.map((p, idx) => (
              <circle
                key={`q-${idx}`}
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="#7c3aed"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            ))}
            {invLine.pts.map((p, idx) => (
              <circle
                key={`i-${idx}`}
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            ))}
          </svg>

          <div className="flex items-center justify-between px-4 pt-1 text-[11px] font-medium text-muted-foreground">
            {chartPoints.map((b) => (
              <span key={b.label}>{b.label}</span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsView({
  basePath,
  currency,
  data,
}: {
  basePath: string;
  currency: string;
  data: BusinessAnalyticsData;
}) {
  const { metrics, timeline } = data;
  const maxRevenue = Math.max(
    1,
    ...timeline.map((b) => Math.max(b.estimatedRevenue, b.collectedRevenue))
  );

  return (
    <div className="space-y-6">
      <KpiSparklineGrid currency={currency} data={data} />

      <BusinessPerformanceCard basePath={basePath} data={data} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  Estimated vs. Collected Revenue
                </CardTitle>
                <CardDescription>
                  Monthly comparison of estimated totals vs. actual collected
                  payments.
                </CardDescription>
              </div>
              <Badge variant="outline">Live DB</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No revenue data in the selected date range yet.
              </p>
            ) : (
              <div className="space-y-4">
                {timeline.map((b) => (
                  <div key={b.label} className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-medium">
                      <span>{b.label}</span>
                      <span className="text-muted-foreground">
                        Est: {formatCurrency(b.estimatedRevenue, currency)} •
                        Paid: {formatCurrency(b.collectedRevenue, currency)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600"
                          style={{
                            width: `${Math.min(100, (b.estimatedRevenue / maxRevenue) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{
                            width: `${Math.min(100, (b.collectedRevenue / maxRevenue) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              Revenue &amp; Approval Summary
            </CardTitle>
            <CardDescription>
              Key financial health indicators for your workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Estimated Revenue
              </div>
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(metrics.estimatedRevenue, currency)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Collected Revenue
              </div>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(metrics.collectedRevenue, currency)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Receipt className="h-4 w-4 text-amber-600" />
                Outstanding Balance
              </div>
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(metrics.outstandingBalance, currency)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <FileCheck2 className="h-4 w-4 text-violet-600" />
                Approval Rate
              </div>
              <p className="text-xl font-bold text-foreground">
                {metrics.approvalRatePercent != null
                  ? `${metrics.approvalRatePercent}%`
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
