"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getActiveBusinessContext,
  requireAuthUser,
  type ActiveBusinessContext,
} from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";
import { calculateDocumentPricing } from "@/lib/pricing/engine";
import { getBusinessEntitlements } from "@/services/subscriptions/entitlements";
import type { EstimateStatus } from "@/types";

const estimateItemInputSchema = z.object({
  name: z.string().trim().min(1, "Line item name is required."),
  description: z.string().trim().default(""),
  category: z
    .enum(["labour", "material", "equipment", "service", "other"])
    .default("service"),
  pricingMethod: z
    .enum([
      "fixed",
      "hourly",
      "quantity",
      "material",
      "square_foot",
      "distance",
      "per_item",
      "percentage",
      "custom",
    ])
    .default("fixed"),
  quantity: z.coerce.number().nonnegative(),
  unit: z.string().trim().min(1).default("unit"),
  unitPrice: z.coerce.number().nonnegative(),
  pricingSource: z
    .enum(["business_rate", "user_provided", "missing"])
    .default("user_provided"),
  isTaxable: z.boolean().default(true),
});

const estimatePayloadSchema = z.object({
  title: z.string().trim().min(2, "Project title is required.").max(200),
  description: z.string().trim().max(4000).optional(),
  customerName: z.string().trim().max(150).optional(),
  customerEmail: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || z.string().email().safeParse(v).success,
      "Invalid customer email."
    ),
  customerPhone: z.string().trim().max(50).optional(),
  customerAddress: z.string().trim().max(300).optional(),
  status: z
    .enum([
      "draft",
      "pending",
      "sent",
      "viewed",
      "approved",
      "rejected",
      "expired",
      "converted",
    ])
    .default("draft"),
  taxRatePercent: z.coerce.number().min(0).max(100),
  discountType: z.enum(["none", "percent", "fixed"]).default("none"),
  discountValue: z.coerce.number().min(0).default(0),
  notes: z.string().trim().max(2000).optional(),
  terms: z.string().trim().max(2000).optional(),
  issueDate: z.string().trim().min(8),
  expiryDate: z.string().trim().optional().nullable(),
  items: z.array(estimateItemInputSchema).min(1, "Add at least one line item."),
});

export type EstimatePayloadInput = z.infer<typeof estimatePayloadSchema>;

function buildBusinessSnapshot(context: ActiveBusinessContext) {
  const { business, settings } = context;
  return {
    name: business.name,
    email: business.email,
    phone: business.phone,
    website: business.website,
    address: business.address,
    city: business.city,
    region: business.region,
    country: business.country,
    postal_code: business.postal_code,
    logo_url: business.logo_url,
    tax_registration_number: business.tax_registration_number,
    brand_color: settings?.brand_color ?? "#2563eb",
  };
}

export async function createManualEstimateAction(
  input: EstimatePayloadInput
): Promise<{
  ok: boolean;
  error?: string;
  estimateId?: string;
}> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    return { ok: false, error: "Complete business onboarding first." };
  }

  const entitlements = await getBusinessEntitlements(context.business.id);
  if (!entitlements.canCreateEstimate) {
    return {
      ok: false,
      error: `Monthly estimate limit (${entitlements.limits.monthlyEstimates}) reached on your ${entitlements.planName} plan. Upgrade in Subscription & Billing to create more.`,
    };
  }

  const parsed = estimatePayloadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid estimate data.",
    };
  }

  const data = parsed.data;
  const taxDecimal = data.taxRatePercent / 100;
  const pricing = calculateDocumentPricing({
    items: data.items.map((i) => ({
      name: i.name,
      category: i.category,
      pricingMethod: i.pricingMethod,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      isTaxable: i.isTaxable,
    })),
    discountType: data.discountType,
    discountValue: data.discountValue,
    defaultTaxRate: taxDecimal,
    documentTaxRateOverride: taxDecimal,
  });

  const prefix = context.settings?.document_prefix ?? "QVN";
  const estimateNumber = `${prefix}-EST-${String(Date.now()).slice(-6)}`;

  const insforge = await createInsForgeServerClient();
  const { data: created, error: insertErr } = await insforge.database
    .from("estimates")
    .insert([
      {
        business_id: context.business.id,
        created_by: user.id,
        estimate_number: estimateNumber,
        customer_name: data.customerName || null,
        customer_email: data.customerEmail || null,
        customer_phone: data.customerPhone || null,
        customer_address: data.customerAddress || null,
        title: data.title,
        description: data.description || null,
        status: data.status,
        currency: context.business.currency,
        subtotal: pricing.subtotal,
        tax_rate: taxDecimal,
        tax_amount: pricing.taxTotal,
        discount_type: data.discountType,
        discount_value: data.discountValue,
        discount_amount: pricing.discountAmount,
        total: pricing.total,
        notes: data.notes || null,
        terms: data.terms || context.settings?.default_payment_terms || null,
        issue_date: data.issueDate,
        expiry_date: data.expiryDate || null,
        business_snapshot: buildBusinessSnapshot(context),
      },
    ])
    .select("id")
    .single();

  if (insertErr || !created) {
    return {
      ok: false,
      error: insertErr?.message ?? "Failed to create estimate.",
    };
  }

  const itemRows = data.items.map((item, idx) => ({
    estimate_id: created.id,
    business_id: context.business.id,
    name: item.name,
    description: item.description || null,
    category: item.category,
    pricing_method: item.pricingMethod,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unitPrice,
    line_total: pricing.items[idx]?.lineSubtotal ?? 0,
    pricing_source: item.pricingSource,
    is_taxable: item.isTaxable,
    sort_order: idx,
  }));

  const { error: itemsErr } = await insforge.database
    .from("estimate_items")
    .insert(itemRows);

  if (itemsErr) {
    return { ok: false, error: itemsErr.message };
  }

  await insforge.database.from("estimate_history").insert([
    {
      estimate_id: created.id,
      business_id: context.business.id,
      actor_id: user.id,
      action: "created",
      new_status: data.status,
      notes: "Estimate created manually.",
    },
  ]);

  revalidatePath("/dashboard/estimates");
  return { ok: true, estimateId: created.id };
}

