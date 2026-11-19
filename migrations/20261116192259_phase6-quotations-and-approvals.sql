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

