"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveBusinessContext, requireAuthUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";
import { getBusinessEntitlements } from "@/services/subscriptions/entitlements";
import { sendEmailViaResend } from "@/lib/email/resend";
import {
  DEFAULT_EMAIL_TEMPLATES,
  renderTemplateString,
  textToSimpleHtml,
  type EmailTemplateKey,
} from "@/lib/email/templates";

const settingsSchema = z.object({
  autoQuotationReminders: z.boolean(),
  quotationReminderDays: z.coerce.number().int().min(1).max(60),
  autoInvoiceDueReminders: z.boolean(),
  invoiceReminderDays: z.coerce.number().int().min(1).max(60),
  autoExpiryNotifications: z.boolean(),
  autoFollowUpReminders: z.boolean(),
  respectEmailConsent: z.boolean(),
});

const templateSchema = z.object({
  templateKey: z.enum([
    "estimate_sent",
    "quotation_sent",
    "quotation_approved",
    "quotation_rejected",
    "invoice_sent",
    "payment_recorded",
    "invoice_reminder",
  ]),
  subject: z.string().trim().min(2, "Subject is required.").max(200),
  bodyText: z.string().trim().min(5, "Body is required.").max(5000),
  isActive: z.boolean(),
});

export async function updateNotificationSettingsAction(
  input: z.infer<typeof settingsSchema>
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) return { ok: false, error: "Unauthorized" };

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid settings.",
    };
  }

  const wantsAutomation =
    parsed.data.autoQuotationReminders ||
    parsed.data.autoInvoiceDueReminders ||
    parsed.data.autoExpiryNotifications ||
    parsed.data.autoFollowUpReminders;

  if (wantsAutomation) {
    const entitlements = await getBusinessEntitlements(context.business.id);
    if (!entitlements.allowAutomation) {
      return {
        ok: false,
        error:
          "Automated reminders require the Business plan. Upgrade in Subscription to enable automation.",
      };
    }
  }

  const insforge = await createInsForgeServerClient();
  const { data: existing } = await insforge.database
    .from("notification_settings")
    .select("id")
    .eq("business_id", context.business.id)
    .maybeSingle();

  const payload = {
    business_id: context.business.id,
    auto_quotation_reminders: parsed.data.autoQuotationReminders,
    quotation_reminder_days: parsed.data.quotationReminderDays,
    auto_invoice_due_reminders: parsed.data.autoInvoiceDueReminders,
    invoice_reminder_days: parsed.data.invoiceReminderDays,
    auto_expiry_notifications: parsed.data.autoExpiryNotifications,
    auto_follow_up_reminders: parsed.data.autoFollowUpReminders,
    respect_email_consent: parsed.data.respectEmailConsent,
  };

  const { error } = existing
    ? await insforge.database
        .from("notification_settings")
        .update(payload)
        .eq("business_id", context.business.id)
    : await insforge.database.from("notification_settings").insert([payload]);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/notifications");
  return { ok: true };
}

export async function upsertEmailTemplateAction(
  input: z.infer<typeof templateSchema>
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) return { ok: false, error: "Unauthorized" };

  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid template.",
    };
  }

  const insforge = await createInsForgeServerClient();
  const { data: existing } = await insforge.database
    .from("email_templates")
    .select("id")
    .eq("business_id", context.business.id)
    .eq("template_key", parsed.data.templateKey)
    .maybeSingle();

  const { error } = existing
    ? await insforge.database
        .from("email_templates")
        .update({
          subject: parsed.data.subject,
          body_text: parsed.data.bodyText,
          is_active: parsed.data.isActive,
        })
        .eq("id", existing.id)
        .eq("business_id", context.business.id)
    : await insforge.database.from("email_templates").insert([
        {
          business_id: context.business.id,
          template_key: parsed.data.templateKey,
          subject: parsed.data.subject,
          body_text: parsed.data.bodyText,
          is_active: parsed.data.isActive,
        },
      ]);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/notifications");
  return { ok: true };
}

export async function sendDocumentEmailAction(input: {
  eventType: EmailTemplateKey;
  documentType: "estimate" | "quotation" | "invoice";
  documentId: string;
  recipientEmail: string;
  customerId?: string | null;
  variables: Record<string, string>;
  dedupKey?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) return { ok: false, error: "Unauthorized" };

  const emailCheck = z.string().trim().email().safeParse(input.recipientEmail);
  if (!emailCheck.success) {
    return {
      ok: false,
      error: "A valid customer email address is required to send.",
    };
  }

  const insforge = await createInsForgeServerClient();

  // Deduplication check
  if (input.dedupKey) {
    const { data: existingLog } = await insforge.database
      .from("notification_logs")
      .select("id")
      .eq("business_id", context.business.id)
      .eq("dedup_key", input.dedupKey)
      .maybeSingle();

    if (existingLog) {
      return {
        ok: false,
        error: "Duplicate notification prevented for this event.",
      };
    }
  }

  // Respect email consent if customer is linked
  const { data: settings } = await insforge.database
    .from("notification_settings")
    .select("respect_email_consent")
    .eq("business_id", context.business.id)
    .maybeSingle();

  const respectConsent = settings?.respect_email_consent ?? true;
  if (respectConsent && input.customerId) {
    const { data: customer } = await insforge.database
      .from("customers")
      .select("email_opt_out")
      .eq("id", input.customerId)
      .eq("business_id", context.business.id)
      .maybeSingle();

    if (customer?.email_opt_out) {
      await insforge.database.from("notification_logs").insert([
        {
          business_id: context.business.id,
          event_type: input.eventType,
          document_type: input.documentType,
          document_id: input.documentId,
          recipient_email: emailCheck.data,
          subject: input.eventType,
          status: "skipped",
          dedup_key: input.dedupKey ?? null,
          error_message: "Skipped because customer opted out of emails.",
        },
      ]);
      return {
        ok: false,
        error: "Customer has opted out of email notifications.",
      };
    }
  }

  // Load custom template or fallback to default
  const { data: customTemplate } = await insforge.database
    .from("email_templates")
    .select("subject, body_text, is_active")
    .eq("business_id", context.business.id)
    .eq("template_key", input.eventType)
    .maybeSingle();

  const fallback =
    DEFAULT_EMAIL_TEMPLATES.find((t) => t.key === input.eventType) ??
    DEFAULT_EMAIL_TEMPLATES[0];

  const subjectTpl = customTemplate?.subject ?? fallback.subject;
  const bodyTpl = customTemplate?.body_text ?? fallback.bodyText;

  const subject = renderTemplateString(subjectTpl, input.variables);
  const bodyText = renderTemplateString(bodyTpl, input.variables);

  const sendResult = await sendEmailViaResend({
    to: emailCheck.data,
    subject,
    text: bodyText,
    html: textToSimpleHtml(bodyText),
    replyTo: context.business.email ?? undefined,
  });

  await insforge.database.from("notification_logs").insert([
    {
      business_id: context.business.id,
      event_type: input.eventType,
      document_type: input.documentType,
      document_id: input.documentId,
      recipient_email: emailCheck.data,
      subject,
      status: sendResult.ok ? "sent" : "failed",
      provider_message_id: sendResult.messageId ?? null,
      dedup_key: sendResult.ok ? (input.dedupKey ?? null) : null,
      error_message: sendResult.error ?? null,
      sent_at: sendResult.ok ? new Date().toISOString() : null,
    },
  ]);

  if (!sendResult.ok) {
    return {
      ok: false,
      error: sendResult.error ?? "Email delivery failed.",
    };
  }

  revalidatePath("/dashboard/notifications");
  return { ok: true };
}

