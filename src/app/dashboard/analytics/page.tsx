import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { getActiveBusinessContext, requireAuthUser } from "@/lib/auth/session";
import {
  getBusinessAnalytics,
  type AnalyticsDateRange,
} from "@/services/analytics/queries";

const VALID_RANGES = new Set<AnalyticsDateRange>(["7d", "30d", "90d", "all"]);

export default async function AnalyticsPage({
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

  const analytics = await getBusinessAnalytics(context.business.id, range);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Reports &amp; Analytics
        </h1>
        <p className="text-sm text-muted-foreground">
          Real-time financial and operational metrics for{" "}
          <span className="font-medium text-foreground">
            {context.business.name}
          </span>
          .
        </p>
      </div>

      <Suspense fallback={null}>
        <AnalyticsView
          basePath="/dashboard/analytics"
          currency={context.business.currency}
          data={analytics}
        />
      </Suspense>
    </div>
  );
}

