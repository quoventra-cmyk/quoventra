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

const invoiceItemSchema = z.object({
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

const invoicePayloadSchema = z.object({
  title: z.string().trim().min(2, "Invoice title is required.").max(200),
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
      "partially_paid",
      "paid",
      "overdue",
      "cancelled",
    ])
    .default("draft"),
  taxRatePercent: z.coerce.number().min(0).max(100),
  discountType: z.enum(["none", "percent", "fixed"]).default("none"),
  discountValue: z.coerce.number().min(0).default(0),
  paymentInstructions: z.string().trim().max(2000).optional(),
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
  logoUrl: z.string().trim().max(500000).optional(),
  issueDate: z.string().trim().min(8),
  dueDate: z.string().trim().optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, "Add at least one line item."),
});

const paymentSchema = z.object({
  amount: z.coerce.number().positive("Payment amount must be greater than 0."),
  paymentMethod: z.string().trim().min(2).max(60),
  reference: z.string().trim().max(120).optional(),
  paymentDate: z.string().trim().min(8),
  notes: z.string().trim().max(500).optional(),
});

export type InvoicePayloadInput = z.infer<typeof invoicePayloadSchema>;

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

export async function convertQuotationToInvoiceAction(
  quotationId: string
): Promise<{ ok: boolean; error?: string; invoiceId?: string }> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    return { ok: false, error: "Complete business onboarding first." };
  }

  const insforge = await createInsForgeServerClient();
  const [{ data: quotation }, { data: items }] = await Promise.all([
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

  if (!quotation) {
    return { ok: false, error: "Quotation not found." };
  }

  if (quotation.status !== "approved") {
    return {
      ok: false,
      error: "Only approved quotations can be converted into an invoice.",
    };
  }

  const prefix = context.settings?.document_prefix ?? "QVN";
  const invoiceNumber = `${prefix}-INV-${String(Date.now()).slice(-6)}`;
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date();
  due.setUTCDate(due.getUTCDate() + 14);

  const snapshot =
    quotation.business_snapshot &&
    Object.keys(quotation.business_snapshot as Record<string, unknown>).length >
      0
      ? quotation.business_snapshot
      : buildBusinessSnapshot(context);

  const totalAmount = Number(quotation.total);

  // Never mark invoice paid automatically on quotation approval
  const { data: invoice, error: invErr } = await insforge.database
    .from("invoices")
    .insert([
      {
        business_id: context.business.id,
        quotation_id: quotation.id,
        customer_id: quotation.customer_id ?? null,
        created_by: user.id,
        invoice_number: invoiceNumber,
        customer_name: quotation.customer_name,
        customer_email: quotation.customer_email,
        customer_phone: quotation.customer_phone,
        customer_address: quotation.customer_address,
        title: quotation.title,
        description: quotation.description,
        status: "draft",
        currency: quotation.currency,
        subtotal: quotation.subtotal,
        tax_rate: quotation.tax_rate,
        tax_amount: quotation.tax_amount,
        discount_type: quotation.discount_type,
        discount_value: quotation.discount_value,
        discount_amount: quotation.discount_amount,
        total: totalAmount,
        amount_paid: 0,
        balance_due: totalAmount,
        issue_date: today,
        due_date: due.toISOString().slice(0, 10),
        terms: quotation.terms ?? context.settings?.default_payment_terms ?? null,
        notes: quotation.notes,
        business_snapshot: snapshot,
      },
    ])
    .select("id")
    .single();

  if (invErr || !invoice) {
    return {
      ok: false,
      error: invErr?.message ?? "Failed to convert quotation to invoice.",
    };
  }

  if (items && items.length > 0) {
    await insforge.database.from("invoice_items").insert(
      items.map((item) => ({
        invoice_id: invoice.id,
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
      .from("quotations")
      .update({ status: "converted" })
      .eq("id", quotation.id)
      .eq("business_id", context.business.id),
    insforge.database.from("quotation_history").insert([
      {
        quotation_id: quotation.id,
        business_id: context.business.id,
        actor_id: user.id,
        action: "converted_to_invoice",
        previous_status: quotation.status,
        new_status: "converted",
        notes: `Converted to ${invoiceNumber}`,
      },
    ]),
    insforge.database.from("invoice_history").insert([
      {
        invoice_id: invoice.id,
        business_id: context.business.id,
        actor_id: user.id,
        action: "created_from_quotation",
        new_status: "draft",
        notes: `Converted from ${quotation.quotation_number}`,
      },
    ]),
  ]);

  revalidatePath("/dashboard/quotations");
  revalidatePath(`/dashboard/quotations/${quotationId}`);
  revalidatePath("/dashboard/invoices");
  return { ok: true, invoiceId: invoice.id };
}

export async function createManualInvoiceAction(
  input: InvoicePayloadInput
): Promise<{ ok: boolean; error?: string; invoiceId?: string }> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    return { ok: false, error: "Complete business onboarding first." };
  }

  const parsed = invoicePayloadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid invoice data.",
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
  const invoiceNumber = `${prefix}-INV-${String(Date.now()).slice(-6)}`;

  const insforge = await createInsForgeServerClient();
  const { data: created, error: insertErr } = await insforge.database
    .from("invoices")
    .insert([
      {
        business_id: context.business.id,
        created_by: user.id,
        invoice_number: invoiceNumber,
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
        amount_paid: 0,
        balance_due: pricing.total,
        issue_date: data.issueDate,
        due_date: data.dueDate || null,
        payment_instructions: data.paymentInstructions || null,
        notes: data.notes || null,
        terms: data.terms || context.settings?.default_payment_terms || null,
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
      error: insertErr?.message ?? "Failed to create invoice.",
    };
  }

  await insforge.database.from("invoice_items").insert(
    data.items.map((item, idx) => ({
      invoice_id: created.id,
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

  await insforge.database.from("invoice_history").insert([
    {
      invoice_id: created.id,
      business_id: context.business.id,
      actor_id: user.id,
      action: "created",
      new_status: data.status,
      notes: "Invoice created manually.",
    },
  ]);

  revalidatePath("/dashboard/invoices");
  return { ok: true, invoiceId: created.id };
}

export async function updateInvoiceAction(
  invoiceId: string,
  input: InvoicePayloadInput
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    return { ok: false, error: "Complete business onboarding first." };
  }

  const parsed = invoicePayloadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid invoice data.",
    };
  }

  const insforge = await createInsForgeServerClient();
  const { data: existing } = await insforge.database
    .from("invoices")
    .select("id, status, amount_paid, business_snapshot")
    .eq("id", invoiceId)
    .eq("business_id", context.business.id)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "Invoice not found." };
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

  const paidCents = Math.round(Number(existing.amount_paid) * 100);
  const totalCents = Math.round(pricing.total * 100);
  const balanceDue = Math.max(0, totalCents - paidCents) / 100;

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
    .from("invoices")
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
      balance_due: balanceDue,
      issue_date: data.issueDate,
      due_date: data.dueDate || null,
      payment_instructions: data.paymentInstructions || null,
      notes: data.notes || null,
      terms: data.terms || null,
      business_snapshot: nextSnapshot,
    })
    .eq("id", invoiceId)
    .eq("business_id", context.business.id);

  if (updateErr) return { ok: false, error: updateErr.message };

  await insforge.database
    .from("invoice_items")
    .delete()
    .eq("invoice_id", invoiceId)
    .eq("business_id", context.business.id);

  await insforge.database.from("invoice_items").insert(
    data.items.map((item, idx) => ({
      invoice_id: invoiceId,
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

  await insforge.database.from("invoice_history").insert([
    {
      invoice_id: invoiceId,
      business_id: context.business.id,
      actor_id: user.id,
      action: existing.status !== data.status ? "status_changed" : "updated",
      previous_status: existing.status,
      new_status: data.status,
      notes: "Invoice updated.",
    },
  ]);

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  return { ok: true };
}

export async function recordInvoicePaymentAction(
  invoiceId: string,
  input: z.infer<typeof paymentSchema>
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) return { ok: false, error: "Unauthorized" };

  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid payment details.",
    };
  }

  const insforge = await createInsForgeServerClient();
  const { data: invoice } = await insforge.database
    .from("invoices")
    .select("id, status, total, amount_paid, balance_due")
    .eq("id", invoiceId)
    .eq("business_id", context.business.id)
    .maybeSingle();

  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (invoice.status === "cancelled") {
    return { ok: false, error: "Cannot record payment on a cancelled invoice." };
  }

  const { error: payErr } = await insforge.database
    .from("invoice_payments")
    .insert([
      {
        invoice_id: invoiceId,
        business_id: context.business.id,
        recorded_by: user.id,
        amount: parsed.data.amount,
        payment_method: parsed.data.paymentMethod,
        reference: parsed.data.reference || null,
        payment_date: parsed.data.paymentDate,
        notes: parsed.data.notes || null,
      },
    ]);

  if (payErr) return { ok: false, error: payErr.message };

  // Recalculate total paid from all payment rows in integer cents
  const { data: allPayments } = await insforge.database
    .from("invoice_payments")
    .select("amount")
    .eq("invoice_id", invoiceId)
    .eq("business_id", context.business.id);

  const paidCents = (allPayments ?? []).reduce(
    (sum, p) => sum + Math.round(Number(p.amount) * 100),
    0
  );
  const totalCents = Math.round(Number(invoice.total) * 100);
  const balanceCents = Math.max(0, totalCents - paidCents);

  const newStatus =
    balanceCents === 0 ? "paid" : paidCents > 0 ? "partially_paid" : invoice.status;

  await insforge.database
    .from("invoices")
    .update({
      amount_paid: paidCents / 100,
      balance_due: balanceCents / 100,
      status: newStatus,
    })
    .eq("id", invoiceId)
    .eq("business_id", context.business.id);

  await insforge.database.from("invoice_history").insert([
    {
      invoice_id: invoiceId,
      business_id: context.business.id,
      actor_id: user.id,
      action: "payment_recorded",
      previous_status: invoice.status,
      new_status: newStatus,
      notes: `Recorded payment of ${parsed.data.amount.toFixed(2)} via ${parsed.data.paymentMethod}`,
    },
  ]);

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  return { ok: true };
}

export async function deleteInvoiceDraftAction(
  invoiceId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) return { ok: false, error: "Unauthorized" };

  const insforge = await createInsForgeServerClient();
  const { error } = await insforge.database
    .from("invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("business_id", context.business.id)
    .eq("status", "draft");

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/invoices");
  return { ok: true };
}

