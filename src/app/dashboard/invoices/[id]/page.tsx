import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  InvoiceEditor,
  type EditableInvoiceItem,
  type InvoiceCatalogOption,
} from "@/components/invoices/invoice-editor";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getActiveBusinessContext, requireAuthUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";
import {
  formatCurrency,
  type DiscountType,
  type LineItemCategory,
} from "@/lib/pricing/engine";
import type { InvoiceStatus, PricingMethod } from "@/types";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    redirect("/dashboard/onboarding");
  }

  const { id } = await params;
  const insforge = await createInsForgeServerClient();

  const [
    { data: invoice },
    { data: items },
    { data: catalog },
    { data: payments },
    { data: history },
  ] = await Promise.all([
    insforge.database
      .from("invoices")
      .select("*")
      .eq("id", id)
      .eq("business_id", context.business.id)
      .maybeSingle(),
    insforge.database
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", id)
      .eq("business_id", context.business.id)
      .order("sort_order", { ascending: true }),
    insforge.database
      .from("products_services")
      .select(
        "id, name, description, unit_type, pricing_method, default_price, is_taxable"
      )
      .eq("business_id", context.business.id)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    insforge.database
      .from("invoice_payments")
      .select("id, amount, payment_method, reference, payment_date, notes")
      .eq("invoice_id", id)
      .eq("business_id", context.business.id)
      .order("payment_date", { ascending: false }),
    insforge.database
      .from("invoice_history")
      .select("id, action, new_status, notes, created_at")
      .eq("invoice_id", id)
      .eq("business_id", context.business.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!invoice) {
    notFound();
  }

  const editableItems: EditableInvoiceItem[] = (items ?? []).map((row) => ({
    name: row.name,
    description: row.description ?? "",
    category: (row.category ?? "service") as LineItemCategory,
    pricingMethod: (row.pricing_method ?? "fixed") as PricingMethod,
    quantity: String(row.quantity),
    unit: row.unit,
    unitPrice: String(row.unit_price),
    isTaxable: Boolean(row.is_taxable),
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{invoice.title}</h1>
          <p className="text-sm text-muted-foreground">
            Manage invoice, record payments, and download PDF.
          </p>
        </div>
        <Link href="/dashboard/invoices">
          <Button variant="outline" size="sm">
            Back to Invoices
          </Button>
        </Link>
      </div>

      <InvoiceEditor
        mode="edit"
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoice_number}
        currency={invoice.currency}
        amountPaid={Number(invoice.amount_paid)}
        catalogItems={(catalog ?? []) as InvoiceCatalogOption[]}
        initialValues={{
          title: invoice.title,
          description: invoice.description ?? "",
          customerName: invoice.customer_name ?? "",
          customerEmail: invoice.customer_email ?? "",
          customerPhone: invoice.customer_phone ?? "",
          customerAddress: invoice.customer_address ?? "",
          status: invoice.status as InvoiceStatus,
          taxRatePercent: String((Number(invoice.tax_rate) * 100).toFixed(2)),
          discountType: (invoice.discount_type ?? "none") as DiscountType,
          discountValue: String(invoice.discount_value ?? 0),
          paymentInstructions: invoice.payment_instructions ?? "",
          notes: invoice.notes ?? "",
          terms: invoice.terms ?? "",
          brandColor:
            (invoice.business_snapshot as { brand_color?: string } | null)
              ?.brand_color ??
            context.settings?.brand_color ??
            "#2563eb",
          templateStyle:
            (
              invoice.business_snapshot as {
                template_style?: import("@/components/ui/document-color-picker").DocumentTemplateStyle;
              } | null
            )?.template_style ?? "executive_sidebar",
          logoUrl:
            (invoice.business_snapshot as { logo_url?: string } | null)
              ?.logo_url ??
            context.business.logo_url ??
            "/quoventra-logo.png",
          issueDate: invoice.issue_date,
          dueDate: invoice.due_date ?? "",
          items:
            editableItems.length > 0
              ? editableItems
              : [
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
                ],
        }}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment History</CardTitle>
            <CardDescription>
              Recorded payments applied to this invoice.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!payments || payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No payments recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {payments.map((p) => (
                  <li
                    key={p.id}
                    className="py-2.5 flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-medium capitalize">
                        {String(p.payment_method).replace("_", " ")}
                        {p.reference ? ` (${p.reference})` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.payment_date}
                      </p>
                    </div>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(Number(p.amount), invoice.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            {!history || history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history yet.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {history.map((h) => (
                  <li key={h.id} className="py-2 space-y-0.5">
                    <p className="font-medium capitalize">
                      {String(h.action).replaceAll("_", " ")}
                      {h.new_status ? ` (${h.new_status})` : ""}
                    </p>
                    {h.notes ? (
                      <p className="text-xs text-muted-foreground">{h.notes}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {new Date(h.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

