import { redirect } from "next/navigation";
import {
  ProductsManager,
  type CategoryRecord,
  type ProductServiceRecord,
} from "@/components/dashboard/products-manager";
import { getActiveBusinessContext, requireAuthUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";

export default async function ProductsPage() {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    redirect("/dashboard/onboarding");
  }

  const insforge = await createInsForgeServerClient();
  const [{ data: categoriesData }, { data: itemsData }] = await Promise.all([
    insforge.database
      .from("service_categories")
      .select("id, name, description")
      .eq("business_id", context.business.id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    insforge.database
      .from("products_services")
      .select(
        "id, category_id, name, description, unit_type, pricing_method, default_price, cost, is_taxable, is_active"
      )
      .eq("business_id", context.business.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Products &amp; Services
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage reusable services, materials, and rates for{" "}
          <span className="font-medium text-foreground">
            {context.business.name}
          </span>
          .
        </p>
      </div>

      <ProductsManager
        currency={context.business.currency}
        categories={(categoriesData ?? []) as CategoryRecord[]}
        items={(itemsData ?? []) as ProductServiceRecord[]}
      />
    </div>
  );
}

