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

