"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download,
  ExternalLink,
  Plus,
  Receipt,
  Search,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/pricing/engine";
import { deleteInvoiceDraftAction } from "@/services/invoices/actions";
import type { InvoiceStatus } from "@/types";

export interface InvoiceSummaryRow {
  id: string;
  invoice_number: string;
  title: string;
  customer_name: string | null;
  status: InvoiceStatus;
  currency: string;
  total: number;
  amount_paid: number;
  balance_due: number;
  issue_date: string;
  due_date: string | null;
}

const STATUS_BADGE: Record<
  InvoiceStatus,
  "secondary" | "outline" | "default" | "success" | "warning" | "destructive"
> = {
  draft: "secondary",
  sent: "default",
  viewed: "outline",
  partially_paid: "warning",
  paid: "success",
  overdue: "destructive",
  cancelled: "destructive",
};

export function InvoicesList({
  invoices,
}: {
  invoices: InvoiceSummaryRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (!q) return true;
      return (
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.title.toLowerCase().includes(q) ||
        (inv.customer_name?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [invoices, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices..."
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
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Receipt className="h-10 w-10 text-muted-foreground mx-auto" />
            <div className="space-y-1">
              <p className="font-medium">No invoices yet</p>
              <p className="text-sm text-muted-foreground">
                Convert an approved quotation or create a new invoice directly.
              </p>
            </div>
            <Link href="/dashboard/invoices/new">
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Create Invoice
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
                <th className="px-4 py-3 font-medium">Due Date</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium text-right">
                  Balance Due
                </th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
                      className="text-primary hover:underline"
                    >
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
                      className="hover:underline"
                    >
                      {inv.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {inv.customer_name || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={STATUS_BADGE[inv.status]}
                      className="capitalize"
                    >
                      {inv.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {inv.due_date || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(Number(inv.total), inv.currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatCurrency(Number(inv.balance_due), inv.currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <a
                        href={`/api/invoices/${inv.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Preview PDF"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <a
                        href={`/api/invoices/${inv.id}/pdf?download=1`}
                        title="Download PDF"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      {inv.status === "draft" ? (
                        <button
                          type="button"
                          disabled={busyId === inv.id}
                          onClick={async () => {
                            if (
                              !window.confirm(
                                `Delete draft invoice ${inv.invoice_number}?`
                              )
                            )
                              return;
                            setBusyId(inv.id);
                            try {
                              await deleteInvoiceDraftAction(inv.id);
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

