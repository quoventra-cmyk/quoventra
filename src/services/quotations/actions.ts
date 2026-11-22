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
import type { QuotationStatus } from "@/types";

const quotationItemSchema = z.object({
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
  isTaxable: z.boolean().default(true),
});

const quotationPayloadSchema = z.object({
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
      "sent",
      "viewed",
      "approved",
      "rejected",
      "changes_requested",
      "expired",
      "converted",
    ])
    .default("draft"),
  taxRatePercent: z.coerce.number().min(0).max(100),
  discountType: z.enum(["none", "percent", "fixed"]).default("none"),
  discountValue: z.coerce.number().min(0).default(0),
  notes: z.string().trim().max(2000).optional(),
  terms: z.string().trim().max(2000).optional(),
  brandColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color hex code.")
    .optional(),
  templateStyle: z
    .enum([
      "executive_sidebar",
      "classic_banner",
      "modern_corporate",
      "minimal_swiss",
      "bold_split_header",
      "centered_prestige",
      "sleek_agency",
      "compact_contractor",
      "royal_bordered",
    ])
    .optional(),
  logoUrl: z.string().trim().max(500).optional(),
  issueDate: z.string().trim().min(8),
  expiryDate: z.string().trim().optional().nullable(),
  items: z.array(quotationItemSchema).min(1, "Add at least one line item."),
});

export type QuotationPayloadInput = z.infer<typeof quotationPayloadSchema>;

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

export async function convertEstimateToQuotationAction(
  estimateId: string
): Promise<{ ok: boolean; error?: string; quotationId?: string }> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    return { ok: false, error: "Complete business onboarding first." };
  }

  const insforge = await createInsForgeServerClient();
  const [{ data: estimate }, { data: items }] = await Promise.all([
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

  if (!estimate) {
    return { ok: false, error: "Estimate not found." };
  }

  const prefix = context.settings?.document_prefix ?? "QVN";
  const quotationNumber = `${prefix}-QUO-${String(Date.now()).slice(-6)}`;
  const today = new Date().toISOString().slice(0, 10);

  const snapshot =
    estimate.business_snapshot &&
    Object.keys(estimate.business_snapshot as Record<string, unknown>).length > 0
      ? estimate.business_snapshot
      : buildBusinessSnapshot(context);

  const { data: quotation, error: qErr } = await insforge.database
    .from("quotations")
    .insert([
      {
        business_id: context.business.id,
        estimate_id: estimate.id,
        customer_id: estimate.customer_id ?? null,
        created_by: user.id,
        quotation_number: quotationNumber,
        customer_name: estimate.customer_name,
        customer_email: estimate.customer_email,
        customer_phone: estimate.customer_phone,
        customer_address: estimate.customer_address,
        title: estimate.title,
        description: estimate.description,
        status: "draft",
        currency: estimate.currency,
        subtotal: estimate.subtotal,
        tax_rate: estimate.tax_rate,
        tax_amount: estimate.tax_amount,
        discount_type: estimate.discount_type,
        discount_value: estimate.discount_value,
        discount_amount: estimate.discount_amount,
        total: estimate.total,
        notes: estimate.notes,
        terms: estimate.terms ?? context.settings?.default_payment_terms ?? null,
        issue_date: today,
        expiry_date: estimate.expiry_date,
        business_snapshot: snapshot,
      },
    ])
    .select("id")
    .single();

  if (qErr || !quotation) {
    return {
      ok: false,
      error: qErr?.message ?? "Failed to convert estimate to quotation.",
    };
  }

  if (items && items.length > 0) {
    await insforge.database.from("quotation_items").insert(
      items.map((item) => ({
        quotation_id: quotation.id,
        business_id: context.business.id,
        name: item.name,
        description: item.description,
        category: item.category,
        pricing_method: item.pricing_method,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        line_total: item.line_total,
        is_taxable: item.is_taxable,
        sort_order: item.sort_order,
      }))
    );
  }

  await Promise.all([
    insforge.database
      .from("estimates")
      .update({ status: "converted" })
      .eq("id", estimate.id)
      .eq("business_id", context.business.id),
    insforge.database.from("estimate_history").insert([
      {
        estimate_id: estimate.id,
        business_id: context.business.id,
        actor_id: user.id,
        action: "converted_to_quotation",
        previous_status: estimate.status,
        new_status: "converted",
        notes: `Converted to ${quotationNumber}`,
      },
    ]),
    insforge.database.from("quotation_history").insert([
      {
        quotation_id: quotation.id,
        business_id: context.business.id,
        actor_id: user.id,
        action: "created_from_estimate",
        new_status: "draft",
        notes: `Converted from ${estimate.estimate_number}`,
      },
    ]),
  ]);

  revalidatePath("/dashboard/estimates");
  revalidatePath(`/dashboard/estimates/${estimateId}`);
  revalidatePath("/dashboard/quotations");
  return { ok: true, quotationId: quotation.id };
}

export async function createManualQuotationAction(
  input: QuotationPayloadInput
): Promise<{ ok: boolean; error?: string; quotationId?: string }> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    return { ok: false, error: "Complete business onboarding first." };
  }

  const parsed = quotationPayloadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid quotation data.",
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
  const quotationNumber = `${prefix}-QUO-${String(Date.now()).slice(-6)}`;

  const insforge = await createInsForgeServerClient();
  const { data: created, error: insertErr } = await insforge.database
    .from("quotations")
    .insert([
      {
        business_id: context.business.id,
        created_by: user.id,
        quotation_number: quotationNumber,
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
        business_snapshot: {
          ...buildBusinessSnapshot(context),
          ...(data.brandColor ? { brand_color: data.brandColor } : {}),
          ...(data.templateStyle ? { template_style: data.templateStyle } : {}),
          ...(data.logoUrl !== undefined
            ? { logo_url: data.logoUrl || null }
            : {}),
        },
      },
    ])
    .select("id")
    .single();

  if (insertErr || !created) {
    return {
      ok: false,
      error: insertErr?.message ?? "Failed to create quotation.",
    };
  }

  await insforge.database.from("quotation_items").insert(
    data.items.map((item, idx) => ({
      quotation_id: created.id,
      business_id: context.business.id,
      name: item.name,
      description: item.description || null,
      category: item.category,
      pricing_method: item.pricingMethod,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unitPrice,
      line_total: pricing.items[idx]?.lineSubtotal ?? 0,
      is_taxable: item.isTaxable,
      sort_order: idx,
    }))
  );

  await insforge.database.from("quotation_history").insert([
    {
      quotation_id: created.id,
      business_id: context.business.id,
      actor_id: user.id,
      action: "created",
      new_status: data.status,
      notes: "Quotation created manually.",
    },
  ]);

  revalidatePath("/dashboard/quotations");
  return { ok: true, quotationId: created.id };
}

