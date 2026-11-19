-- Phase 13: Platform Administration
-- Tables: admin_users, audit_logs
-- Adds is_suspended to profiles and admin RLS policies

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'support_admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs(created_at DESC);

-- Recursion-safe SECURITY DEFINER admin check
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
      AND is_active = true
  );
$$;

-- Enable Row Level Security
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.admin_users TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.industries TO authenticated;
GRANT INSERT, UPDATE ON public.subscription_plans TO authenticated;
GRANT INSERT, UPDATE ON public.platform_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.advertisements TO authenticated;
GRANT SELECT ON public.advertisement_events TO authenticated;

-- Admin RLS Policies
CREATE POLICY "admin_users_select_self_or_admin" ON public.admin_users
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_platform_admin());

CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "audit_logs_insert_admin" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin() AND actor_user_id = (SELECT auth.uid()));

CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "businesses_admin_select" ON public.businesses
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "subscriptions_admin_select" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "subscription_plans_admin_all" ON public.subscription_plans
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "industries_admin_select_all" ON public.industries
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "industries_admin_insert" ON public.industries
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "industries_admin_update" ON public.industries
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "ai_usage_admin_select" ON public.ai_usage_records
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "ai_history_admin_select" ON public.ai_generation_history
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "platform_settings_admin_all" ON public.platform_settings
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "advertisements_admin_all" ON public.advertisements
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "advertisement_events_admin_select" ON public.advertisement_events
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

