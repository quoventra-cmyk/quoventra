-- =============================================================================
-- QUOVENTRA — Consolidated Supabase PostgreSQL Schema (Phases 2–13)
-- Paste this entire file into the Supabase Dashboard -> SQL Editor and click Run.
-- =============================================================================


-- =============================================================================
-- MIGRATION: 20261116031630_phase2-multi-tenant-foundation.sql
-- =============================================================================

-- Phase 2: Authentication & Multi-Tenant Database Foundation
-- Tables: profiles, industries, businesses, business_members, business_settings

-- 1. Updated-at trigger helper in public schema
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2. Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3. Industries catalog (shared reference table)
CREATE TABLE IF NOT EXISTS public.industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed supported industries (idempotent)
INSERT INTO public.industries (name, slug, description, is_active) VALUES
  ('Construction', 'construction', 'General contracting, framing, concrete, and structural builds.', true),
  ('Renovation', 'renovation', 'Home remodeling, basements, kitchens, and bathrooms.', true),
  ('Moving', 'moving', 'Residential and commercial moving, packing, and logistics.', true),
  ('Cleaning', 'cleaning', 'Residential, commercial, and post-construction cleaning.', true),
  ('Landscaping', 'landscaping', 'Lawn care, hardscaping, irrigation, and outdoor design.', true),
  ('Plumbing', 'plumbing', 'Pipe installation, leak repair, water heaters, and drain services.', true),
  ('Electrical', 'electrical', 'Wiring, panel upgrades, lighting, and commercial electrical.', true),
  ('Painting', 'painting', 'Interior and exterior residential and commercial painting.', true),
  ('Roofing', 'roofing', 'Roof replacement, shingle repair, inspections, and gutters.', true),
  ('HVAC', 'hvac', 'Heating, ventilation, air conditioning installation and maintenance.', true),
  ('Handyman', 'handyman', 'General home repairs, punch lists, and small installations.', true),
  ('Automotive Repair', 'automotive-repair', 'Diagnostics, brakes, engine maintenance, and auto body.', true),
  ('Freelancer', 'freelancer', 'Independent creative, technical, and project-based services.', true),
  ('Fitness Coach', 'fitness-coach', 'Personal training, coaching packages, and wellness programs.', true),
  ('Consulting', 'consulting', 'Business, management, strategy, and advisory services.', true),
  ('Marketing Agency', 'marketing-agency', 'Digital campaigns, branding, content, and SEO retainers.', true),
  ('Photography', 'photography', 'Weddings, commercial shoots, portraits, and post-production.', true),
  ('Event Services', 'event-services', 'Event planning, catering coordination, AV, and rentals.', true),
  ('IT Services', 'it-services', 'Managed IT, networking, cybersecurity, and software support.', true),
  ('Maintenance', 'maintenance', 'Facility, property, and preventative equipment maintenance.', true),
  ('Other', 'other', 'Other service or project-based business.', true)
ON CONFLICT (slug) DO NOTHING;

-- 4. Businesses (multi-tenant workspaces)
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  industry_id UUID REFERENCES public.industries(id) ON DELETE SET NULL,
  description TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  region TEXT,
  country TEXT NOT NULL DEFAULT 'US',
  postal_code TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  logo_url TEXT,
  logo_key TEXT,
  tax_registration_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_industry_id ON public.businesses(industry_id);

CREATE TRIGGER businesses_set_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 5. Business members (workspace access & roles)
CREATE TABLE IF NOT EXISTS public.business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_members_business_id ON public.business_members(business_id);
CREATE INDEX IF NOT EXISTS idx_business_members_user_id ON public.business_members(user_id);

-- 6. Business settings (tenant defaults)
CREATE TABLE IF NOT EXISTS public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  default_currency TEXT NOT NULL DEFAULT 'USD',
  default_tax_rate NUMERIC(6,4) NOT NULL DEFAULT 0.0000,
  document_prefix TEXT NOT NULL DEFAULT 'QVN',
  default_payment_terms TEXT NOT NULL DEFAULT 'Due within 14 days',
  default_expiry_days INTEGER NOT NULL DEFAULT 14,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER business_settings_set_updated_at
  BEFORE UPDATE ON public.business_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 7. Guard immutable owner_id on businesses
