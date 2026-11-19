"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRICING_METHODS } from "@/lib/pricing/constants";
import {
  calculateDocumentPricing,
  formatCurrency,
  type DiscountType,
  type LineItemCategory,
} from "@/lib/pricing/engine";
import {
  createManualEstimateAction,
  deleteEstimateDraftAction,
  duplicateEstimateAction,
  updateEstimateAction,
} from "@/services/estimates/actions";
import { convertEstimateToQuotationAction } from "@/services/quotations/actions";
import type { EstimateStatus, PricingMethod } from "@/types";

export interface CatalogItemOption {
  id: string;
  name: string;
  description: string | null;
  unit_type: string;
  pricing_method: PricingMethod;
  default_price: number;
  is_taxable: boolean;
}

export interface EditableEstimateItem {
  name: string;
  description: string;
  category: LineItemCategory;
  pricingMethod: PricingMethod;
  quantity: string;
  unit: string;
  unitPrice: string;
  pricingSource: "business_rate" | "user_provided" | "missing";
  isTaxable: boolean;
}

interface EstimateEditorProps {
  mode: "create" | "edit";
  estimateId?: string;
  estimateNumber?: string;
  currency: string;
  catalogItems: CatalogItemOption[];
  initialValues: {
    title: string;
    description: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerAddress: string;
    status: EstimateStatus;
    taxRatePercent: string;
    discountType: DiscountType;
    discountValue: string;
    notes: string;
    terms: string;
    issueDate: string;
    expiryDate: string;
    items: EditableEstimateItem[];
  };
}