export async function updateEstimateAction(
  estimateId: string,
  input: EstimatePayloadInput
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    return { ok: false, error: "Complete business onboarding first." };
  }

  const entitlements = await getBusinessEntitlements(context.business.id);
  if (!entitlements.canCreateEstimate) {
    return {
      ok: false,
      error: `Monthly estimate limit (${entitlements.limits.monthlyEstimates}) reached on your ${entitlements.planName} plan. Upgrade in Subscription & Billing to create more.`,
    };
  }

  const parsed = estimatePayloadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid estimate data.",
    };
  }

  const insforge = await createInsForgeServerClient();
  const { data: existing } = await insforge.database
    .from("estimates")
    .select("id, status, business_snapshot")
    .eq("id", estimateId)
    .eq("business_id", context.business.id)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "Estimate not found." };
  }

  const data = parsed.data;
  const taxDecimal = data.taxRatePercent / 100;
  const pricing = calculateDocumentPricing({
    items: data.items.map((i) => ({
      name: i.name,
      category: i.category,
      pricingMethod: i.pricingMethod,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      isTaxable: i.isTaxable,
    })),
    discountType: data.discountType,
    discountValue: data.discountValue,
    defaultTaxRate: taxDecimal,
    documentTaxRateOverride: taxDecimal,
  });

  const existingSnapshot = existing.business_snapshot as Record<string, unknown> | null;
  const hasSnapshot = existingSnapshot && Object.keys(existingSnapshot).length > 0;

  const { error: updateErr } = await insforge.database
    .from("estimates")
    .update({
      customer_name: data.customerName || null,
      customer_email: data.customerEmail || null,
      customer_phone: data.customerPhone || null,
      customer_address: data.customerAddress || null,
      title: data.title,
      description: data.description || null,
      status: data.status,
      subtotal: pricing.subtotal,
      tax_rate: taxDecimal,
      tax_amount: pricing.taxTotal,
      discount_type: data.discountType,
      discount_value: data.discountValue,
      discount_amount: pricing.discountAmount,
      total: pricing.total,
      notes: data.notes || null,
      terms: data.terms || null,
      issue_date: data.issueDate,
      expiry_date: data.expiryDate || null,
      business_snapshot: hasSnapshot
        ? existingSnapshot
        : buildBusinessSnapshot(context),
    })
    .eq("id", estimateId)
    .eq("business_id", context.business.id);

  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  await insforge.database
    .from("estimate_items")
    .delete()
    .eq("estimate_id", estimateId)
    .eq("business_id", context.business.id);

  const itemRows = data.items.map((item, idx) => ({
    estimate_id: estimateId,
    business_id: context.business.id,
    name: item.name,
    description: item.description || null,
    category: item.category,
    pricing_method: item.pricingMethod,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unitPrice,
    line_total: pricing.items[idx]?.lineSubtotal ?? 0,
    pricing_source: item.pricingSource,
    is_taxable: item.isTaxable,
    sort_order: idx,
  }));

  const { error: itemsErr } = await insforge.database
    .from("estimate_items")
    .insert(itemRows);

  if (itemsErr) {
    return { ok: false, error: itemsErr.message };
  }

  await insforge.database.from("estimate_history").insert([
    {
      estimate_id: estimateId,
      business_id: context.business.id,
      actor_id: user.id,
      action:
        existing.status !== data.status ? "status_changed" : "updated",
      previous_status: existing.status,
      new_status: data.status,
      notes: "Estimate updated.",
    },
  ]);

  revalidatePath("/dashboard/estimates");
  revalidatePath(`/dashboard/estimates/${estimateId}`);
  return { ok: true };
}

