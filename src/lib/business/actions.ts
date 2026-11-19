"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ensureUserProfile,
  getActiveBusinessContext,
  requireAuthUser,
} from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";

const businessOnboardingSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is required."),
  ownerName: z.string().trim().min(2, "Owner name is required."),
  email: z.string().trim().email("Enter a valid business email."),
  phone: z.string().trim().min(5, "Phone number is required."),
  website: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || /^https?:\/\/.+/.test(val),
      "Website must start with http:// or https://"
    ),
  address: z.string().trim().min(3, "Business address is required."),
  city: z.string().trim().optional(),
  region: z.string().trim().optional(),
  country: z.string().trim().min(2, "Country is required."),
  postalCode: z.string().trim().optional(),
  currency: z.string().trim().length(3, "Select a 3-letter currency code."),
  industryId: z.string().uuid("Please select an industry."),
  description: z.string().trim().min(5, "Describe what your business does."),
  taxRegistrationNumber: z.string().trim().optional(),
  logoUrl: z.string().trim().optional().nullable(),
  logoKey: z.string().trim().optional().nullable(),
});

const businessSettingsSchema = z.object({
  defaultTaxRate: z.coerce.number().min(0).max(1),
  documentPrefix: z
    .string()
    .trim()
    .min(2)
    .max(10)
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers, or hyphens only."),
  defaultPaymentTerms: z.string().trim().min(2).max(200),
  defaultExpiryDays: z.coerce.number().int().min(1).max(365),
});

function slugifyBusinessName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "business"}-${suffix}`;
}

export interface BusinessActionResult {
  ok: boolean;
  error?: string;
}

export async function createBusinessAction(
  input: z.infer<typeof businessOnboardingSchema>
): Promise<BusinessActionResult> {
  const user = await requireAuthUser();
  const parsed = businessOnboardingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check your business details.",
    };
  }

  await ensureUserProfile({
    ...user,
    name: parsed.data.ownerName,
  });

  const insforge = await createInsForgeServerClient();

  // Update profile full_name to match ownerName
  await insforge.database
    .from("profiles")
    .update({ full_name: parsed.data.ownerName })
    .eq("id", user.id);

  const existingContext = await getActiveBusinessContext(user.id);
  if (existingContext) {
    return {
      ok: false,
      error: "A business workspace already exists for this account.",
    };
  }

  const { error } = await insforge.database.from("businesses").insert([
    {
      owner_id: user.id,
      name: parsed.data.businessName,
      slug: slugifyBusinessName(parsed.data.businessName),
      industry_id: parsed.data.industryId,
      description: parsed.data.description,
      email: parsed.data.email,
      phone: parsed.data.phone,
      website: parsed.data.website || null,
      address: parsed.data.address,
      city: parsed.data.city || null,
      region: parsed.data.region || null,
      country: parsed.data.country,
      postal_code: parsed.data.postalCode || null,
      currency: parsed.data.currency.toUpperCase(),
      logo_url: parsed.data.logoUrl || null,
      logo_key: parsed.data.logoKey || null,
      tax_registration_number: parsed.data.taxRegistrationNumber || null,
    },
  ]);

  if (error) {
    return {
      ok: false,
      error: error.message ?? "Could not create business workspace.",
    };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateBusinessProfileAction(input: {
  business: z.infer<typeof businessOnboardingSchema>;
  settings: z.infer<typeof businessSettingsSchema>;
}): Promise<BusinessActionResult> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    return { ok: false, error: "Business workspace not found." };
  }

  const parsedBiz = businessOnboardingSchema.safeParse(input.business);
  if (!parsedBiz.success) {
    return {
      ok: false,
      error: parsedBiz.error.issues[0]?.message ?? "Invalid business details.",
    };
  }

  const parsedSettings = businessSettingsSchema.safeParse(input.settings);
  if (!parsedSettings.success) {
    return {
      ok: false,
      error:
        parsedSettings.error.issues[0]?.message ?? "Invalid settings values.",
    };
  }

  const insforge = await createInsForgeServerClient();

  const { error: bizErr } = await insforge.database
    .from("businesses")
    .update({
      name: parsedBiz.data.businessName,
      industry_id: parsedBiz.data.industryId,
      description: parsedBiz.data.description,
      email: parsedBiz.data.email,
      phone: parsedBiz.data.phone,
      website: parsedBiz.data.website || null,
      address: parsedBiz.data.address,
      city: parsedBiz.data.city || null,
      region: parsedBiz.data.region || null,
      country: parsedBiz.data.country,
      postal_code: parsedBiz.data.postalCode || null,
      currency: parsedBiz.data.currency.toUpperCase(),
      logo_url: parsedBiz.data.logoUrl || null,
      logo_key: parsedBiz.data.logoKey || null,
      tax_registration_number: parsedBiz.data.taxRegistrationNumber || null,
    })
    .eq("id", context.business.id);

  if (bizErr) {
    return {
      ok: false,
      error: bizErr.message ?? "Failed to update business profile.",
    };
  }

  const { error: settingsErr } = await insforge.database
    .from("business_settings")
    .update({
      default_currency: parsedBiz.data.currency.toUpperCase(),
      default_tax_rate: parsedSettings.data.defaultTaxRate,
      document_prefix: parsedSettings.data.documentPrefix.toUpperCase(),
      default_payment_terms: parsedSettings.data.defaultPaymentTerms,
      default_expiry_days: parsedSettings.data.defaultExpiryDays,
    })
    .eq("business_id", context.business.id);

  if (settingsErr) {
    return {
      ok: false,
      error: settingsErr.message ?? "Failed to update business settings.",
    };
  }

  await insforge.database
    .from("profiles")
    .update({ full_name: parsedBiz.data.ownerName })
    .eq("id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  return { ok: true };
}

