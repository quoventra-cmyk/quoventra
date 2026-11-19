-- Phase 4: AI Estimate Generator & Estimate Persistence
-- Tables: ai_provider_settings, ai_generation_history, ai_usage_records, estimates, estimate_items

-- 1. AI provider settings (per-business limits & enablement)
CREATE TABLE IF NOT EXISTS public.ai_provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  monthly_request_limit INTEGER NOT NULL DEFAULT 50,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER ai_provider_settings_set_updated_at
  BEFORE UPDATE ON public.ai_provider_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 2. AI generation history
CREATE TABLE IF NOT EXISTS public.ai_generation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt TEXT NOT NULL,
  input_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_output TEXT,
  structured_output JSONB,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_history_business_id
  ON public.ai_generation_history(business_id, created_at DESC);

-- 3. AI usage records (token tracking)
CREATE TABLE IF NOT EXISTS public.ai_usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_id UUID REFERENCES public.ai_generation_history(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_records_business_id
  ON public.ai_usage_records(business_id, created_at DESC);

-- 4. Estimates (core document table; expanded in Phase 5 & linked to CRM in Phase 8)
CREATE TABLE IF NOT EXISTS public.estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  estimate_number TEXT NOT NULL,
  customer_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'pending', 'sent', 'viewed',
      'approved', 'rejected', 'expired', 'converted'
    )),
  currency TEXT NOT NULL DEFAULT 'USD',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  tax_rate NUMERIC(6,4) NOT NULL DEFAULT 0.0000,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  discount_type TEXT NOT NULL DEFAULT 'none'
    CHECK (discount_type IN ('none', 'percent', 'fixed')),
  discount_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  terms TEXT,
  assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_information JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_generation_id UUID REFERENCES public.ai_generation_history(id) ON DELETE SET NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, estimate_number)
);

CREATE INDEX IF NOT EXISTS idx_estimates_business_id
  ON public.estimates(business_id, created_at DESC);

CREATE TRIGGER estimates_set_updated_at
  BEFORE UPDATE ON public.estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 5. Estimate line items (immutable snapshot per estimate)
CREATE TABLE IF NOT EXISTS public.estimate_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'service'
    CHECK (category IN ('labour', 'material', 'equipment', 'service', 'other')),
  pricing_method TEXT NOT NULL DEFAULT 'fixed'
    CHECK (pricing_method IN (
      'fixed', 'hourly', 'quantity', 'material', 'square_foot',
      'distance', 'per_item', 'percentage', 'custom'
    )),
  quantity NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'unit',
  unit_price NUMERIC(12,4) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  pricing_source TEXT NOT NULL DEFAULT 'user_provided'
    CHECK (pricing_source IN ('business_rate', 'user_provided', 'missing')),
  is_taxable BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate_id
  ON public.estimate_items(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_items_business_id
  ON public.estimate_items(business_id);

-- 6. Enable Row Level Security
ALTER TABLE public.ai_provider_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;

-- 7. Grants
GRANT SELECT, INSERT, UPDATE ON public.ai_provider_settings TO authenticated;
GRANT SELECT, INSERT ON public.ai_generation_history TO authenticated;
GRANT SELECT, INSERT ON public.ai_usage_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estimates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estimate_items TO authenticated;

-- 8. RLS Policies (strict business_id tenant isolation)

-- ai_provider_settings
CREATE POLICY "ai_provider_settings_select" ON public.ai_provider_settings
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "ai_provider_settings_insert" ON public.ai_provider_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_business_admin(business_id));

CREATE POLICY "ai_provider_settings_update" ON public.ai_provider_settings
  FOR UPDATE TO authenticated
  USING (public.is_business_admin(business_id))
  WITH CHECK (public.is_business_admin(business_id));

-- ai_generation_history
CREATE POLICY "ai_generation_history_select" ON public.ai_generation_history
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "ai_generation_history_insert" ON public.ai_generation_history
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_business(business_id) AND user_id = (SELECT auth.uid()));

-- ai_usage_records
CREATE POLICY "ai_usage_records_select" ON public.ai_usage_records
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "ai_usage_records_insert" ON public.ai_usage_records
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_business(business_id) AND user_id = (SELECT auth.uid()));

-- estimates
CREATE POLICY "estimates_select" ON public.estimates
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "estimates_insert" ON public.estimates
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_business(business_id) AND created_by = (SELECT auth.uid()));

CREATE POLICY "estimates_update" ON public.estimates
  FOR UPDATE TO authenticated
  USING (public.can_edit_business(business_id))
  WITH CHECK (public.can_edit_business(business_id));

CREATE POLICY "estimates_delete" ON public.estimates
  FOR DELETE TO authenticated
  USING (public.can_edit_business(business_id));

-- estimate_items
CREATE POLICY "estimate_items_select" ON public.estimate_items
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "estimate_items_insert" ON public.estimate_items
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_business(business_id));

CREATE POLICY "estimate_items_update" ON public.estimate_items
  FOR UPDATE TO authenticated
  USING (public.can_edit_business(business_id))
  WITH CHECK (public.can_edit_business(business_id));

CREATE POLICY "estimate_items_delete" ON public.estimate_items
  FOR DELETE TO authenticated
  USING (public.can_edit_business(business_id));