export function EstimateEditor({
  mode,
  estimateId,
  estimateNumber,
  currency,
  catalogItems,
  initialValues,
}: EstimateEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialValues.title);
  const [description, setDescription] = useState(initialValues.description);
  const [customerName, setCustomerName] = useState(initialValues.customerName);
  const [customerEmail, setCustomerEmail] = useState(
    initialValues.customerEmail
  );
  const [customerPhone, setCustomerPhone] = useState(
    initialValues.customerPhone
  );
  const [customerAddress, setCustomerAddress] = useState(
    initialValues.customerAddress
  );
  const [status, setStatus] = useState<EstimateStatus>(initialValues.status);
  const [taxRatePercent, setTaxRatePercent] = useState(
    initialValues.taxRatePercent
  );
  const [discountType, setDiscountType] = useState<DiscountType>(
    initialValues.discountType
  );
  const [discountValue, setDiscountValue] = useState(
    initialValues.discountValue
  );
  const [notes, setNotes] = useState(initialValues.notes);
  const [terms, setTerms] = useState(initialValues.terms);
  const [issueDate, setIssueDate] = useState(initialValues.issueDate);
  const [expiryDate, setExpiryDate] = useState(initialValues.expiryDate);
  const [items, setItems] = useState<EditableEstimateItem[]>(
    initialValues.items
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const summary = useMemo(() => {
    const taxDecimal = (Number(taxRatePercent) || 0) / 100;
    return calculateDocumentPricing({
      items: items.map((i) => ({
        name: i.name || "Untitled",
        category: i.category,
        pricingMethod: i.pricingMethod,
        quantity: Number(i.quantity) || 0,
        unitPrice: Number(i.unitPrice) || 0,
        isTaxable: i.isTaxable,
      })),
      discountType,
      discountValue: Number(discountValue) || 0,
      defaultTaxRate: taxDecimal,
      documentTaxRateOverride: taxDecimal,
    });
  }, [items, taxRatePercent, discountType, discountValue]);

  function addBlankItem() {
    setItems((prev) => [
      ...prev,
      {
        name: "",
        description: "",
        category: "service",
        pricingMethod: "fixed",
        quantity: "1",
        unit: "unit",
        unitPrice: "0",
        pricingSource: "user_provided",
        isTaxable: true,
      },
    ]);
  }

  function addFromCatalog(catalogId: string) {
    const found = catalogItems.find((c) => c.id === catalogId);
    if (!found) return;
    setItems((prev) => [
      ...prev,
      {
        name: found.name,
        description: found.description ?? "",
        category: "service",
        pricingMethod: found.pricing_method,
        quantity: "1",
        unit: found.unit_type,
        unitPrice: String(found.default_price),
        pricingSource: "business_rate",
        isTaxable: found.is_taxable,
      },
    ]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSavedNotice(null);
    setSubmitting(true);

    try {
      const payload = {
        title,
        description: description || undefined,
        customerName: customerName || undefined,
        customerEmail: customerEmail || undefined,
        customerPhone: customerPhone || undefined,
        customerAddress: customerAddress || undefined,
        status,
        taxRatePercent: Number(taxRatePercent) || 0,
        discountType,
        discountValue: Number(discountValue) || 0,
        notes: notes || undefined,
        terms: terms || undefined,
        issueDate,
        expiryDate: expiryDate || null,
        items: items.map((i) => ({
          name: i.name,
          description: i.description,
          category: i.category,
          pricingMethod: i.pricingMethod,
          quantity: Number(i.quantity) || 0,
          unit: i.unit,
          unitPrice: Number(i.unitPrice) || 0,
          pricingSource: i.pricingSource,
          isTaxable: i.isTaxable,
        })),
      };

      if (mode === "create") {
        const res = await createManualEstimateAction(payload);
        if (!res.ok) {
          setError(res.error ?? "Could not create estimate.");
          return;
        }
        router.push(`/dashboard/estimates/${res.estimateId}`);
        router.refresh();
        return;
      }

      if (!estimateId) return;
      const res = await updateEstimateAction(estimateId, payload);
      if (!res.ok) {
        setError(res.error ?? "Could not update estimate.");
        return;
      }
      setSavedNotice("Estimate updated.");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {mode === "edit" && estimateId ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <div>
            <p className="text-xs text-muted-foreground">Estimate Number</p>
            <p className="font-mono text-base font-bold">{estimateNumber}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/estimates/${estimateId}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button type="button" variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" />
                Preview PDF
              </Button>
            </a>
            <a href={`/api/estimates/${estimateId}/pdf?download=1`}>
              <Button type="button" variant="outline" size="sm">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </a>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                const res = await duplicateEstimateAction(estimateId);
                if (res.ok && res.newEstimateId) {
                  router.push(`/dashboard/estimates/${res.newEstimateId}`);
                }
              }}
            >
              <Copy className="h-4 w-4" />
              Duplicate
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                const res = await convertEstimateToQuotationAction(estimateId);
                if (res.ok && res.quotationId) {
                  router.push(`/dashboard/quotations/${res.quotationId}`);
                } else {
                  setError(res.error ?? "Failed to convert to quotation.");
                }
              }}
            >
              <FileCheck2 className="h-4 w-4" />
              Convert to Quotation
            </Button>
            {status === "draft" ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (!window.confirm("Delete this draft estimate?")) return;
                  const res = await deleteEstimateDraftAction(estimateId);
                  if (res.ok) {
                    router.push("/dashboard/estimates");
                    router.refresh();
                  } else {
                    setError(res.error ?? "Could not delete draft.");
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete Draft
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {savedNotice ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Details</CardTitle>
            <CardDescription>
              Title, scope, status, and document dates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="est-title">Project title *</Label>
              <Input
                id="est-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Basement Renovation"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="est-desc">Description</Label>
              <textarea
                id="est-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="est-status">Status</Label>
                <select
                  id="est-status"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as EstimateStatus)
                  }
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="sent">Sent</option>
                  <option value="viewed">Viewed</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                  <option value="converted">Converted</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="est-issue">Issue date</Label>
                <Input
                  id="est-issue"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="est-expiry">Expiry date</Label>
                <Input
                  id="est-expiry"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Information</CardTitle>
            <CardDescription>
              Snapshot stored on this estimate document.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cust-name">Customer name</Label>
                <Input
                  id="cust-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Alex Morgan"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cust-email">Customer email</Label>
                <Input
                  id="cust-email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="alex@example.com"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cust-phone">Customer phone</Label>
                <Input
                  id="cust-phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cust-addr">Customer address</Label>
                <Input
                  id="cust-addr"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base">Line Items</CardTitle>
            <CardDescription>
              Saved document prices are preserved even if your catalog changes
              later.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {catalogItems.length > 0 ? (
              <select
                aria-label="Add from catalog"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    addFromCatalog(e.target.value);
                    e.target.value = "";
                  }
                }}
                className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">+ Add from catalog...</option>
                {catalogItems.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({formatCurrency(Number(c.default_price), currency)}
                    /{c.unit_type})
                  </option>
                ))}
              </select>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addBlankItem}
            >
              <Plus className="h-4 w-4" />
              Add Line Item
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-border p-3 space-y-3"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  value={item.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setItems((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, name: val } : row
                      )
                    );
                  }}
                  placeholder="Item name *"
                  required
                />
                <Input
                  value={item.description}
                  onChange={(e) => {
                    const val = e.target.value;
                    setItems((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, description: val } : row
                      )
                    );
                  }}
                  placeholder="Description (optional)"
                />
                <div className="flex gap-2">
                  <select
                    value={item.pricingMethod}
                    onChange={(e) => {
                      const val = e.target.value as PricingMethod;
                      setItems((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, pricingMethod: val } : row
                        )
                      );
                    }}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-2 py-1 text-sm"
                  >
                    {PRICING_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  {items.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setItems((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="p-2 text-muted-foreground hover:text-destructive"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-5 items-center">
                <Input
                  type="number"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setItems((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, quantity: val } : row
                      )
                    );
                  }}
                  placeholder="Qty"
                />
                <Input
                  value={item.unit}
                  onChange={(e) => {
                    const val = e.target.value;
                    setItems((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, unit: val } : row
                      )
                    );
                  }}
                  placeholder="Unit"
                />
                <Input
                  type="number"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    setItems((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, unitPrice: val } : row
                      )
                    );
                  }}
                  placeholder="Unit price"
                />
                <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.isTaxable}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setItems((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, isTaxable: checked } : row
                        )
                      );
                    }}
                  />
                  <span>Taxable</span>
                </label>
                <div className="text-right font-semibold text-sm">
                  {formatCurrency(
                    summary.items[idx]?.lineSubtotal ?? 0,
                    currency
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Totals, Discounts, Notes & Terms */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes &amp; Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="est-notes">Notes</Label>
              <textarea
                id="est-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="est-terms">Terms &amp; Conditions</Label>
              <textarea
                id="est-terms"
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary &amp; Taxes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="est-disc-type">Discount</Label>
                <select
                  id="est-disc-type"
                  value={discountType}
                  onChange={(e) =>
                    setDiscountType(e.target.value as DiscountType)
                  }
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-2 py-1 text-sm"
                >
                  <option value="none">None</option>
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed ({currency})</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="est-disc-val">Discount value</Label>
                <Input
                  id="est-disc-val"
                  type="number"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  disabled={discountType === "none"}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="est-tax">Tax rate (%)</Label>
                <Input
                  id="est-tax"
                  type="number"
                  step="0.01"
                  value={taxRatePercent}
                  onChange={(e) => setTaxRatePercent(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>
                  -{formatCurrency(summary.discountAmount, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(summary.subtotal, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(summary.taxTotal, currency)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-bold text-base">
                <span>Total</span>
                <span>{formatCurrency(summary.total, currency)}</span>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {mode === "create" ? "Create Estimate" : "Save Changes"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

