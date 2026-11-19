-- Phase 9: Email, Notifications & Automation
-- Tables: notification_settings, email_templates, notification_logs
-- Adds email_opt_out to customers

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  auto_quotation_reminders BOOLEAN NOT NULL DEFAULT false,
  quotation_reminder_days INTEGER NOT NULL DEFAULT 3 CHECK (quotation_reminder_days BETWEEN 1 AND 60),
  auto_invoice_due_reminders BOOLEAN NOT NULL DEFAULT false,
  invoice_reminder_days INTEGER NOT NULL DEFAULT 3 CHECK (invoice_reminder_days BETWEEN 1 AND 60),
  auto_expiry_notifications BOOLEAN NOT NULL DEFAULT false,
  auto_follow_up_reminders BOOLEAN NOT NULL DEFAULT false,
  respect_email_consent BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER notification_settings_set_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL CHECK (template_key IN (
    'estimate_sent',
    'quotation_sent',
    'quotation_approved',
    'quotation_rejected',
    'invoice_sent',
    'payment_recorded',
    'invoice_reminder'
  )),
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, template_key)
);

CREATE TRIGGER email_templates_set_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  document_type TEXT,
  document_id UUID,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  provider_message_id TEXT,
  dedup_key TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_business_id
  ON public.notification_logs(business_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_logs_dedup_key
  ON public.notification_logs(business_id, dedup_key)
  WHERE dedup_key IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.notification_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT SELECT, INSERT ON public.notification_logs TO authenticated;

-- RLS Policies
CREATE POLICY "notification_settings_select" ON public.notification_settings
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "notification_settings_insert" ON public.notification_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_business_admin(business_id));

CREATE POLICY "notification_settings_update" ON public.notification_settings
  FOR UPDATE TO authenticated
  USING (public.is_business_admin(business_id))
  WITH CHECK (public.is_business_admin(business_id));

CREATE POLICY "email_templates_select" ON public.email_templates
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "email_templates_insert" ON public.email_templates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_business_admin(business_id));

CREATE POLICY "email_templates_update" ON public.email_templates
  FOR UPDATE TO authenticated
  USING (public.is_business_admin(business_id))
  WITH CHECK (public.is_business_admin(business_id));

CREATE POLICY "email_templates_delete" ON public.email_templates
  FOR DELETE TO authenticated
  USING (public.is_business_admin(business_id));

CREATE POLICY "notification_logs_select" ON public.notification_logs
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "notification_logs_insert" ON public.notification_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_business(business_id));

