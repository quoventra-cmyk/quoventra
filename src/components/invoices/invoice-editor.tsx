"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  Loader2,
  Mail,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DocumentColorPicker,
  DocumentTemplatePicker,
  type DocumentTemplateStyle,
} from "@/components/ui/document-color-picker";
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
  createManualInvoiceAction,
  deleteInvoiceDraftAction,
  recordInvoicePaymentAction,
  updateInvoiceAction,
} from "@/services/invoices/actions";
import { sendDocumentEmailAction } from "@/services/notifications/actions";
import type { InvoiceStatus, PricingMethod } from "@/types";

export interface InvoiceCatalogOption {
  id: string;
  name: string;
  description: string | null;
  unit_type: string;
  pricing_method: PricingMethod;
  default_price: number;
  is_taxable: boolean;
}

export interface EditableInvoiceItem {
  name: string;
  description: string;
  category: LineItemCategory;
  pricingMethod: PricingMethod;
  quantity: string;
  unit: string;
  unitPrice: string;
  isTaxable: boolean;
}

interface InvoiceEditorProps {
  mode: "create" | "edit";
  invoiceId?: string;
  invoiceNumber?: string;
  currency: string;
  amountPaid?: number;
  catalogItems: InvoiceCatalogOption[];
  initialValues: {
    title: string;
    description: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerAddress: string;
    status: InvoiceStatus;
    taxRatePercent: string;
    discountType: DiscountType;
    discountValue: string;
    paymentInstructions: string;
    notes: string;
    terms: string;
    brandColor?: string;
    templateStyle?: DocumentTemplateStyle;
    logoUrl?: string;
    issueDate: string;
    dueDate: string;
    items: EditableInvoiceItem[];
  };
}

