"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveBusinessContext, requireAuthUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";

const pricingMethodEnum = z.enum([
  "fixed",
  "hourly",
  "quantity",
  "material",
  "square_foot",
  "distance",
  "per_item",
  "percentage",
  "custom",
]);

const categorySchema = z.object({
  name: z.string().trim().min(2, "Category name is required.").max(80),
  description: z.string().trim().max(300).optional(),
});

const productServiceSchema = z.object({
  name: z.string().trim().min(2, "Service or product name is required.").max(120),
  description: z.string().trim().max(500).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  unitType: z.string().trim().min(1, "Unit type is required.").max(30),
  pricingMethod: pricingMethodEnum,
  defaultPrice: z.coerce.number().min(0, "Price cannot be negative."),
  cost: z.coerce.number().min(0, "Cost cannot be negative.").optional().nullable(),
  isTaxable: z.boolean(),
  isActive: z.boolean(),
});

const pricingRuleSchema = z.object({
  name: z.string().trim().min(2, "Rule name is required.").max(120),
  description: z.string().trim().max(500).optional(),
  pricingMethod: pricingMethodEnum,
  unitType: z.string().trim().min(1, "Unit type is required.").max(30),
  baseFee: z.coerce.number().min(0, "Base fee cannot be negative."),
  unitRate: z.coerce.number().min(0, "Unit rate cannot be negative."),
  minCharge: z.coerce.number().min(0).optional().nullable(),
  markupPercent: z.coerce.number().min(0).max(1000).optional().nullable(),
  taxRateOverride: z.coerce.number().min(0).max(1).optional().nullable(),
  isTaxable: z.boolean(),
  isActive: z.boolean(),
});

export interface CatalogActionResult {
  ok: boolean;
  error?: string;
}

async function getTenantOrError() {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    return { error: "Complete business onboarding first." as const, context: null };
  }
  return { error: null, context };
}

export async function createCategoryAction(input: {
  name: string;
  description?: string;
}): Promise<CatalogActionResult> {
  const { error: tenantErr, context } = await getTenantOrError();
  if (tenantErr || !context) return { ok: false, error: tenantErr ?? "Unauthorized" };

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid category." };
  }

  const insforge = await createInsForgeServerClient();
  const { error } = await insforge.database.from("service_categories").insert([
    {
      business_id: context.business.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
    },
  ]);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/products");
  return { ok: true };
}

export async function deleteCategoryAction(id: string): Promise<CatalogActionResult> {
  const { error: tenantErr, context } = await getTenantOrError();
  if (tenantErr || !context) return { ok: false, error: tenantErr ?? "Unauthorized" };

  const insforge = await createInsForgeServerClient();
  const { error } = await insforge.database
    .from("service_categories")
    .delete()
    .eq("id", id)
    .eq("business_id", context.business.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/products");
  return { ok: true };
}

export async function createProductServiceAction(
  input: z.infer<typeof productServiceSchema>
): Promise<CatalogActionResult> {
  const { error: tenantErr, context } = await getTenantOrError();
  if (tenantErr || !context) return { ok: false, error: tenantErr ?? "Unauthorized" };

  const parsed = productServiceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid item." };
  }

  const insforge = await createInsForgeServerClient();
  const { error } = await insforge.database.from("products_services").insert([
    {
      business_id: context.business.id,
      category_id: parsed.data.categoryId || null,
      name: parsed.data.name,
      description: parsed.data.description || null,
      unit_type: parsed.data.unitType,
      pricing_method: parsed.data.pricingMethod,
      default_price: parsed.data.defaultPrice,
      cost: parsed.data.cost ?? null,
      is_taxable: parsed.data.isTaxable,
      is_active: parsed.data.isActive,
    },
  ]);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/products");
  return { ok: true };
}

export async function updateProductServiceAction(
  id: string,
  input: z.infer<typeof productServiceSchema>
): Promise<CatalogActionResult> {
  const { error: tenantErr, context } = await getTenantOrError();
  if (tenantErr || !context) return { ok: false, error: tenantErr ?? "Unauthorized" };

  const parsed = productServiceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid item." };
  }

  const insforge = await createInsForgeServerClient();
  const { error } = await insforge.database
    .from("products_services")
    .update({
      category_id: parsed.data.categoryId || null,
      name: parsed.data.name,
      description: parsed.data.description || null,
      unit_type: parsed.data.unitType,
      pricing_method: parsed.data.pricingMethod,
      default_price: parsed.data.defaultPrice,
      cost: parsed.data.cost ?? null,
      is_taxable: parsed.data.isTaxable,
      is_active: parsed.data.isActive,
    })
    .eq("id", id)
    .eq("business_id", context.business.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/products");
  return { ok: true };
}

export async function toggleProductActiveAction(
  id: string,
  isActive: boolean
): Promise<CatalogActionResult> {
  const { error: tenantErr, context } = await getTenantOrError();
  if (tenantErr || !context) return { ok: false, error: tenantErr ?? "Unauthorized" };

  const insforge = await createInsForgeServerClient();
  const { error } = await insforge.database
    .from("products_services")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("business_id", context.business.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/products");
  return { ok: true };
}

export async function deleteProductServiceAction(
  id: string
): Promise<CatalogActionResult> {
  const { error: tenantErr, context } = await getTenantOrError();
  if (tenantErr || !context) return { ok: false, error: tenantErr ?? "Unauthorized" };

  const insforge = await createInsForgeServerClient();
  const { error } = await insforge.database
    .from("products_services")
    .delete()
    .eq("id", id)
    .eq("business_id", context.business.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/products");
  return { ok: true };
}

export async function createPricingRuleAction(
  input: z.infer<typeof pricingRuleSchema>
): Promise<CatalogActionResult> {
  const { error: tenantErr, context } = await getTenantOrError();
  if (tenantErr || !context) return { ok: false, error: tenantErr ?? "Unauthorized" };

  const parsed = pricingRuleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid rule." };
  }

  const insforge = await createInsForgeServerClient();
  const { error } = await insforge.database.from("pricing_rules").insert([
    {
      business_id: context.business.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      pricing_method: parsed.data.pricingMethod,
      unit_type: parsed.data.unitType,
      base_fee: parsed.data.baseFee,
      unit_rate: parsed.data.unitRate,
      min_charge: parsed.data.minCharge ?? null,
      markup_percent: parsed.data.markupPercent ?? null,
      tax_rate_override: parsed.data.taxRateOverride ?? null,
      is_taxable: parsed.data.isTaxable,
      is_active: parsed.data.isActive,
    },
  ]);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/pricing");
  return { ok: true };
}

export async function togglePricingRuleActiveAction(
  id: string,
  isActive: boolean
): Promise<CatalogActionResult> {
  const { error: tenantErr, context } = await getTenantOrError();
  if (tenantErr || !context) return { ok: false, error: tenantErr ?? "Unauthorized" };

  const insforge = await createInsForgeServerClient();
  const { error } = await insforge.database
    .from("pricing_rules")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("business_id", context.business.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/pricing");
  return { ok: true };
}

export async function deletePricingRuleAction(
  id: string
): Promise<CatalogActionResult> {
  const { error: tenantErr, context } = await getTenantOrError();
  if (tenantErr || !context) return { ok: false, error: tenantErr ?? "Unauthorized" };

  const insforge = await createInsForgeServerClient();
  const { error } = await insforge.database
    .from("pricing_rules")
    .delete()
    .eq("id", id)
    .eq("business_id", context.business.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/pricing");
  return { ok: true };
}

