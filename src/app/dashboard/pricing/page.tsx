import { redirect } from "next/navigation";
import {
  PricingManager,
  type PricingRuleRecord,
} from "@/components/dashboard/pricing-manager";
import { getActiveBusinessContext, requireAuthUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";

export default async function PricingPage() {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    redirect("/dashboard/onboarding");
  }

  const insforge = await createInsForgeServerClient();
  const { data: rulesData } = await insforge.database
    .from("pricing_rules")
    .select(
      "id, name, description, pricing_method, unit_type, base_fee, unit_rate, min_charge, markup_percent, tax_rate_override, is_taxable, is_active"
    )
    .eq("business_id", context.business.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Pricing Configuration
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure multi-industry pricing rules and verify calculations for{" "}
          <span className="font-medium text-foreground">
            {context.business.name}
          </span>
          .
        </p>
      </div>

      <PricingManager
        currency={context.business.currency}
        defaultTaxRate={Number(context.settings?.default_tax_rate ?? 0)}
        rules={(rulesData ?? []) as PricingRuleRecord[]}
      />
    </div>
  );
}

