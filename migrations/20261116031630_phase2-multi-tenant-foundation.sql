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

