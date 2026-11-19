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