export async function updateQuotationAction(
  quotationId: string,
  input: QuotationPayloadInput
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    return { ok: false, error: "Complete business onboarding first." };
  }

  const parsed = quotationPayloadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid quotation data.",
    };
  }

  const insforge = await createInsForgeServerClient();
  const { data: existing } = await insforge.database
    .from("quotations")
    .select("id, status, business_snapshot")
    .eq("id", quotationId)
    .eq("business_id", context.business.id)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "Quotation not found." };
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
  const nextSnapshot = hasSnapshot
    ? {
        ...existingSnapshot,
        ...(data.brandColor ? { brand_color: data.brandColor } : {}),
        ...(data.templateStyle ? { template_style: data.templateStyle } : {}),
        ...(data.logoUrl !== undefined
          ? { logo_url: data.logoUrl || null }
          : {}),
      }
    : {
        ...buildBusinessSnapshot(context),
        ...(data.brandColor ? { brand_color: data.brandColor } : {}),
        ...(data.templateStyle ? { template_style: data.templateStyle } : {}),
        ...(data.logoUrl !== undefined
          ? { logo_url: data.logoUrl || null }
          : {}),
      };

  const { error: updateErr } = await insforge.database
    .from("quotations")
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
      business_snapshot: nextSnapshot,
    })
    .eq("id", quotationId)
    .eq("business_id", context.business.id);

  if (updateErr) return { ok: false, error: updateErr.message };

  await insforge.database
    .from("quotation_items")
    .delete()
    .eq("quotation_id", quotationId)
    .eq("business_id", context.business.id);

  await insforge.database.from("quotation_items").insert(
    data.items.map((item, idx) => ({
      quotation_id: quotationId,
      business_id: context.business.id,
      name: item.name,
      description: item.description || null,
      category: item.category,
      pricing_method: item.pricingMethod,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unitPrice,
      line_total: pricing.items[idx]?.lineSubtotal ?? 0,
      is_taxable: item.isTaxable,
      sort_order: idx,
    }))
  );

  await insforge.database.from("quotation_history").insert([
    {
      quotation_id: quotationId,
      business_id: context.business.id,
      actor_id: user.id,
      action: existing.status !== data.status ? "status_changed" : "updated",
      previous_status: existing.status,
      new_status: data.status,
      notes: "Quotation updated.",
    },
  ]);

  revalidatePath("/dashboard/quotations");
  revalidatePath(`/dashboard/quotations/${quotationId}`);
  return { ok: true };
}

