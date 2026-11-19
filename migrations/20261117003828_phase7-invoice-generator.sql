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

