"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  Download,
  ExternalLink,
  FileText,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/pricing/engine";
import {
  deleteEstimateDraftAction,
  duplicateEstimateAction,
} from "@/services/estimates/actions";
import type { EstimateStatus } from "@/types";

export interface EstimateSummaryRow {
  id: string;
  estimate_number: string;
  title: string;
  customer_name: string | null;
  status: EstimateStatus;
  currency: string;
  total: number;
  issue_date: string;
  expiry_date: string | null;
  created_at: string;
}

const STATUS_BADGE_MAP: Record<
  EstimateStatus,
  "secondary" | "outline" | "default" | "success" | "warning" | "destructive"
> = {
  draft: "secondary",
  pending: "warning",
  sent: "default",
  viewed: "outline",
  approved: "success",
  rejected: "destructive",
  expired: "destructive",
  converted: "success",
};

interface EstimatesListProps {
  estimates: EstimateSummaryRow[];
}

export function EstimatesList({ estimates }: EstimatesListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = estimates.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.estimate_number.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        (item.customer_name?.toLowerCase().includes(q) ?? false)
      );
    });

    return [...list].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });
  }, [estimates, search, statusFilter, sortOrder]);

  async function handleDuplicate(id: string) {
    setError(null);
    setBusyId(id);
    try {
      const res = await duplicateEstimateAction(id);
      if (!res.ok) {
        setError(res.error ?? "Failed to duplicate estimate.");
        return;
      }
      if (res.newEstimateId) {
        router.push(`/dashboard/estimates/${res.newEstimateId}`);
      } else {
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteDraft(id: string, num: string) {
    if (!window.confirm(`Delete draft estimate ${num}? This cannot be undone.`)) {
      return;
    }
    setError(null);
    setBusyId(id);
    try {
      const res = await deleteEstimateDraftAction(id);
      if (!res.ok) {
        setError(res.error ?? "Failed to delete draft.");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by number, title, or customer..."
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="viewed">Viewed</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
            <option value="converted">Converted</option>
          </select>

          <select
            aria-label="Sort by date"
            value={sortOrder}
            onChange={(e) =>
              setSortOrder(e.target.value as "newest" | "oldest")
            }
            className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
            <div className="space-y-1">
              <p className="font-medium">No estimates found</p>
              <p className="text-sm text-muted-foreground">
                Create an estimate manually or generate one with Quoventra AI.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/dashboard/ai-estimate">
                <Button size="sm">
                  <Sparkles className="h-4 w-4" />
                  Create with AI
                </Button>
              </Link>
              <Link href="/dashboard/estimates/new">
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4" />
                  Create Manually
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Number</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Issue Date</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((est) => (
                <tr key={est.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    <Link
                      href={`/dashboard/estimates/${est.id}`}
                      className="text-primary hover:underline"
                    >
                      {est.estimate_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/dashboard/estimates/${est.id}`}
                      className="hover:underline"
                    >
                      {est.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {est.customer_name || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={STATUS_BADGE_MAP[est.status]}
                      className="capitalize"
                    >
                      {est.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {est.issue_date}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatCurrency(Number(est.total), est.currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <a
                        href={`/api/estimates/${est.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Preview PDF"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <a
                        href={`/api/estimates/${est.id}/pdf?download=1`}
                        title="Download PDF"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <button
                        type="button"
                        disabled={busyId === est.id}
                        onClick={() => handleDuplicate(est.id)}
                        title="Duplicate estimate"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      {est.status === "draft" ? (
                        <button
                          type="button"
                          disabled={busyId === est.id}
                          onClick={() =>
                            handleDeleteDraft(est.id, est.estimate_number)
                          }
                          title="Delete draft"
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

