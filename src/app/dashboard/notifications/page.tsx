import { redirect } from "next/navigation";
import { NotificationsManager } from "@/components/notifications/notifications-manager";
import { getActiveBusinessContext, requireAuthUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";
import { isResendConfigured } from "@/lib/email/resend";

export default async function NotificationsPage() {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    redirect("/dashboard/onboarding");
  }

  const insforge = await createInsForgeServerClient();
  const [{ data: settingsData }, { data: templatesData }, { data: logsData }] =
    await Promise.all([
      insforge.database
        .from("notification_settings")
        .select("*")
        .eq("business_id", context.business.id)
        .maybeSingle(),
      insforge.database
        .from("email_templates")
        .select("template_key, subject, body_text, is_active")
        .eq("business_id", context.business.id),
      insforge.database
        .from("notification_logs")
        .select(
          "id, event_type, recipient_email, subject, status, error_message, created_at"
        )
        .eq("business_id", context.business.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Email, Notifications &amp; Automation
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure automated reminders, customize email templates, and review
          delivery logs for{" "}
          <span className="font-medium text-foreground">
            {context.business.name}
          </span>
          .
        </p>
      </div>

      <NotificationsManager
        resendConfigured={isResendConfigured()}
        settings={
          settingsData ?? {
            auto_quotation_reminders: false,
            quotation_reminder_days: 3,
            auto_invoice_due_reminders: false,
            invoice_reminder_days: 3,
            auto_expiry_notifications: false,
            auto_follow_up_reminders: false,
            respect_email_consent: true,
          }
        }
        customTemplates={templatesData ?? []}
        logs={logsData ?? []}
      />
    </div>
  );
}