CREATE OR REPLACE FUNCTION public.prevent_business_owner_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'business owner_id cannot be changed directly';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_business_owner_change
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_business_owner_change();

-- 8. Automatically provision owner membership and default settings when a business is created
CREATE OR REPLACE FUNCTION public.handle_new_business()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  INSERT INTO public.business_members (business_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (business_id, user_id) DO NOTHING;

  INSERT INTO public.business_settings (business_id, default_currency)
  VALUES (NEW.id, NEW.currency)
  ON CONFLICT (business_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_business_created
  AFTER INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_business();

-- 9. Recursion-safe SECURITY DEFINER RLS helpers
CREATE OR REPLACE FUNCTION public.is_business_member(target_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members
    WHERE business_id = target_business_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_business_admin(target_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members
    WHERE business_id = target_business_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;

-- 10. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- 11. Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.industries TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.businesses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.business_settings TO authenticated;

-- 12. RLS Policies

-- profiles: users can read/insert/update only their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- industries: public read-only for active industries
CREATE POLICY "industries_select_active" ON public.industries
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- businesses: members can view; authenticated users can create as owner; admins/owners can update
CREATE POLICY "businesses_select_member" ON public.businesses
  FOR SELECT TO authenticated
  USING (public.is_business_member(id));

CREATE POLICY "businesses_insert_owner" ON public.businesses
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY "businesses_update_admin" ON public.businesses
  FOR UPDATE TO authenticated
  USING (public.is_business_admin(id))
  WITH CHECK (public.is_business_admin(id));

-- business_members: members can view members of their businesses; admins can manage non-owner memberships
CREATE POLICY "business_members_select_member" ON public.business_members
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "business_members_insert_admin" ON public.business_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_business_admin(business_id));

CREATE POLICY "business_members_update_admin" ON public.business_members
  FOR UPDATE TO authenticated
  USING (public.is_business_admin(business_id))
  WITH CHECK (public.is_business_admin(business_id));

CREATE POLICY "business_members_delete_admin" ON public.business_members
  FOR DELETE TO authenticated
  USING (public.is_business_admin(business_id) AND role <> 'owner');

-- business_settings: members can read; admins can insert/update
CREATE POLICY "business_settings_select_member" ON public.business_settings
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "business_settings_insert_admin" ON public.business_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_business_admin(business_id));

CREATE POLICY "business_settings_update_admin" ON public.business_settings
  FOR UPDATE TO authenticated
  USING (public.is_business_admin(business_id))
  WITH CHECK (public.is_business_admin(business_id));



-- =============================================================================
-- MIGRATION: 20261116041902_phase3-products-services-pricing.sql
-- =============================================================================

-- Phase 3: Products, Services & Pricing Engine
-- Tables: service_categories, products_services, pricing_rules

-- Helper function: owner, admin, or member can edit business catalog/documents (viewers are read-only)
CREATE OR REPLACE FUNCTION public.can_edit_business(target_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members
    WHERE business_id = target_business_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin', 'member')
  );
$$;

-- 1. Service categories
CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, name)
);

CREATE INDEX IF NOT EXISTS idx_service_categories_business_id
  ON public.service_categories(business_id);

CREATE TRIGGER service_categories_set_updated_at
  BEFORE UPDATE ON public.service_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 2. Products & Services
CREATE TABLE IF NOT EXISTS public.products_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit_type TEXT NOT NULL DEFAULT 'unit',
  pricing_method TEXT NOT NULL DEFAULT 'fixed'
    CHECK (pricing_method IN (
      'fixed', 'hourly', 'quantity', 'material', 'square_foot',
      'distance', 'per_item', 'percentage', 'custom'
    )),
  default_price NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
  cost NUMERIC(12,4),
  is_taxable BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_services_business_id
  ON public.products_services(business_id);
CREATE INDEX IF NOT EXISTS idx_products_services_category_id
  ON public.products_services(category_id);

