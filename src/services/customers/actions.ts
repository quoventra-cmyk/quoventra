"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveBusinessContext, requireAuthUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";
import { getBusinessEntitlements } from "@/services/subscriptions/entitlements";

const customerSchema = z.object({
  customerType: z.enum(["individual", "business"]).default("individual"),
  name: z.string().trim().min(2, "Customer name is required.").max(150),
  companyName: z.string().trim().max(150).optional(),
  email: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || z.string().email().safeParse(v).success,
      "Invalid email address."
    ),
  phone: z.string().trim().max(50).optional(),
  address: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const noteSchema = z.object({
  content: z.string().trim().min(1, "Note cannot be empty.").max(2000),
});

const communicationSchema = z.object({
  channel: z.enum(["email", "phone", "meeting", "note", "other"]),
  subject: z.string().trim().min(2, "Subject is required.").max(200),
  summary: z.string().trim().max(2000).optional(),
  occurredAt: z.string().trim().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export async function createCustomerAction(
  input: CustomerInput
): Promise<{ ok: boolean; error?: string; customerId?: string }> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    return { ok: false, error: "Complete business onboarding first." };
  }

  const entitlements = await getBusinessEntitlements(context.business.id);
  if (!entitlements.canAddCustomer) {
    return {
      ok: false,
      error: `Customer limit (${entitlements.limits.customers}) reached on your ${entitlements.planName} plan. Upgrade in Subscription & Billing to add more customers.`,
    };
  }

  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid customer details.",
    };
  }

  const insforge = await createInsForgeServerClient();
  const { data, error } = await insforge.database
    .from("customers")
    .insert([
      {
        business_id: context.business.id,
        customer_type: parsed.data.customerType,
        name: parsed.data.name,
        company_name: parsed.data.companyName || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        notes: parsed.data.notes || null,
      },
    ])
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to create customer." };
  }

  revalidatePath("/dashboard/customers");
  return { ok: true, customerId: data.id };
}

export async function updateCustomerAction(
  customerId: string,
  input: CustomerInput
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) return { ok: false, error: "Unauthorized" };

  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid customer details.",
    };
  }

  const insforge = await createInsForgeServerClient();
  const { error } = await insforge.database
    .from("customers")
    .update({
      customer_type: parsed.data.customerType,
      name: parsed.data.name,
      company_name: parsed.data.companyName || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", customerId)
    .eq("business_id", context.business.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${customerId}`);
  return { ok: true };
}

export async function deleteCustomerAction(
  customerId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) return { ok: false, error: "Unauthorized" };

  const insforge = await createInsForgeServerClient();

  // Document-retention check before deleting
  const [{ data: est }, { data: quo }, { data: inv }] = await Promise.all([
    insforge.database
      .from("estimates")
      .select("id")
      .eq("business_id", context.business.id)
      .eq("customer_id", customerId)
      .limit(1),
    insforge.database
      .from("quotations")
      .select("id")
      .eq("business_id", context.business.id)
      .eq("customer_id", customerId)
      .limit(1),
    insforge.database
      .from("invoices")
      .select("id")
      .eq("business_id", context.business.id)
      .eq("customer_id", customerId)
      .limit(1),
  ]);

  if ((est?.length ?? 0) > 0 || (quo?.length ?? 0) > 0 || (inv?.length ?? 0) > 0) {
    return {
      ok: false,
      error:
        "Cannot delete this customer because they have linked estimates, quotations, or invoices (document retention policy).",
    };
  }

  const { error } = await insforge.database
    .from("customers")
    .delete()
    .eq("id", customerId)
    .eq("business_id", context.business.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/customers");
  return { ok: true };
}

export async function addCustomerNoteAction(
  customerId: string,
  content: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) return { ok: false, error: "Unauthorized" };

  const parsed = noteSchema.safeParse({ content });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid note.",
    };
  }

  const insforge = await createInsForgeServerClient();
  const { error } = await insforge.database.from("customer_notes").insert([
    {
      customer_id: customerId,
      business_id: context.business.id,
      author_id: user.id,
      content: parsed.data.content,
    },
  ]);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/customers/${customerId}`);
  return { ok: true };
}

export async function deleteCustomerNoteAction(
  customerId: string,
  noteId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) return { ok: false, error: "Unauthorized" };

  const insforge = await createInsForgeServerClient();
  const { error } = await insforge.database
    .from("customer_notes")
    .delete()
    .eq("id", noteId)
    .eq("customer_id", customerId)
    .eq("business_id", context.business.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/customers/${customerId}`);
  return { ok: true };
}

export async function logCustomerCommunicationAction(
  customerId: string,
  input: z.infer<typeof communicationSchema>
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) return { ok: false, error: "Unauthorized" };

  const parsed = communicationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid communication log.",
    };
  }

  const insforge = await createInsForgeServerClient();
  const { error } = await insforge.database
    .from("customer_communications")
    .insert([
      {
        customer_id: customerId,
        business_id: context.business.id,
        logged_by: user.id,
        channel: parsed.data.channel,
        subject: parsed.data.subject,
        summary: parsed.data.summary || null,
        occurred_at: parsed.data.occurredAt || new Date().toISOString(),
      },
    ]);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/customers/${customerId}`);
  return { ok: true };
}