export function InvoiceEditor({
  mode,
  invoiceId,
  invoiceNumber,
  currency,
  amountPaid = 0,
  catalogItems,
  initialValues,
}: InvoiceEditorProps) {
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
  const [status, setStatus] = useState<InvoiceStatus>(initialValues.status);
  const [taxRatePercent, setTaxRatePercent] = useState(
    initialValues.taxRatePercent
  );
  const [discountType, setDiscountType] = useState<DiscountType>(
    initialValues.discountType
  );
  const [discountValue, setDiscountValue] = useState(
    initialValues.discountValue
  );
  const [paymentInstructions, setPaymentInstructions] = useState(
    initialValues.paymentInstructions
  );
  const [notes, setNotes] = useState(initialValues.notes);
  const [terms, setTerms] = useState(initialValues.terms);
  const [brandColor, setBrandColor] = useState(
    initialValues.brandColor ?? "#2563eb"
  );
  const [templateStyle, setTemplateStyle] = useState<DocumentTemplateStyle>(
    initialValues.templateStyle ?? "executive_sidebar"
  );
  const [logoUrl, setLogoUrl] = useState(
    initialValues.logoUrl ?? "/quoventra-logo.png"
  );
  const [issueDate, setIssueDate] = useState(initialValues.issueDate);
  const [dueDate, setDueDate] = useState(initialValues.dueDate);
  const [items, setItems] = useState<EditableInvoiceItem[]>(
    initialValues.items
  );

  // Payment recording state
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("bank_transfer");
  const [payRef, setPayRef] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payNotes, setPayNotes] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);

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

  const balanceDue = Math.max(
    0,
    (Math.round(summary.total * 100) - Math.round(amountPaid * 100)) / 100
  );

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
        paymentInstructions: paymentInstructions || undefined,
        notes: notes || undefined,
        terms: terms || undefined,
        brandColor,
        templateStyle,
        logoUrl: logoUrl.trim() || "/quoventra-logo.png",
        issueDate,
        dueDate: dueDate || null,
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
        const res = await createManualInvoiceAction(payload);
        if (!res.ok) {
          setError(res.error ?? "Could not create invoice.");
          return;
        }
        router.push(`/dashboard/invoices/${res.invoiceId}`);
        router.refresh();
        return;
      }

      if (!invoiceId) return;
      const res = await updateInvoiceAction(invoiceId, payload);
      if (!res.ok) {
        setError(res.error ?? "Could not update invoice.");
        return;
      }
      setSavedNotice("Invoice updated.");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecordPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!invoiceId) return;
    setError(null);
    setSavedNotice(null);
    setRecordingPayment(true);
    try {
      const res = await recordInvoicePaymentAction(invoiceId, {
        amount: Number(payAmount) || 0,
        paymentMethod: payMethod,
        reference: payRef || undefined,
        paymentDate: payDate,
        notes: payNotes || undefined,
      });
      if (!res.ok) {
        setError(res.error ?? "Failed to record payment.");
        return;
      }
      setPayAmount("");
      setPayRef("");
      setPayNotes("");
      setSavedNotice("Payment recorded and invoice balance updated.");
      router.refresh();
    } finally {
      setRecordingPayment(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Branded Document Theme & Live Preview Strip */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="h-2 w-full" style={{ backgroundColor: brandColor }} />
        <div className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl.trim() || "/quoventra-logo.png"}
              alt="Invoice logo"
              className="h-12 w-14 shrink-0 rounded-xl border border-border bg-white p-1.5 object-contain shadow-xs"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span
                  className="rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white"
                  style={{ backgroundColor: brandColor }}
                >
                  Invoice
                </span>
                {invoiceNumber ? (
                  <span className="font-mono text-sm font-bold text-foreground">
                    {invoiceNumber}
                  </span>
                ) : null}
              </div>
              <p className="text-base font-bold text-foreground">
                {title || "Untitled Invoice"}
              </p>
              <p className="text-xs text-muted-foreground">
                Total:{" "}
                <span className="font-bold" style={{ color: brandColor }}>
                  {formatCurrency(summary.total, currency)}
                </span>{" "}
                • Logo, layout &amp; color apply to your exported PDF invoice
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <DocumentColorPicker
              value={brandColor}
              onChange={setBrandColor}
              label="Invoice Color Theme"
            />
            <div className="flex items-center gap-2">
              <Label htmlFor="invoice-logo-url" className="text-xs shrink-0">
                Logo URL:
              </Label>
              <Input
                id="invoice-logo-url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="/quoventra-logo.png or https://..."
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>
        <div className="border-t border-border/70 bg-muted/20 px-5 py-4">
          <DocumentTemplatePicker
            value={templateStyle}
            onChange={setTemplateStyle}
            accentColor={brandColor}
          />
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === "edit" && invoiceId ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <div>
              <p className="text-xs text-muted-foreground">Invoice Number</p>
              <p className="font-mono text-base font-bold">{invoiceNumber}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  setError(null);
                  setSavedNotice(null);
                  const res = await sendDocumentEmailAction({
                    eventType: "invoice_sent",
                    documentType: "invoice",
                    documentId: invoiceId,
                    recipientEmail: customerEmail,
                    variables: {
                      business_name: "Quoventra Business",
                      customer_name: customerName || "Customer",
                      document_number: invoiceNumber ?? "",
                      total: formatCurrency(summary.total, currency),
                      link: "",
                    },
                  });
                  if (!res.ok) {
                    setError(res.error ?? "Failed to send email.");
                  } else {
                    setSavedNotice(`Invoice emailed to ${customerEmail}.`);
                  }
                }}
              >
                <Mail className="h-4 w-4" />
                Email Invoice
              </Button>
              <a
                href={`/api/invoices/${invoiceId}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button type="button" variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4" />
                  Preview PDF
                </Button>
              </a>
              <a href={`/api/invoices/${invoiceId}/pdf?download=1`}>
                <Button type="button" variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </a>
              {status === "draft" ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (!window.confirm("Delete this draft invoice?")) return;
                    const res = await deleteInvoiceDraftAction(invoiceId);
                    if (res.ok) {
                      router.push("/dashboard/invoices");
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
              <CardTitle className="text-base">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="inv-title">Title *</Label>
                <Input
                  id="inv-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv-desc">Description</Label>
                <textarea
                  id="inv-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-status">Status</Label>
                  <select
                    id="inv-status"
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as InvoiceStatus)
                    }
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="viewed">Viewed</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-issue">Issue date</Label>
                  <Input
                    id="inv-issue"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-due">Due date</Label>
                  <Input
                    id="inv-due"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
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
                  <Label htmlFor="icust-name">Customer name</Label>
                  <Input
                    id="icust-name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="icust-email">Customer email</Label>
                  <Input
                    id="icust-email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="icust-phone">Phone</Label>
                  <Input
                    id="icust-phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="icust-addr">Address</Label>
                  <Input
                    id="icust-addr"
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
            <CardTitle className="text-base">Line Items</CardTitle>
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
                      {c.name} (
                      {formatCurrency(Number(c.default_price), currency)}/
                      {c.unit_type})
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
              <CardTitle className="text-base">
                Payment Instructions, Notes &amp; Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="inv-pay-inst">Payment instructions</Label>
                <textarea
                  id="inv-pay-inst"
                  rows={2}
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                  placeholder="ACH / Wire details, e-Transfer email, or check payable to..."
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-notes">Notes</Label>
                <textarea
                  id="inv-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-terms">Terms &amp; Conditions</Label>
                <textarea
                  id="inv-terms"
                  rows={2}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoice Balance Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-disc-type">Discount</Label>
                  <select
                    id="inv-disc-type"
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
                  <Label htmlFor="inv-disc-val">Discount value</Label>
                  <Input
                    id="inv-disc-val"
                    type="number"
                    step="0.01"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    disabled={discountType === "none"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inv-tax">Tax rate (%)</Label>
                  <Input
                    id="inv-tax"
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
                <div className="flex justify-between font-semibold">
                  <span>Invoice Total</span>
                  <span>{formatCurrency(summary.total, currency)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Amount Paid</span>
                  <span>{formatCurrency(amountPaid, currency)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-bold text-base">
                  <span>Balance Due</span>
                  <span>{formatCurrency(balanceDue, currency)}</span>
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
                    {mode === "create" ? "Create Invoice" : "Save Changes"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>

      {/* Record Manual Payment */}
      {mode === "edit" && invoiceId ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Record Payment</CardTitle>
            </div>
            <CardDescription>
              Log full or partial payments received from the customer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleRecordPayment}
              className="grid gap-4 sm:grid-cols-5 items-end"
            >
              <div className="space-y-1.5">
                <Label htmlFor="pay-amount">Amount ({currency})</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={balanceDue.toFixed(2)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-method">Method</Label>
                <select
                  id="pay-method"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-date">Date</Label>
                <Input
                  id="pay-date"
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-ref">Reference (optional)</Label>
                <Input
                  id="pay-ref"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="TXN / Cheque #"
                />
              </div>
              <Button type="submit" disabled={recordingPayment}>
                {recordingPayment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Record Payment"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

