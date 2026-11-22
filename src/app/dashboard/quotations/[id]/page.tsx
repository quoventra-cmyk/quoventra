import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  QuotationEditor,
  type EditableQuotationItem,
  type QuotationCatalogOption,
} from "@/components/quotations/quotation-editor";
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
import type { DiscountType, LineItemCategory } from "@/lib/pricing/engine";
import type { PricingMethod, QuotationStatus } from "@/types";

export default async function QuotationDetailPage({
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
    { data: quotation },
    { data: items },
    { data: catalog },
    { data: approvals },
    { data: history },
  ] = await Promise.all([
    insforge.database
      .from("quotations")
      .select("*")
      .eq("id", id)
      .eq("business_id", context.business.id)
      .maybeSingle(),
    insforge.database
      .from("quotation_items")
      .select("*")
      .eq("quotation_id", id)
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
      .from("quotation_approvals")
      .select("id, decision, customer_name, customer_email, comment, created_at")
      .eq("quotation_id", id)
      .eq("business_id", context.business.id)
      .order("created_at", { ascending: false }),
    insforge.database
      .from("quotation_history")
      .select("id, action, previous_status, new_status, notes, created_at")
      .eq("quotation_id", id)
      .eq("business_id", context.business.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!quotation) {
    notFound();
  }

  const editableItems: EditableQuotationItem[] = (items ?? []).map((row) => ({
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
          <h1 className="text-2xl font-bold tracking-tight">
            {quotation.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage quotation, share public customer link, and track approvals.
          </p>
        </div>
        <Link href="/dashboard/quotations">
          <Button variant="outline" size="sm">
            Back to Quotations
          </Button>
        </Link>
      </div>

      <QuotationEditor
        mode="edit"
        quotationId={quotation.id}
        quotationNumber={quotation.quotation_number}
        publicToken={quotation.public_token}
        currency={quotation.currency}
        catalogItems={(catalog ?? []) as QuotationCatalogOption[]}
        initialValues={{
          title: quotation.title,
          description: quotation.description ?? "",
          customerName: quotation.customer_name ?? "",
          customerEmail: quotation.customer_email ?? "",
          customerPhone: quotation.customer_phone ?? "",
          customerAddress: quotation.customer_address ?? "",
          status: quotation.status as QuotationStatus,
          taxRatePercent: String((Number(quotation.tax_rate) * 100).toFixed(2)),
          discountType: (quotation.discount_type ?? "none") as DiscountType,
          discountValue: String(quotation.discount_value ?? 0),
          notes: quotation.notes ?? "",
          terms: quotation.terms ?? "",
          brandColor:
            (quotation.business_snapshot as { brand_color?: string } | null)
              ?.brand_color ??
            context.settings?.brand_color ??
            "#2563eb",
          templateStyle:
            (
              quotation.business_snapshot as {
                template_style?:
                  | "executive_sidebar"
                  | "classic_banner"
                  | "modern_corporate";
              } | null
            )?.template_style ?? "executive_sidebar",
          issueDate: quotation.issue_date,
          expiryDate: quotation.expiry_date ?? "",
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
            <CardTitle className="text-base">Customer Approval History</CardTitle>
            <CardDescription>
              Verified responses submitted via the public quotation link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!approvals || approvals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No customer responses yet.
              </p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {approvals.map((a) => (
                  <li key={a.id} className="py-2.5 space-y-0.5">
                    <p className="font-medium capitalize">
                      {String(a.decision).replace("_", " ")} — {a.customer_name} (
                      {a.customer_email})
                    </p>
                    {a.comment ? (
                      <p className="text-xs text-muted-foreground">
                        &ldquo;{a.comment}&rdquo;
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quotation Activity Log</CardTitle>
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

