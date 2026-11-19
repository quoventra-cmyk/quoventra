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

