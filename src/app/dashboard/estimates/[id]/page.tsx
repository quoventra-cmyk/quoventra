import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  EstimateEditor,
  type CatalogItemOption,
  type EditableEstimateItem,
} from "@/components/estimates/estimate-editor";
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
import type { EstimateStatus, PricingMethod } from "@/types";

export default async function EstimateDetailPage({
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

  const [{ data: estimate }, { data: items }, { data: catalog }, { data: history }] =
    await Promise.all([
      insforge.database
        .from("estimates")
        .select("*")
        .eq("id", id)
        .eq("business_id", context.business.id)
        .maybeSingle(),
      insforge.database
        .from("estimate_items")
        .select("*")
        .eq("estimate_id", id)
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
        .from("estimate_history")
        .select("id, action, previous_status, new_status, notes, created_at")
        .eq("estimate_id", id)
        .eq("business_id", context.business.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  if (!estimate) {
    notFound();
  }

  const editableItems: EditableEstimateItem[] = (items ?? []).map((row) => ({
    name: row.name,
    description: row.description ?? "",
    category: (row.category ?? "service") as LineItemCategory,
    pricingMethod: (row.pricing_method ?? "fixed") as PricingMethod,
    quantity: String(row.quantity),
    unit: row.unit,
    unitPrice: String(row.unit_price),
    pricingSource: (row.pricing_source ?? "user_provided") as
      | "business_rate"
      | "user_provided"
      | "missing",
    isTaxable: Boolean(row.is_taxable),
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {estimate.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Edit line items, update status, duplicate, or export branded PDF.
          </p>
        </div>
        <Link href="/dashboard/estimates">
          <Button variant="outline" size="sm">
            Back to Estimates
          </Button>
        </Link>
      </div>

      <EstimateEditor
        mode="edit"
        estimateId={estimate.id}
        estimateNumber={estimate.estimate_number}
        currency={estimate.currency}
        catalogItems={(catalog ?? []) as CatalogItemOption[]}
        initialValues={{
          title: estimate.title,
          description: estimate.description ?? "",
          customerName: estimate.customer_name ?? "",
          customerEmail: estimate.customer_email ?? "",
          customerPhone: estimate.customer_phone ?? "",
          customerAddress: estimate.customer_address ?? "",
          status: estimate.status as EstimateStatus,
          taxRatePercent: String((Number(estimate.tax_rate) * 100).toFixed(2)),
          discountType: (estimate.discount_type ?? "none") as DiscountType,
          discountValue: String(estimate.discount_value ?? 0),
          notes: estimate.notes ?? "",
          terms: estimate.terms ?? "",
          issueDate: estimate.issue_date,
          expiryDate: estimate.expiry_date ?? "",
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
                    pricingSource: "user_provided",
                    isTaxable: true,
                  },
                ],
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estimate Activity History</CardTitle>
          <CardDescription>
            Audit log of edits and status transitions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!history || history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activity recorded yet.
            </p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2"
                >
                  <div>
                    <span className="font-medium capitalize">
                      {String(h.action).replace("_", " ")}
                    </span>
                    {h.new_status ? (
                      <span className="text-muted-foreground">
                        {" "}
                        • Status: {h.new_status}
                      </span>
                    ) : null}
                    {h.notes ? (
                      <span className="text-muted-foreground"> — {h.notes}</span>
                    ) : null}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(h.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