CREATE TRIGGER products_services_set_updated_at
  BEFORE UPDATE ON public.products_services
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3. Pricing Rules
CREATE TABLE IF NOT EXISTS public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  pricing_method TEXT NOT NULL
    CHECK (pricing_method IN (
      'fixed', 'hourly', 'quantity', 'material', 'square_foot',
      'distance', 'per_item', 'percentage', 'custom'
    )),
  unit_type TEXT NOT NULL DEFAULT 'unit',
  base_fee NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
  unit_rate NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
  min_charge NUMERIC(12,4),
  markup_percent NUMERIC(6,2),
  tax_rate_override NUMERIC(6,4),
  is_taxable BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_business_id
  ON public.pricing_rules(business_id);

CREATE TRIGGER pricing_rules_set_updated_at
  BEFORE UPDATE ON public.pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 4. Enable Row Level Security
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

-- 5. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products_services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_rules TO authenticated;

-- 6. RLS Policies (strict business_id tenant isolation)

-- service_categories
CREATE POLICY "service_categories_select" ON public.service_categories
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "service_categories_insert" ON public.service_categories
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_business(business_id));

CREATE POLICY "service_categories_update" ON public.service_categories
  FOR UPDATE TO authenticated
  USING (public.can_edit_business(business_id))
  WITH CHECK (public.can_edit_business(business_id));

CREATE POLICY "service_categories_delete" ON public.service_categories
  FOR DELETE TO authenticated
  USING (public.is_business_admin(business_id));

-- products_services
CREATE POLICY "products_services_select" ON public.products_services
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "products_services_insert" ON public.products_services
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_business(business_id));

CREATE POLICY "products_services_update" ON public.products_services
  FOR UPDATE TO authenticated
  USING (public.can_edit_business(business_id))
  WITH CHECK (public.can_edit_business(business_id));

CREATE POLICY "products_services_delete" ON public.products_services
  FOR DELETE TO authenticated
  USING (public.is_business_admin(business_id));

-- pricing_rules
CREATE POLICY "pricing_rules_select" ON public.pricing_rules
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "pricing_rules_insert" ON public.pricing_rules
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_business(business_id));

CREATE POLICY "pricing_rules_update" ON public.pricing_rules
  FOR UPDATE TO authenticated
  USING (public.can_edit_business(business_id))
  WITH CHECK (public.can_edit_business(business_id));

CREATE POLICY "pricing_rules_delete" ON public.pricing_rules
  FOR DELETE TO authenticated
  USING (public.is_business_admin(business_id));



-- =============================================================================
-- MIGRATION: 20261116044856_phase4-ai-estimate-generator.sql
-- =============================================================================

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



-- =============================================================================
-- MIGRATION: 20261116184031_phase5-estimate-management.sql
-- =============================================================================

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



-- =============================================================================
-- MIGRATION: 20261116192259_phase6-quotations-and-approvals.sql
-- =============================================================================

-- Phase 6: Quotation Generator & Customer Approval
-- Tables: quotations, quotation_items, quotation_approvals, quotation_history
-- Public RPCs: get_public_quotation, submit_quotation_response

CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  estimate_id UUID REFERENCES public.estimates(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  quotation_number TEXT NOT NULL,
  public_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'sent', 'viewed', 'approved',
      'rejected', 'changes_requested', 'expired', 'converted'
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
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  approved_at TIMESTAMPTZ,
  business_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, quotation_number)
);