export async function updateEstimateStatusAction(
  estimateId: string,
  status: EstimateStatus
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    return { ok: false, error: "Unauthorized" };
  }

  const insforge = await createInsForgeServerClient();
  const { data: existing } = await insforge.database
    .from("estimates")
    .select("id, status")
    .eq("id", estimateId)
    .eq("business_id", context.business.id)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "Estimate not found." };
  }

  const { error } = await insforge.database
    .from("estimates")
    .update({ status })
    .eq("id", estimateId)
    .eq("business_id", context.business.id);

  if (error) return { ok: false, error: error.message };

  await insforge.database.from("estimate_history").insert([
    {
      estimate_id: estimateId,
      business_id: context.business.id,
      actor_id: user.id,
      action: "status_changed",
      previous_status: existing.status,
      new_status: status,
    },
  ]);

  revalidatePath("/dashboard/estimates");
  revalidatePath(`/dashboard/estimates/${estimateId}`);
  return { ok: true };
}

export async function duplicateEstimateAction(estimateId: string): Promise<{
  ok: boolean;
  error?: string;
  newEstimateId?: string;
}> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    return { ok: false, error: "Unauthorized" };
  }

  const insforge = await createInsForgeServerClient();
  const [{ data: source }, { data: items }] = await Promise.all([
    insforge.database
      .from("estimates")
      .select("*")
      .eq("id", estimateId)
      .eq("business_id", context.business.id)
      .maybeSingle(),
    insforge.database
      .from("estimate_items")
      .select("*")
      .eq("estimate_id", estimateId)
      .eq("business_id", context.business.id)
      .order("sort_order", { ascending: true }),
  ]);

  if (!source) {
    return { ok: false, error: "Estimate not found." };
  }

  const prefix = context.settings?.document_prefix ?? "QVN";
  const newNumber = `${prefix}-EST-${String(Date.now()).slice(-6)}`;
  const today = new Date().toISOString().slice(0, 10);

  const { data: cloned, error: cloneErr } = await insforge.database
    .from("estimates")
    .insert([
      {
        business_id: context.business.id,
        created_by: user.id,
        estimate_number: newNumber,
        customer_name: source.customer_name,
        customer_email: source.customer_email,
        customer_phone: source.customer_phone,
        customer_address: source.customer_address,
        title: `${source.title} (Copy)`,
        description: source.description,
        status: "draft",
        currency: source.currency,
        subtotal: source.subtotal,
        tax_rate: source.tax_rate,
        tax_amount: source.tax_amount,
        discount_type: source.discount_type,
        discount_value: source.discount_value,
        discount_amount: source.discount_amount,
        total: source.total,
        notes: source.notes,
        terms: source.terms,
        assumptions: source.assumptions ?? [],
        missing_information: source.missing_information ?? [],
        issue_date: today,
        expiry_date: source.expiry_date,
        business_snapshot: buildBusinessSnapshot(context),
      },
    ])
    .select("id")
    .single();

  if (cloneErr || !cloned) {
    return { ok: false, error: cloneErr?.message ?? "Could not duplicate." };
  }

  if (items && items.length > 0) {
    await insforge.database.from("estimate_items").insert(
      items.map((item) => ({
        estimate_id: cloned.id,
        business_id: context.business.id,
        name: item.name,
        description: item.description,
        category: item.category,
        pricing_method: item.pricing_method,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        line_total: item.line_total,
        pricing_source: item.pricing_source,
        is_taxable: item.is_taxable,
        sort_order: item.sort_order,
      }))
    );
  }

  await insforge.database.from("estimate_history").insert([
    {
      estimate_id: cloned.id,
      business_id: context.business.id,
      actor_id: user.id,
      action: "duplicated",
      new_status: "draft",
      notes: `Duplicated from ${source.estimate_number}`,
    },
  ]);

  revalidatePath("/dashboard/estimates");
  return { ok: true, newEstimateId: cloned.id };
}

export async function deleteEstimateDraftAction(
  estimateId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    return { ok: false, error: "Unauthorized" };
  }

  const insforge = await createInsForgeServerClient();
  const { data: existing } = await insforge.database
    .from("estimates")
    .select("id, status")
    .eq("id", estimateId)
    .eq("business_id", context.business.id)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "Estimate not found." };
  }

  if (existing.status !== "draft") {
    return {
      ok: false,
      error: "Only draft estimates can be deleted.",
    };
  }

  const { error } = await insforge.database
    .from("estimates")
    .delete()
    .eq("id", estimateId)
    .eq("business_id", context.business.id)
    .eq("status", "draft");

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/estimates");
  return { ok: true };
}

