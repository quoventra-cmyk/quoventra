import Link from "next/link";
import { redirect } from "next/navigation";
import {
  QuotationEditor,
  type QuotationCatalogOption,
} from "@/components/quotations/quotation-editor";
import { Button } from "@/components/ui/button";
import { getActiveBusinessContext, requireAuthUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";

export default async function NewQuotationPage() {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    redirect("/dashboard/onboarding");
  }

  const insforge = await createInsForgeServerClient();
  const { data: catalog } = await insforge.database
    .from("products_services")
    .select(
      "id, name, description, unit_type, pricing_method, default_price, is_taxable"
    )
    .eq("business_id", context.business.id)
    .eq("is_active", true)
    .order("name", { ascending: true });

  const today = new Date().toISOString().slice(0, 10);
  const expiryDays = context.settings?.default_expiry_days ?? 14;
  const expiryDate = new Date();
  expiryDate.setUTCDate(expiryDate.getUTCDate() + expiryDays);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Quotation</h1>
          <p className="text-sm text-muted-foreground">
            Create a quotation manually for customer review and approval.
          </p>
        </div>
        <Link href="/dashboard/quotations">
          <Button variant="outline" size="sm">
            Back to Quotations
          </Button>
        </Link>
      </div>

      <QuotationEditor
        mode="create"
        currency={context.business.currency}
        catalogItems={(catalog ?? []) as QuotationCatalogOption[]}
        initialValues={{
          title: "",
          description: "",
          customerName: "",
          customerEmail: "",
          customerPhone: "",
          customerAddress: "",
          status: "draft",
          taxRatePercent: String(
            (Number(context.settings?.default_tax_rate ?? 0) * 100).toFixed(2)
          ),
          discountType: "none",
          discountValue: "0",
          notes: "",
          terms: context.settings?.default_payment_terms ?? "",
          issueDate: today,
          expiryDate: expiryDate.toISOString().slice(0, 10),
          items: [
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
    </div>
  );
}

