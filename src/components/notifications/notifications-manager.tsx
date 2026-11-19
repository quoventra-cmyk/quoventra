"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Bell, CheckCircle2, Loader2, Mail, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_EMAIL_TEMPLATES,
  type EmailTemplateKey,
} from "@/lib/email/templates";
import {
  updateNotificationSettingsAction,
  upsertEmailTemplateAction,
} from "@/services/notifications/actions";

interface NotificationSettingsData {
  auto_quotation_reminders: boolean;
  quotation_reminder_days: number;
  auto_invoice_due_reminders: boolean;
  invoice_reminder_days: number;
  auto_expiry_notifications: boolean;
  auto_follow_up_reminders: boolean;
  respect_email_consent: boolean;
}

interface CustomTemplateRow {
  template_key: EmailTemplateKey;
  subject: string;
  body_text: string;
  is_active: boolean;
}

interface NotificationLogRow {
  id: string;
  event_type: string;
  recipient_email: string;
  subject: string;
  status: "sent" | "failed" | "skipped";
  error_message: string | null;
  created_at: string;
}

export function NotificationsManager({
  resendConfigured,
  settings,
  customTemplates,
  logs,
}: {
  resendConfigured: boolean;
  settings: NotificationSettingsData;
  customTemplates: CustomTemplateRow[];
  logs: NotificationLogRow[];
}) {
  const router = useRouter();
  const [autoQuo, setAutoQuo] = useState(settings.auto_quotation_reminders);
  const [quoDays, setQuoDays] = useState(String(settings.quotation_reminder_days));
  const [autoInv, setAutoInv] = useState(settings.auto_invoice_due_reminders);
  const [invDays, setInvDays] = useState(String(settings.invoice_reminder_days));
  const [autoExpiry, setAutoExpiry] = useState(settings.auto_expiry_notifications);
  const [autoFollowUp, setAutoFollowUp] = useState(settings.auto_follow_up_reminders);
  const [respectConsent, setRespectConsent] = useState(settings.respect_email_consent);

  const [selectedKey, setSelectedKey] = useState<EmailTemplateKey>("quotation_sent");
  const customMap = new Map(customTemplates.map((t) => [t.template_key, t]));
  const getInitialTemplate = (key: EmailTemplateKey) => {
    const custom = customMap.get(key);
    const def = DEFAULT_EMAIL_TEMPLATES.find((d) => d.key === key)!;
    return {
      subject: custom?.subject ?? def.subject,
      bodyText: custom?.body_text ?? def.bodyText,
      isActive: custom?.is_active ?? true,
    };
  };

  const initialTpl = getInitialTemplate("quotation_sent");
  const [tplSubject, setTplSubject] = useState(initialTpl.subject);
  const [tplBody, setTplBody] = useState(initialTpl.bodyText);
  const [tplActive, setTplActive] = useState(initialTpl.isActive);

  const [savingSettings, setSavingSettings] = useState(false);
  const [savingTpl, setSavingTpl] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function handleSelectTemplate(key: EmailTemplateKey) {
    setSelectedKey(key);
    const next = getInitialTemplate(key);
    setTplSubject(next.subject);
    setTplBody(next.bodyText);
    setTplActive(next.isActive);
  }

  async function handleSaveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSavingSettings(true);
    try {
      const res = await updateNotificationSettingsAction({
        autoQuotationReminders: autoQuo,
        quotationReminderDays: Number(quoDays) || 3,
        autoInvoiceDueReminders: autoInv,
        invoiceReminderDays: Number(invDays) || 3,
        autoExpiryNotifications: autoExpiry,
        autoFollowUpReminders: autoFollowUp,
        respectEmailConsent: respectConsent,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not save settings.");
        return;
      }
      setNotice("Automation settings saved.");
      router.refresh();
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleSaveTemplate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSavingTpl(true);
    try {
      const res = await upsertEmailTemplateAction({
        templateKey: selectedKey,
        subject: tplSubject,
        bodyText: tplBody,
        isActive: tplActive,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not save template.");
        return;
      }
      setNotice("Email template saved.");
      router.refresh();
    } finally {
      setSavingTpl(false);
    }
  }

  return (
    <div className="space-y-6">
      {!resendConfigured ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">
              Transactional email provider (Resend) not configured
            </p>
            <p className="text-xs mt-1">
              Set <code className="font-mono">RESEND_API_KEY</code> and{" "}
              <code className="font-mono">EMAIL_FROM</code> in{" "}
              <code className="font-mono">.env.local</code> to deliver live
              emails. Automation preferences and templates can still be
              configured below.
            </p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Automation Rules</CardTitle>
            </div>
            <CardDescription>
              Enable or disable automated reminders and consent safeguards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoQuo}
                    onChange={(e) => setAutoQuo(e.target.checked)}
                  />
                  <span>Automatic quotation reminders</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">After</span>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={quoDays}
                    onChange={(e) => setQuoDays(e.target.value)}
                    className="w-16 h-8"
                  />
                  <span className="text-xs text-muted-foreground">days</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoInv}
                    onChange={(e) => setAutoInv(e.target.checked)}
                  />
                  <span>Invoice due reminders</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Before</span>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={invDays}
                    onChange={(e) => setInvDays(e.target.value)}
                    className="w-16 h-8"
                  />
                  <span className="text-xs text-muted-foreground">days</span>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoExpiry}
                  onChange={(e) => setAutoExpiry(e.target.checked)}
                />
                <span>Expiry notifications</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoFollowUp}
                  onChange={(e) => setAutoFollowUp(e.target.checked)}
                />
                <span>Follow-up reminders</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-border">
                <input
                  type="checkbox"
                  checked={respectConsent}
                  onChange={(e) => setRespectConsent(e.target.checked)}
                />
                <span>
                  Respect customer email opt-out &amp; anti-spam consent
                </span>
              </label>

              <Button type="submit" disabled={savingSettings}>
                {savingSettings ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Automation Settings
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">
                Customize Email Templates
              </CardTitle>
            </div>
            <CardDescription>
              Variables: <code>{"{{business_name}}"}</code>,{" "}
              <code>{"{{customer_name}}"}</code>,{" "}
              <code>{"{{document_number}}"}</code>, <code>{"{{total}}"}</code>,{" "}
              <code>{"{{link}}"}</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-select">Notification Event</Label>
                <select
                  id="tpl-select"
                  value={selectedKey}
                  onChange={(e) =>
                    handleSelectTemplate(e.target.value as EmailTemplateKey)
                  }
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                >
                  {DEFAULT_EMAIL_TEMPLATES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tpl-subject">Subject</Label>
                <Input
                  id="tpl-subject"
                  value={tplSubject}
                  onChange={(e) => setTplSubject(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tpl-body">Message Body</Label>
                <textarea
                  id="tpl-body"
                  rows={5}
                  value={tplBody}
                  onChange={(e) => setTplBody(e.target.value)}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  required
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={tplActive}
                  onChange={(e) => setTplActive(e.target.checked)}
                />
                <span>Template enabled</span>
              </label>

              <div>
                <Button type="submit" disabled={savingTpl}>
                  {savingTpl ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Template
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Notification Delivery History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification History</CardTitle>
          <CardDescription>
            Traceable log of sent, skipped, and failed email notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No notifications recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 text-sm"
                >
                  <div className="space-y-0.5">
                    <p className="font-medium">
                      {log.subject} → {log.recipient_email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Event: {log.event_type.replaceAll("_", " ")} •{" "}
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                    {log.error_message ? (
                      <p className="text-xs text-destructive">
                        {log.error_message}
                      </p>
                    ) : null}
                  </div>
                  <Badge
                    variant={
                      log.status === "sent"
                        ? "success"
                        : log.status === "skipped"
                          ? "warning"
                          : "destructive"
                    }
                    className="capitalize w-fit"
                  >
                    {log.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

