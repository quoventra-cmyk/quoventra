"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/pricing/engine";
import {
  deleteQuotationDraftAction,
  duplicateQuotationAction,
} from "@/services/quotations/actions";
import type { QuotationStatus } from "@/types";

export interface QuotationSummaryRow {
  id: string;
  quotation_number: string;
  public_token: string;
  title: string;
  customer_name: string | null;
  status: QuotationStatus;
  currency: string;
  total: number;
  issue_date: string;
  created_at: string;
}

const STATUS_BADGE: Record<
  QuotationStatus,
  "secondary" | "outline" | "default" | "success" | "warning" | "destructive"
> = {
  draft: "secondary",
  sent: "default",
  viewed: "outline",
  approved: "success",
  rejected: "destructive",
  changes_requested: "warning",
  expired: "destructive",
  converted: "success",
};

export function QuotationsList({
  quotations,
}: {
  quotations: QuotationSummaryRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quotations.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.quotation_number.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        (item.customer_name?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [quotations, search, statusFilter]);

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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quotations..."
            className="pl-9"
          />
        </div>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="viewed">Viewed</option>
          <option value="approved">Approved</option>
          <option value="changes_requested">Changes Requested</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
          <option value="converted">Converted</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <FileCheck2 className="h-10 w-10 text-muted-foreground mx-auto" />
            <div className="space-y-1">
              <p className="font-medium">No quotations yet</p>
              <p className="text-sm text-muted-foreground">
                Convert an existing estimate or create a new quotation directly.
              </p>
            </div>
            <Link href="/dashboard/quotations/new">
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Create Quotation
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Number</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Issue Date</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((q) => (
                <tr key={q.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    <Link
                      href={`/dashboard/quotations/${q.id}`}
                      className="text-primary hover:underline"
                    >
                      {q.quotation_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/dashboard/quotations/${q.id}`}
                      className="hover:underline"
                    >
                      {q.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {q.customer_name || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={STATUS_BADGE[q.status]}
                      className="capitalize"
                    >
                      {q.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {q.issue_date}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatCurrency(Number(q.total), q.currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <a
                        href={`/api/quotations/${q.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Preview PDF"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <a
                        href={`/api/quotations/${q.id}/pdf?download=1`}
                        title="Download PDF"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <button
                        type="button"
                        disabled={busyId === q.id}
                        onClick={async () => {
                          setError(null);
                          setBusyId(q.id);
                          try {
                            const res = await duplicateQuotationAction(q.id);
                            if (!res.ok) {
                              setError(res.error ?? "Failed to duplicate.");
                              return;
                            }
                            if (res.newQuotationId) {
                              router.push(
                                `/dashboard/quotations/${res.newQuotationId}`
                              );
                            }
                          } finally {
                            setBusyId(null);
                          }
                        }}
                        title="Duplicate quotation"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      {q.status === "draft" ? (
                        <button
                          type="button"
                          disabled={busyId === q.id}
                          onClick={async () => {
                            if (
                              !window.confirm(
                                `Delete draft quotation ${q.quotation_number}?`
                              )
                            )
                              return;
                            setBusyId(q.id);
                            try {
                              await deleteQuotationDraftAction(q.id);
                              router.refresh();
                            } finally {
                              setBusyId(null);
                            }
                          }}
                          title="Delete draft"
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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

