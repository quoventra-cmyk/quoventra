import { createInsForgeServerClient } from "@/lib/database/server";

export type AnalyticsDateRange = "7d" | "30d" | "90d" | "all";

export interface MonthlyBucket {
  label: string;
  estimatedRevenue: number;
  collectedRevenue: number;
  estimatesCount: number;
  approvedQuotations: number;
  rejectedQuotations: number;
  paymentsCount: number;
}

export interface BusinessAnalyticsData {
  range: AnalyticsDateRange;
  metrics: {
    totalEstimates: number;
    totalQuotations: number;
    approvedQuotations: number;
    rejectedQuotations: number;
    totalInvoices: number;
    paidInvoices: number;
    outstandingInvoices: number;
    outstandingBalance: number;
    estimatedRevenue: number;
    collectedRevenue: number;
    approvalRatePercent: number | null;
    newCustomers: number;
  };
  timeline: MonthlyBucket[];
}

function getCutoffIso(range: AnalyticsDateRange): string | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function monthKey(isoOrDate: string): string {
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function getBusinessAnalytics(
  businessId: string,
  range: AnalyticsDateRange
): Promise<BusinessAnalyticsData> {
  const insforge = await createInsForgeServerClient();
  const cutoff = getCutoffIso(range);

  let estQuery = insforge.database
    .from("estimates")
    .select("id, total, status, created_at")
    .eq("business_id", businessId);
  let quoQuery = insforge.database
    .from("quotations")
    .select("id, status, created_at")
    .eq("business_id", businessId);
  let invQuery = insforge.database
    .from("invoices")
    .select("id, total, amount_paid, balance_due, status, created_at")
    .eq("business_id", businessId);
  let payQuery = insforge.database
    .from("invoice_payments")
    .select("id, amount, payment_date, created_at")
    .eq("business_id", businessId);
  let custQuery = insforge.database
    .from("customers")
    .select("id, created_at")
    .eq("business_id", businessId);

  if (cutoff) {
    estQuery = estQuery.gte("created_at", cutoff);
    quoQuery = quoQuery.gte("created_at", cutoff);
    invQuery = invQuery.gte("created_at", cutoff);
    payQuery = payQuery.gte("created_at", cutoff);
    custQuery = custQuery.gte("created_at", cutoff);
  }

  const [
    { data: estimates },
    { data: quotations },
    { data: invoices },
    { data: payments },
    { data: customers },
  ] = await Promise.all([
    estQuery,
    quoQuery,
    invQuery,
    payQuery,
    custQuery,
  ]);

  const estRows = estimates ?? [];
  const quoRows = quotations ?? [];
  const invRows = invoices ?? [];
  const payRows = payments ?? [];
  const custRows = customers ?? [];

  const approvedQuotations = quoRows.filter(
    (q) => q.status === "approved" || q.status === "converted"
  ).length;
  const rejectedQuotations = quoRows.filter(
    (q) => q.status === "rejected"
  ).length;

  const decidedCount = approvedQuotations + rejectedQuotations;
  const approvalRatePercent =
    decidedCount > 0
      ? Math.round((approvedQuotations / decidedCount) * 1000) / 10
      : null;

  const paidInvoices = invRows.filter((i) => i.status === "paid").length;
  const outstandingInvoices = invRows.filter(
    (i) =>
      i.status !== "paid" &&
      i.status !== "cancelled" &&
      Number(i.balance_due) > 0
  ).length;

  const estimatedCents = estRows.reduce(
    (sum, e) => sum + Math.round(Number(e.total) * 100),
    0
  );
  const collectedCents = payRows.reduce(
    (sum, p) => sum + Math.round(Number(p.amount) * 100),
    0
  );
  const outstandingCents = invRows
    .filter((i) => i.status !== "cancelled")
    .reduce((sum, i) => sum + Math.round(Number(i.balance_due) * 100), 0);

  // Build monthly timeline buckets
  const bucketMap = new Map<string, MonthlyBucket>();
  const ensureBucket = (key: string) => {
    let b = bucketMap.get(key);
    if (!b) {
      b = {
        label: key,
        estimatedRevenue: 0,
        collectedRevenue: 0,
        estimatesCount: 0,
        approvedQuotations: 0,
        rejectedQuotations: 0,
        paymentsCount: 0,
      };
      bucketMap.set(key, b);
    }
    return b;
  };

  for (const e of estRows) {
    const b = ensureBucket(monthKey(e.created_at));
    b.estimatesCount += 1;
    b.estimatedRevenue =
      (Math.round(b.estimatedRevenue * 100) +
        Math.round(Number(e.total) * 100)) /
      100;
  }

  for (const q of quoRows) {
    const b = ensureBucket(monthKey(q.created_at));
    if (q.status === "approved" || q.status === "converted") {
      b.approvedQuotations += 1;
    } else if (q.status === "rejected") {
      b.rejectedQuotations += 1;
    }
  }

  for (const p of payRows) {
    const b = ensureBucket(monthKey(p.payment_date || p.created_at));
    b.paymentsCount += 1;
    b.collectedRevenue =
      (Math.round(b.collectedRevenue * 100) +
        Math.round(Number(p.amount) * 100)) /
      100;
  }

  const timeline = Array.from(bucketMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  return {
    range,
    metrics: {
      totalEstimates: estRows.length,
      totalQuotations: quoRows.length,
      approvedQuotations,
      rejectedQuotations,
      totalInvoices: invRows.length,
      paidInvoices,
      outstandingInvoices,
      outstandingBalance: outstandingCents / 100,
      estimatedRevenue: estimatedCents / 100,
      collectedRevenue: collectedCents / 100,
      approvalRatePercent,
      newCustomers: custRows.length,
    },
    timeline,
  };
}