CREATE INDEX IF NOT EXISTS idx_quotations_business_id
  ON public.quotations(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_public_token
  ON public.quotations(public_token);

CREATE TRIGGER quotations_set_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
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
  is_taxable BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id
  ON public.quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_business_id
  ON public.quotation_items(business_id);

CREATE TABLE IF NOT EXISTS public.quotation_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'changes_requested')),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  comment TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotation_approvals_quotation_id
  ON public.quotation_approvals(quotation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.quotation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotation_history_quotation_id
  ON public.quotation_history(quotation_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_history ENABLE ROW LEVEL SECURITY;

-- Grants for authenticated business users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_items TO authenticated;
GRANT SELECT ON public.quotation_approvals TO authenticated;
GRANT SELECT, INSERT ON public.quotation_history TO authenticated;

-- RLS Policies (strict business_id tenant isolation)
CREATE POLICY "quotations_select" ON public.quotations
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "quotations_insert" ON public.quotations
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_business(business_id) AND created_by = (SELECT auth.uid()));

CREATE POLICY "quotations_update" ON public.quotations
  FOR UPDATE TO authenticated
  USING (public.can_edit_business(business_id))
  WITH CHECK (public.can_edit_business(business_id));

CREATE POLICY "quotations_delete" ON public.quotations
  FOR DELETE TO authenticated
  USING (public.can_edit_business(business_id) AND status = 'draft');

CREATE POLICY "quotation_items_select" ON public.quotation_items
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "quotation_items_insert" ON public.quotation_items
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_business(business_id));

CREATE POLICY "quotation_items_update" ON public.quotation_items
  FOR UPDATE TO authenticated
  USING (public.can_edit_business(business_id))
  WITH CHECK (public.can_edit_business(business_id));

CREATE POLICY "quotation_items_delete" ON public.quotation_items
  FOR DELETE TO authenticated
  USING (public.can_edit_business(business_id));

CREATE POLICY "quotation_approvals_select" ON public.quotation_approvals
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "quotation_history_select" ON public.quotation_history
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "quotation_history_insert" ON public.quotation_history
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_business(business_id));

-- Secure public RPC: read-only projection of a quotation by public_token
CREATE OR REPLACE FUNCTION public.get_public_quotation(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  q_rec public.quotations%ROWTYPE;
  items_json JSONB;
  approvals_json JSONB;
BEGIN
  SELECT * INTO q_rec
  FROM public.quotations
  WHERE public_token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF q_rec.status = 'sent' THEN
    UPDATE public.quotations
    SET status = 'viewed'
    WHERE id = q_rec.id;

    INSERT INTO public.quotation_history (quotation_id, business_id, action, previous_status, new_status, notes)
    VALUES (q_rec.id, q_rec.business_id, 'viewed', 'sent', 'viewed', 'Viewed via public customer link');

    q_rec.status := 'viewed';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', qi.id,
    'name', qi.name,
    'description', qi.description,
    'quantity', qi.quantity,
    'unit', qi.unit,
    'unit_price', qi.unit_price,
    'line_total', qi.line_total
  ) ORDER BY qi.sort_order ASC), '[]'::jsonb)
  INTO items_json
  FROM public.quotation_items qi
  WHERE qi.quotation_id = q_rec.id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'decision', qa.decision,
    'customer_name', qa.customer_name,
    'comment', qa.comment,
    'created_at', qa.created_at
  ) ORDER BY qa.created_at DESC), '[]'::jsonb)
  INTO approvals_json
  FROM public.quotation_approvals qa
  WHERE qa.quotation_id = q_rec.id;

  RETURN jsonb_build_object(
    'quotation_number', q_rec.quotation_number,
    'title', q_rec.title,
    'description', q_rec.description,
    'status', q_rec.status,
    'currency', q_rec.currency,
    'subtotal', q_rec.subtotal,
    'discount_amount', q_rec.discount_amount,
    'tax_rate', q_rec.tax_rate,
    'tax_amount', q_rec.tax_amount,
    'total', q_rec.total,
    'terms', q_rec.terms,
    'issue_date', q_rec.issue_date,
    'expiry_date', q_rec.expiry_date,
    'approved_at', q_rec.approved_at,
    'customer_name', q_rec.customer_name,
    'business', q_rec.business_snapshot,
    'items', items_json,
    'approvals', approvals_json
  );
END;
$$;