export async function markQuotationSentAction(
  quotationId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) return { ok: false, error: "Unauthorized" };

  const insforge = await createInsForgeServerClient();
  const { data: existing } = await insforge.database
    .from("quotations")
    .select("id, status")
    .eq("id", quotationId)
    .eq("business_id", context.business.id)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Quotation not found." };

  const nextStatus: QuotationStatus =
    existing.status === "draft" ? "sent" : (existing.status as QuotationStatus);

  await insforge.database
    .from("quotations")
    .update({ status: nextStatus })
    .eq("id", quotationId)
    .eq("business_id", context.business.id);

  await insforge.database.from("quotation_history").insert([
    {
      quotation_id: quotationId,
      business_id: context.business.id,
      actor_id: user.id,
      action: "shared_link_activated",
      previous_status: existing.status,
      new_status: nextStatus,
      notes: "Public customer link shared.",
    },
  ]);

  revalidatePath("/dashboard/quotations");
  revalidatePath(`/dashboard/quotations/${quotationId}`);
  return { ok: true };
}

export async function duplicateQuotationAction(quotationId: string): Promise<{
  ok: boolean;
  error?: string;
  newQuotationId?: string;
}> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) return { ok: false, error: "Unauthorized" };

  const insforge = await createInsForgeServerClient();
  const [{ data: source }, { data: items }] = await Promise.all([
    insforge.database
      .from("quotations")
      .select("*")
      .eq("id", quotationId)
      .eq("business_id", context.business.id)
      .maybeSingle(),
    insforge.database
      .from("quotation_items")
      .select("*")
      .eq("quotation_id", quotationId)
      .eq("business_id", context.business.id)
      .order("sort_order", { ascending: true }),
  ]);

  if (!source) return { ok: false, error: "Quotation not found." };

  const prefix = context.settings?.document_prefix ?? "QVN";
  const newNumber = `${prefix}-QUO-${String(Date.now()).slice(-6)}`;
  const today = new Date().toISOString().slice(0, 10);

  const { data: cloned, error } = await insforge.database
    .from("quotations")
    .insert([
      {
        business_id: context.business.id,
        created_by: user.id,
        quotation_number: newNumber,
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
        issue_date: today,
        expiry_date: source.expiry_date,
        business_snapshot: buildBusinessSnapshot(context),
      },
    ])
    .select("id")
    .single();

  if (error || !cloned) {
    return { ok: false, error: error?.message ?? "Could not duplicate." };
  }

  if (items && items.length > 0) {
    await insforge.database.from("quotation_items").insert(
      items.map((item) => ({
        quotation_id: cloned.id,
        business_id: context.business.id,
        name: item.name,
        description: item.description,
        category: item.category,
        pricing_method: item.pricing_method,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        line_total: item.line_total,
        is_taxable: item.is_taxable,
        sort_order: item.sort_order,
      }))
    );
  }

  await insforge.database.from("quotation_history").insert([
    {
      quotation_id: cloned.id,
      business_id: context.business.id,
      actor_id: user.id,
      action: "duplicated",
      new_status: "draft",
      notes: `Duplicated from ${source.quotation_number}`,
    },
  ]);

  revalidatePath("/dashboard/quotations");
  return { ok: true, newQuotationId: cloned.id };
}

export async function deleteQuotationDraftAction(
  quotationId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) return { ok: false, error: "Unauthorized" };

  const insforge = await createInsForgeServerClient();
  const { error } = await insforge.database
    .from("quotations")
    .delete()
    .eq("id", quotationId)
    .eq("business_id", context.business.id)
    .eq("status", "draft");

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/quotations");
  return { ok: true };
}

