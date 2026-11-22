"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Loader2,
  Mail,
  Plus,
  Receipt,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentColorPicker } from "@/components/ui/document-color-picker";
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
  createManualQuotationAction,
  deleteQuotationDraftAction,
  duplicateQuotationAction,
  markQuotationSentAction,
  updateQuotationAction,
} from "@/services/quotations/actions";
import { convertQuotationToInvoiceAction } from "@/services/invoices/actions";
import { sendDocumentEmailAction } from "@/services/notifications/actions";
import type { PricingMethod, QuotationStatus } from "@/types";

export interface QuotationCatalogOption {
  id: string;
  name: string;
  description: string | null;
  unit_type: string;
  pricing_method: PricingMethod;
  default_price: number;
  is_taxable: boolean;
}

export interface EditableQuotationItem {
  name: string;
  description: string;
  category: LineItemCategory;
  pricingMethod: PricingMethod;
  quantity: string;
  unit: string;
  unitPrice: string;
  isTaxable: boolean;
}

interface QuotationEditorProps {
  mode: "create" | "edit";
  quotationId?: string;
  quotationNumber?: string;
  publicToken?: string;
  currency: string;
  catalogItems: QuotationCatalogOption[];
  initialValues: {
    title: string;
    description: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerAddress: string;
    status: QuotationStatus;
    taxRatePercent: string;
    discountType: DiscountType;
    discountValue: string;
    notes: string;
    terms: string;
    brandColor?: string;
    issueDate: string;
    expiryDate: string;
    items: EditableQuotationItem[];
  };
}