-- Secure public RPC: submit customer approval / rejection / revision request
CREATE OR REPLACE FUNCTION public.submit_quotation_response(
  p_token TEXT,
  p_decision TEXT,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_comment TEXT DEFAULT NULL,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  q_rec public.quotations%ROWTYPE;
  prev_status TEXT;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected', 'changes_requested') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid decision.');
  END IF;

  IF length(trim(COALESCE(p_customer_name, ''))) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Full name is required.');
  END IF;

  IF position('@' in trim(COALESCE(p_customer_email, ''))) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Valid email address is required.');
  END IF;

  SELECT * INTO q_rec
  FROM public.quotations
  WHERE public_token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Quotation not found.');
  END IF;

  IF q_rec.status IN ('converted', 'expired') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This quotation can no longer be modified.');
  END IF;

  prev_status := q_rec.status;

  INSERT INTO public.quotation_approvals (
    quotation_id, business_id, decision, customer_name, customer_email,
    comment, ip_address, user_agent
  ) VALUES (
    q_rec.id, q_rec.business_id, p_decision, trim(p_customer_name), trim(p_customer_email),
    NULLIF(trim(COALESCE(p_comment, '')), ''), p_ip, p_user_agent
  );

  UPDATE public.quotations
  SET
    status = p_decision,
    approved_at = CASE WHEN p_decision = 'approved' THEN NOW() ELSE approved_at END
  WHERE id = q_rec.id;

  INSERT INTO public.quotation_history (
    quotation_id, business_id, action, previous_status, new_status, notes
  ) VALUES (
    q_rec.id,
    q_rec.business_id,
    'customer_' || p_decision,
    prev_status,
    p_decision,
    format('Submitted by %s (%s)', trim(p_customer_name), trim(p_customer_email))
  );

  RETURN jsonb_build_object('ok', true, 'status', p_decision);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_quotation(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quotation_response(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;



-- =============================================================================
-- MIGRATION: 20261117003828_phase7-invoice-generator.sql
-- =============================================================================

-- Phase 7: Invoice Generator & Payment Tracking
-- Tables: invoices, invoice_items, invoice_payments, invoice_history

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'sent', 'viewed', 'partially_paid',
      'paid', 'overdue', 'cancelled'
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
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
  balance_due NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (balance_due >= 0),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  payment_instructions TEXT,
  notes TEXT,
  terms TEXT,
  business_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_business_id
  ON public.invoices(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_quotation_id
  ON public.invoices(quotation_id);

CREATE TRIGGER invoices_set_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
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
  is_taxable BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id
  ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_business_id
  ON public.invoice_items(business_id);

CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  reference TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id
  ON public.invoice_payments(invoice_id, payment_date DESC);

CREATE TABLE IF NOT EXISTS public.invoice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_history_invoice_id
  ON public.invoice_history(invoice_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_history ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.invoice_payments TO authenticated;
GRANT SELECT, INSERT ON public.invoice_history TO authenticated;

-- RLS Policies
CREATE POLICY "invoices_select" ON public.invoices
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "invoices_insert" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_business(business_id) AND created_by = (SELECT auth.uid()));

CREATE POLICY "invoices_update" ON public.invoices
  FOR UPDATE TO authenticated
  USING (public.can_edit_business(business_id))
  WITH CHECK (public.can_edit_business(business_id));

CREATE POLICY "invoices_delete" ON public.invoices
  FOR DELETE TO authenticated
  USING (public.can_edit_business(business_id) AND status = 'draft');

CREATE POLICY "invoice_items_select" ON public.invoice_items
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "invoice_items_insert" ON public.invoice_items
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_business(business_id));

CREATE POLICY "invoice_items_update" ON public.invoice_items
  FOR UPDATE TO authenticated
  USING (public.can_edit_business(business_id))
  WITH CHECK (public.can_edit_business(business_id));

CREATE POLICY "invoice_items_delete" ON public.invoice_items
  FOR DELETE TO authenticated
  USING (public.can_edit_business(business_id));

CREATE POLICY "invoice_payments_select" ON public.invoice_payments
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "invoice_payments_insert" ON public.invoice_payments
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_business(business_id) AND recorded_by = (SELECT auth.uid()));

CREATE POLICY "invoice_payments_delete" ON public.invoice_payments
  FOR DELETE TO authenticated
  USING (public.is_business_admin(business_id));

CREATE POLICY "invoice_history_select" ON public.invoice_history
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "invoice_history_insert" ON public.invoice_history
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_business(business_id));



