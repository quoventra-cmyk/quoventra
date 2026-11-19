import { getInsForgeClient } from "@/lib/database/insforge";

export type AdPlacement =
  | "dashboard_free_banner"
  | "public_resources"
  | "public_tools";

export interface EligibleAd {
  id: string;
  placement: AdPlacement;
  headline: string;
  body: string | null;
  cta_label: string;
  target_url: string;
  requireConsent: boolean;
}

/**
 * Resolves an eligible advertisement for the given placement.
 * Paid subscribers (isFreeTier = false) never receive ads.
 * Returns null whenever ads are globally disabled in platform_settings.
 */
export async function getEligibleAdForPlacement(
  placement: AdPlacement,
  isFreeTier: boolean
): Promise<EligibleAd | null> {
  if (!isFreeTier) {
    return null;
  }

  const insforge = getInsForgeClient();
  if (!insforge) return null;

  const { data: settingsRow } = await insforge.database
    .from("platform_settings")
    .select("value")
    .eq("key", "ads_config")
    .maybeSingle();

  const cfg = (settingsRow?.value ?? {}) as {
    ads_enabled?: boolean;
    require_consent?: boolean;
  };

  if (!cfg.ads_enabled) {
    return null;
  }

  const { data: ad } = await insforge.database
    .from("advertisements")
    .select("id, placement, headline, body, cta_label, target_url")
    .eq("placement", placement)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!ad) return null;

  return {
    id: ad.id,
    placement: ad.placement as AdPlacement,
    headline: ad.headline,
    body: ad.body,
    cta_label: ad.cta_label,
    target_url: ad.target_url,
    requireConsent: cfg.require_consent ?? true,
  };
}

