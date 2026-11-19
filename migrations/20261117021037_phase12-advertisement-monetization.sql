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