export function QuotationEditor({
  mode,
  quotationId,
  quotationNumber,
  publicToken,
  currency,
  catalogItems,
  initialValues,
}: QuotationEditorProps) {
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
  const [status, setStatus] = useState<QuotationStatus>(initialValues.status);
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
  const [brandColor, setBrandColor] = useState(
    initialValues.brandColor ?? "#2563eb"
  );
  const [issueDate, setIssueDate] = useState(initialValues.issueDate);
  const [expiryDate, setExpiryDate] = useState(initialValues.expiryDate);
  const [items, setItems] = useState<EditableQuotationItem[]>(
    initialValues.items
  );

  const [copiedLink, setCopiedLink] = useState(false);
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
        isTaxable: found.is_taxable,
      },
    ]);
  }

  async function handleCopyShareLink() {
    if (!publicToken) return;
    const url = `${window.location.origin}/q/${publicToken}`;
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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
        brandColor,
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
          isTaxable: i.isTaxable,
        })),
      };

      if (mode === "create") {
        const res = await createManualQuotationAction(payload);
        if (!res.ok) {
          setError(res.error ?? "Could not create quotation.");
          return;
        }
        router.push(`/dashboard/quotations/${res.quotationId}`);
        router.refresh();
        return;
      }

      if (!quotationId) return;
      const res = await updateQuotationAction(quotationId, payload);
      if (!res.ok) {
        setError(res.error ?? "Could not update quotation.");
        return;
      }
      setSavedNotice("Quotation updated.");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Branded Document Theme & Live Preview Strip */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="h-2 w-full" style={{ backgroundColor: brandColor }} />
        <div className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span
                className="rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white"
                style={{ backgroundColor: brandColor }}
              >
                Quotation
              </span>
              {quotationNumber ? (
                <span className="font-mono text-sm font-bold text-foreground">
                  {quotationNumber}
                </span>
              ) : null}
            </div>
            <p className="text-base font-bold text-foreground">
              {title || "Untitled Quotation"}
            </p>
            <p className="text-xs text-muted-foreground">
              Total:{" "}
              <span className="font-bold" style={{ color: brandColor }}>
                {formatCurrency(summary.total, currency)}
              </span>{" "}
              • Applies to your PDF &amp; public approval page
            </p>
          </div>
          <DocumentColorPicker
            value={brandColor}
            onChange={setBrandColor}
            label="Quotation Color Theme"
          />
        </div>
      </div>

      {mode === "edit" && quotationId ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <div>
            <p className="text-xs text-muted-foreground">Quotation Number</p>
            <p className="font-mono text-base font-bold">{quotationNumber}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {publicToken ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyShareLink}
                >
                  {copiedLink ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                  {copiedLink ? "Link Copied" : "Copy Customer Link"}
                </Button>
                <a
                  href={`/q/${publicToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button type="button" variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4" />
                    Open Public Page
                  </Button>
                </a>
              </>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                setError(null);
                setSavedNotice(null);
                const res = await sendDocumentEmailAction({
                  eventType: "quotation_sent",
                  documentType: "quotation",
                  documentId: quotationId,
                  recipientEmail: customerEmail,
                  variables: {
                    business_name: "Quoventra Business",
                    customer_name: customerName || "Customer",
                    document_number: quotationNumber ?? "",
                    total: formatCurrency(summary.total, currency),
                    link: publicToken
                      ? `${window.location.origin}/q/${publicToken}`
                      : "",
                  },
                });
                if (!res.ok) {
                  setError(res.error ?? "Failed to send email.");
                } else {
                  setSavedNotice(`Quotation emailed to ${customerEmail}.`);
                }
              }}
            >
              <Mail className="h-4 w-4" />
              Email Customer
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                await markQuotationSentAction(quotationId);
                setStatus("sent");
                setSavedNotice(
                  "Quotation marked as Sent. Share the public link with your customer (automated email delivery arrives in Phase 9)."
                );
                router.refresh();
              }}
            >
              <Send className="h-4 w-4" />
              Mark Sent
            </Button>
            <a
              href={`/api/quotations/${quotationId}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button type="button" variant="outline" size="sm">
                Preview PDF
              </Button>
            </a>
            <a href={`/api/quotations/${quotationId}/pdf?download=1`}>
              <Button type="button" variant="outline" size="sm">
                <Download className="h-4 w-4" />
                PDF
              </Button>
            </a>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                const res = await duplicateQuotationAction(quotationId);
                if (res.ok && res.newQuotationId) {
                  router.push(`/dashboard/quotations/${res.newQuotationId}`);
                }
              }}
            >
              <Copy className="h-4 w-4" />
              Duplicate
            </Button>
            {status === "approved" ? (
              <Button
                type="button"
                size="sm"
                onClick={async () => {
                  const res = await convertQuotationToInvoiceAction(quotationId);
                  if (res.ok && res.invoiceId) {
                    router.push(`/dashboard/invoices/${res.invoiceId}`);
                  } else {
                    setError(res.error ?? "Failed to convert to invoice.");
                  }
                }}
              >
                <Receipt className="h-4 w-4" />
                Convert to Invoice
              </Button>
            ) : null}
            {status === "draft" ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (!window.confirm("Delete this draft quotation?")) return;
                  const res = await deleteQuotationDraftAction(quotationId);
                  if (res.ok) {
                    router.push("/dashboard/quotations");
                    router.refresh();
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
            <CardTitle className="text-base">Quotation Details</CardTitle>
            <CardDescription>Title, scope, status, and dates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="quo-title">Project title *</Label>
              <Input
                id="quo-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quo-desc">Description</Label>
              <textarea
                id="quo-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="quo-status">Status</Label>
                <select
                  id="quo-status"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as QuotationStatus)
                  }
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                >
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
              <div className="space-y-1.5">
                <Label htmlFor="quo-issue">Issue date</Label>
                <Input
                  id="quo-issue"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quo-expiry">Expiry date</Label>
                <Input
                  id="quo-expiry"
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
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="qcust-name">Customer name</Label>
                <Input
                  id="qcust-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qcust-email">Customer email</Label>
                <Input
                  id="qcust-email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="qcust-phone">Phone</Label>
                <Input
                  id="qcust-phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qcust-addr">Address</Label>
                <Input
                  id="qcust-addr"
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
              Add Item
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
                  placeholder="Description"
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes &amp; Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="quo-notes">Notes</Label>
              <textarea
                id="quo-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quo-terms">Terms &amp; Conditions</Label>
              <textarea
                id="quo-terms"
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
                <Label htmlFor="quo-disc-type">Discount</Label>
                <select
                  id="quo-disc-type"
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
                <Label htmlFor="quo-disc-val">Discount value</Label>
                <Input
                  id="quo-disc-val"
                  type="number"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  disabled={discountType === "none"}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quo-tax">Tax rate (%)</Label>
                <Input
                  id="quo-tax"
                  type="number"
                  step="0.01"
                  value={taxRatePercent}
                  onChange={(e) => setTaxRatePercent(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-1.5 text-sm">
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
                  {mode === "create" ? "Create Quotation" : "Save Changes"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

