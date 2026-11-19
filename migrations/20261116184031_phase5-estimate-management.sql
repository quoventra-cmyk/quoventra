-- Phase 5: Estimate Management & Branded PDF Support
-- Extends business_settings and estimates, and adds estimate_history

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS brand_color TEXT NOT NULL DEFAULT '#2563eb';

ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS customer_address TEXT,
  ADD COLUMN IF NOT EXISTS business_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.estimate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estimate_history_estimate_id
  ON public.estimate_history(estimate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estimate_history_business_id
  ON public.estimate_history(business_id);

ALTER TABLE public.estimate_history ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.estimate_history TO authenticated;

CREATE POLICY "estimate_history_select" ON public.estimate_history
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "estimate_history_insert" ON public.estimate_history
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_business(business_id));