-- =============================================================================
-- MIGRATION: 20261117004418_phase8-customer-crm.sql
-- =============================================================================

-- Phase 8: Customer CRM
-- Tables: customers, customer_notes, customer_communications
-- Links customer_id (ON DELETE RESTRICT) to estimates, quotations, and invoices

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_type TEXT NOT NULL DEFAULT 'individual'
    CHECK (customer_type IN ('individual', 'business')),
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_business_id
  ON public.customers(business_id, created_at DESC);

CREATE TRIGGER customers_set_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id
  ON public.customer_notes(customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.customer_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  logged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'email'
    CHECK (channel IN ('email', 'phone', 'meeting', 'note', 'other')),
  subject TEXT NOT NULL,
  summary TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_communications_customer_id
  ON public.customer_communications(customer_id, occurred_at DESC);

-- Link customer_id to financial documents with ON DELETE RESTRICT for retention
ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT;
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT;
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_estimates_customer_id ON public.estimates(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON public.quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);

-- Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_communications ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.customer_notes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.customer_communications TO authenticated;

-- RLS Policies
CREATE POLICY "customers_select" ON public.customers
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_business(business_id));

CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE TO authenticated
  USING (public.can_edit_business(business_id))
  WITH CHECK (public.can_edit_business(business_id));

CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE TO authenticated
  USING (public.is_business_admin(business_id));

CREATE POLICY "customer_notes_select" ON public.customer_notes
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "customer_notes_insert" ON public.customer_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_business(business_id));

CREATE POLICY "customer_notes_delete" ON public.customer_notes
  FOR DELETE TO authenticated
  USING (public.can_edit_business(business_id));

CREATE POLICY "customer_communications_select" ON public.customer_communications
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "customer_communications_insert" ON public.customer_communications
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_business(business_id));

CREATE POLICY "customer_communications_delete" ON public.customer_communications
  FOR DELETE TO authenticated
  USING (public.can_edit_business(business_id));



-- =============================================================================
-- MIGRATION: 20261117014105_phase9-email-notifications-automation.sql
-- =============================================================================

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



-- =============================================================================
-- MIGRATION: 20261117020154_phase11-subscriptions-stripe.sql
-- =============================================================================

-- Phase 11: Subscription & Payment System
-- Tables: subscription_plans, subscriptions, subscription_usage, stripe_customers, stripe_webhook_events

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL UNIQUE CHECK (tier IN ('free', 'starter', 'professional', 'business')),
  name TEXT NOT NULL,
  price_monthly_cents INTEGER NOT NULL DEFAULT 0,
  stripe_price_id TEXT,
  monthly_estimate_limit INTEGER NOT NULL DEFAULT 10,
  monthly_ai_limit INTEGER NOT NULL DEFAULT 10,
  customer_limit INTEGER NOT NULL DEFAULT 25,
  team_member_limit INTEGER NOT NULL DEFAULT 1,
  allow_custom_branding BOOLEAN NOT NULL DEFAULT false,
  allow_automation BOOLEAN NOT NULL DEFAULT false,
  show_ads BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER subscription_plans_set_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Seed proposed initial plans (configurable by platform admin)
INSERT INTO public.subscription_plans (
  tier, name, price_monthly_cents, monthly_estimate_limit, monthly_ai_limit,
  customer_limit, team_member_limit, allow_custom_branding, allow_automation, show_ads
) VALUES
  ('free', 'Free', 0, 10, 10, 25, 1, false, false, true),
  ('starter', 'Starter', 1900, 100, 50, 250, 2, false, false, false),
  ('professional', 'Professional', 4900, 500, 250, 2000, 5, true, false, false),
  ('business', 'Business', 9900, 5000, 1000, 20000, 25, true, true, false)
ON CONFLICT (tier) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'starter', 'professional', 'business')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  stripe_subscription_id TEXT UNIQUE,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_business_id
  ON public.subscriptions(business_id);

CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  estimates_created INTEGER NOT NULL DEFAULT 0,
  ai_generations_used INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, period_start)
);

