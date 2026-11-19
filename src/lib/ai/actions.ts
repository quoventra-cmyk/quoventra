"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  generateAICompletion,
  getConfiguredAIProvider,
} from "@/lib/ai/providers";
import {
  aiEstimateOutputSchema,
  aiEstimateRequestSchema,
  buildEstimateSystemPrompt,
  type AIEstimateOutput,
  type AIEstimateRequest,
} from "@/lib/ai/schema";
import { getActiveBusinessContext, requireAuthUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";
import {
  calculateDocumentPricing,
  type DocumentPricingSummary,
} from "@/lib/pricing/engine";
import { getBusinessEntitlements } from "@/services/subscriptions/entitlements";

export interface GenerateEstimateResult {
  ok: boolean;
  error?: string;
  generationId?: string;
  provider?: string;
  model?: string;
  draft?: AIEstimateOutput;
  pricing?: DocumentPricingSummary;
}

const saveLineItemSchema = z.object({
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

const saveEstimateDraftSchema = z.object({
  title: z.string().trim().min(2, "Project title is required.").max(200),
  description: z.string().trim().max(4000).optional(),
  customerName: z.string().trim().max(150).optional(),
  notes: z.string().trim().max(2000).optional(),
  assumptions: z.array(z.string()).default([]),
  missingInformation: z.array(z.string()).default([]),
  aiGenerationId: z.string().uuid().optional().nullable(),
  taxRateOverridePercent: z.coerce.number().min(0).max(100).optional().nullable(),
  discountType: z.enum(["none", "percent", "fixed"]).default("none"),
  discountValue: z.coerce.number().min(0).default(0),
  items: z.array(saveLineItemSchema).min(1, "Add at least one line item."),
});

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(candidate);
}

export async function generateAIEstimateAction(
  input: AIEstimateRequest
): Promise<GenerateEstimateResult> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    return { ok: false, error: "Complete business onboarding first." };
  }

  const parsedInput = aiEstimateRequestSchema.safeParse(input);
  if (!parsedInput.success) {
    return {
      ok: false,
      error:
        parsedInput.error.issues[0]?.message ?? "Invalid project details.",
    };
  }

  const providerInfo = getConfiguredAIProvider();
  if (!providerInfo.configured) {
    const keyName =
      providerInfo.provider === "openrouter"
        ? "OPENROUTER_API_KEY"
        : providerInfo.provider === "anthropic"
          ? "ANTHROPIC_API_KEY"
          : "OPENAI_API_KEY";
    return {
      ok: false,
      error: `AI provider (${providerInfo.provider}) is not configured. Add ${keyName} to .env.local to enable live AI estimate generation.`,
    };
  }

  const entitlements = await getBusinessEntitlements(context.business.id);
  if (!entitlements.canUseAI) {
    return {
      ok: false,
      error: `Monthly AI generation limit (${entitlements.limits.monthlyAI}) reached on your ${entitlements.planName} plan. Upgrade in Subscription & Billing to continue.`,
    };
  }

  const insforge = await createInsForgeServerClient();

  // Check business monthly AI limit
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [{ data: aiSettings }, { data: usageRows }] = await Promise.all([
    insforge.database
      .from("ai_provider_settings")
      .select("monthly_request_limit, is_enabled")
      .eq("business_id", context.business.id)
      .maybeSingle(),
    insforge.database
      .from("ai_usage_records")
      .select("id")
      .eq("business_id", context.business.id)
      .gte("created_at", monthStart.toISOString()),
  ]);

  if (aiSettings && aiSettings.is_enabled === false) {
    return {
      ok: false,
      error: "AI generation is currently disabled for this business.",
    };
  }

  const monthlyLimit = aiSettings?.monthly_request_limit ?? 50;
  const usedThisMonth = usageRows?.length ?? 0;
  if (usedThisMonth >= monthlyLimit) {
    return {
      ok: false,
      error: `Monthly AI generation limit (${monthlyLimit}) reached for this business.`,
    };
  }

  // Load saved catalog & pricing rules so AI uses real business rates
  const [{ data: catalog }, { data: rules }] = await Promise.all([
    insforge.database
      .from("products_services")
      .select("name, description, unit_type, pricing_method, default_price, is_taxable")
      .eq("business_id", context.business.id)
      .eq("is_active", true)
      .limit(50),
    insforge.database
      .from("pricing_rules")
      .select("name, pricing_method, unit_type, base_fee, unit_rate, min_charge, markup_percent, is_taxable")
      .eq("business_id", context.business.id)
      .eq("is_active", true)
      .limit(30),
  ]);

  const userPrompt = JSON.stringify(
    {
      business: {
        name: context.business.name,
        currency: context.business.currency,
        industry: parsedInput.data.industryName,
      },
      saved_catalog: catalog ?? [],
      saved_pricing_rules: rules ?? [],
      project: {
        description: parsedInput.data.projectDescription,
        customer_name: parsedInput.data.customerName || null,
        location: parsedInput.data.projectLocation || null,
        measurements: parsedInput.data.measurements || null,
        labour_details: parsedInput.data.labourDetails || null,
        materials_details: parsedInput.data.materialsDetails || null,
        requirements: parsedInput.data.requirements || null,
      },
    },
    null,
    2
  );

  try {
    const completion = await generateAICompletion({
      systemPrompt: buildEstimateSystemPrompt(),
      userPrompt,
    });

    const parsedJson = extractJsonObject(completion.content);
    const validated = aiEstimateOutputSchema.safeParse(parsedJson);

    if (!validated.success) {
      await insforge.database.from("ai_generation_history").insert([
        {
          business_id: context.business.id,
          user_id: user.id,
          provider: completion.provider,
          model: completion.model,
          prompt: parsedInput.data.projectDescription,
          input_context: parsedInput.data,
          raw_output: completion.content,
          status: "failed",
          error_message: "AI output failed strict JSON schema validation.",
        },
      ]);

      return {
        ok: false,
        error:
          "AI returned an invalid estimate format. Please refine your description and try again.",
      };
    }

    const draft = validated.data;

    // Backend pricing engine calculates totals (never the AI)
    const defaultTaxRate = Number(context.settings?.default_tax_rate ?? 0);
    const pricing = calculateDocumentPricing({
      items: draft.line_items.map((item) => ({
        name: item.name,
        category: item.category,
        pricingMethod: item.pricing_method,
        quantity: item.quantity ?? 0,
        unitPrice: item.unit_price ?? 0,
        isTaxable: item.is_taxable,
      })),
      defaultTaxRate,
    });

    const { data: historyRow } = await insforge.database
      .from("ai_generation_history")
      .insert([
        {
          business_id: context.business.id,
          user_id: user.id,
          provider: completion.provider,
          model: completion.model,
          prompt: parsedInput.data.projectDescription,
          input_context: parsedInput.data,
          raw_output: completion.content,
          structured_output: draft,
          status: "success",
        },
      ])
      .select("id")
      .single();

    await insforge.database.from("ai_usage_records").insert([
      {
        business_id: context.business.id,
        user_id: user.id,
        generation_id: historyRow?.id ?? null,
        provider: completion.provider,
        model: completion.model,
        prompt_tokens: completion.promptTokens,
        completion_tokens: completion.completionTokens,
        total_tokens: completion.totalTokens,
      },
    ]);

    revalidatePath("/dashboard/ai-estimate");

    return {
      ok: true,
      generationId: historyRow?.id,
      provider: completion.provider,
      model: completion.model,
      draft,
      pricing,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "AI generation failed unexpectedly.";

    await insforge.database.from("ai_generation_history").insert([
      {
        business_id: context.business.id,
        user_id: user.id,
        provider: providerInfo.provider,
        model: providerInfo.model,
        prompt: parsedInput.data.projectDescription,
        input_context: parsedInput.data,
        status: "failed",
        error_message: message,
      },
    ]);

    return { ok: false, error: message };
  }
}

export async function saveAIEstimateDraftAction(
  input: z.infer<typeof saveEstimateDraftSchema>
): Promise<{
  ok: boolean;
  error?: string;
  estimateId?: string;
  estimateNumber?: string;
}> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    return { ok: false, error: "Complete business onboarding first." };
  }

  const parsed = saveEstimateDraftSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid estimate data.",
    };
  }

  const defaultTaxRate = Number(context.settings?.default_tax_rate ?? 0);
  const overrideDecimal =
    parsed.data.taxRateOverridePercent != null
      ? parsed.data.taxRateOverridePercent / 100
      : null;
  const effectiveTaxRate = overrideDecimal ?? defaultTaxRate;

  const pricing = calculateDocumentPricing({
    items: parsed.data.items.map((item) => ({
      name: item.name,
      category: item.category,
      pricingMethod: item.pricingMethod,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      isTaxable: item.isTaxable,
    })),
    discountType: parsed.data.discountType,
    discountValue: parsed.data.discountValue,
    defaultTaxRate,
    documentTaxRateOverride: overrideDecimal,
  });

  const prefix = context.settings?.document_prefix ?? "QVN";
  const timestampSuffix = String(Date.now()).slice(-6);
  const estimateNumber = `${prefix}-EST-${timestampSuffix}`;

  const expiryDays = context.settings?.default_expiry_days ?? 14;
  const expiryDate = new Date();
  expiryDate.setUTCDate(expiryDate.getUTCDate() + expiryDays);

  const entitlements = await getBusinessEntitlements(context.business.id);
  if (!entitlements.canUseAI) {
    return {
      ok: false,
      error: `Monthly AI generation limit (${entitlements.limits.monthlyAI}) reached on your ${entitlements.planName} plan. Upgrade in Subscription & Billing to continue.`,
    };
  }

  const insforge = await createInsForgeServerClient();

  const { data: estimateRow, error: estErr } = await insforge.database
    .from("estimates")
    .insert([
      {
        business_id: context.business.id,
        created_by: user.id,
        estimate_number: estimateNumber,
        customer_name: parsed.data.customerName || null,
        title: parsed.data.title,
        description: parsed.data.description || null,
        status: "draft",
        currency: context.business.currency,
        subtotal: pricing.subtotal,
        tax_rate: effectiveTaxRate,
        tax_amount: pricing.taxTotal,
        discount_type: parsed.data.discountType,
        discount_value: parsed.data.discountValue,
        discount_amount: pricing.discountAmount,
        total: pricing.total,
        notes: parsed.data.notes || null,
        terms: context.settings?.default_payment_terms ?? null,
        assumptions: parsed.data.assumptions,
        missing_information: parsed.data.missingInformation,
        ai_generation_id: parsed.data.aiGenerationId ?? null,
        expiry_date: expiryDate.toISOString().slice(0, 10),
        business_snapshot: {
          name: context.business.name,
          email: context.business.email,
          phone: context.business.phone,
          website: context.business.website,
          address: context.business.address,
          city: context.business.city,
          region: context.business.region,
          country: context.business.country,
          postal_code: context.business.postal_code,
          logo_url: context.business.logo_url,
          tax_registration_number: context.business.tax_registration_number,
          brand_color: context.settings?.brand_color ?? "#2563eb",
        },
      },
    ])
    .select("id, estimate_number")
    .single();

  if (estErr || !estimateRow) {
    return {
      ok: false,
      error: estErr?.message ?? "Could not save estimate draft.",
    };
  }

  const itemRows = parsed.data.items.map((item, idx) => ({
    estimate_id: estimateRow.id,
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
    return {
      ok: false,
      error: itemsErr.message ?? "Saved estimate header, but failed to save line items.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/ai-estimate");
  return {
    ok: true,
    estimateId: estimateRow.id,
    estimateNumber: estimateRow.estimate_number,
  };
}