CREATE TABLE IF NOT EXISTS public.stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Provision free subscription on new business creation
CREATE OR REPLACE FUNCTION public.handle_new_business()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  INSERT INTO public.business_members (business_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (business_id, user_id) DO NOTHING;

  INSERT INTO public.business_settings (business_id, default_currency)
  VALUES (NEW.id, NEW.currency)
  ON CONFLICT (business_id) DO NOTHING;

  SELECT id INTO free_plan_id
  FROM public.subscription_plans
  WHERE tier = 'free'
  LIMIT 1;

  IF free_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (business_id, plan_id, tier, status)
    VALUES (NEW.id, free_plan_id, 'free', 'active')
    ON CONFLICT (business_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill free subscriptions for existing businesses
INSERT INTO public.subscriptions (business_id, plan_id, tier, status)
SELECT b.id, sp.id, 'free', 'active'
FROM public.businesses b
CROSS JOIN public.subscription_plans sp
WHERE sp.tier = 'free'
ON CONFLICT (business_id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Grants: tenants can only READ subscriptions & usage; never self-upgrade via client
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.subscription_usage TO authenticated;
GRANT SELECT ON public.stripe_customers TO authenticated;

-- RLS Policies
CREATE POLICY "subscription_plans_select_active" ON public.subscription_plans
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "subscriptions_select_member" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "subscription_usage_select_member" ON public.subscription_usage
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

CREATE POLICY "stripe_customers_select_member" ON public.stripe_customers
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));



-- =============================================================================
-- MIGRATION: 20261117021037_phase12-advertisement-monetization.sql
-- =============================================================================

-- Phase 12: Advertisement Monetization & Platform Settings Foundation
-- Tables: platform_settings, advertisements, advertisement_events

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER platform_settings_set_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Default: ads disabled until privacy/consent/provider policies are satisfied
INSERT INTO public.platform_settings (key, value) VALUES
  ('ads_config', '{"ads_enabled": false, "require_consent": true, "adsense_client_id": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  placement TEXT NOT NULL CHECK (placement IN (
    'dashboard_free_banner',
    'public_resources',
    'public_tools'
  )),
  provider TEXT NOT NULL DEFAULT 'direct_sponsor' CHECK (provider IN ('direct_sponsor', 'adsense')),
  headline TEXT NOT NULL,
  body TEXT,
  cta_label TEXT NOT NULL DEFAULT 'Learn More',
  target_url TEXT NOT NULL,
  free_tier_only BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advertisements_placement_active
  ON public.advertisements(placement, is_active);

CREATE TRIGGER advertisements_set_updated_at
  BEFORE UPDATE ON public.advertisements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.advertisement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click')),
  surface TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advertisement_events_ad_id
  ON public.advertisement_events(advertisement_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisement_events ENABLE ROW LEVEL SECURITY;

-- Grants: public/authenticated can only read active ads & ads_config; events inserted via controlled RPC/API
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT SELECT ON public.advertisements TO anon, authenticated;
GRANT INSERT ON public.advertisement_events TO anon, authenticated;

-- RLS Policies
CREATE POLICY "platform_settings_select_ads_config" ON public.platform_settings
  FOR SELECT TO anon, authenticated
  USING (key = 'ads_config');

CREATE POLICY "advertisements_select_active" ON public.advertisements
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "advertisement_events_insert_valid" ON public.advertisement_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.advertisements a
      WHERE a.id = advertisement_id AND a.is_active = true
    )
  );



-- =============================================================================
-- MIGRATION: 20261117021707_phase13-platform-administration.sql
-- =============================================================================

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



-- =============================================================================
-- OPTIONAL POST-SIGNUP STEP: Promote your admin account to super_admin
-- After registering quoventra@gmail.com on Supabase Auth, run:
--
-- INSERT INTO public.admin_users (user_id, email, role, is_active)
-- SELECT id, email, 'super_admin', true
-- FROM auth.users
-- WHERE email = 'quoventra@gmail.com'
-- ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin', is_active = true;
-- =============================================================================
