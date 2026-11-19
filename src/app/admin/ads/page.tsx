import {
  AdminAdsManager,
  type AdminAdRow,
} from "@/components/admin/admin-ads-manager";
import { createInsForgeServerClient } from "@/lib/database/server";
import { requirePlatformAdmin } from "@/lib/permissions/admin";

export default async function AdminAdsPage() {
  await requirePlatformAdmin();
  const insforge = await createInsForgeServerClient();

  const [{ data: settings }, { data: ads }, { data: events }] =
    await Promise.all([
      insforge.database
        .from("platform_settings")
        .select("value")
        .eq("key", "ads_config")
        .maybeSingle(),
      insforge.database
        .from("advertisements")
        .select("id, title, placement, headline, target_url, is_active")
        .order("created_at", { ascending: false }),
      insforge.database
        .from("advertisement_events")
        .select("advertisement_id, event_type"),
    ]);

  const cfg = (settings?.value ?? {}) as {
    ads_enabled?: boolean;
    require_consent?: boolean;
  };

  const rows: AdminAdRow[] = (ads ?? []).map((ad) => {
    const adEvents = (events ?? []).filter((e) => e.advertisement_id === ad.id);
    return {
      id: ad.id,
      title: ad.title,
      placement: ad.placement as AdminAdRow["placement"],
      headline: ad.headline,
      target_url: ad.target_url,
      is_active: Boolean(ad.is_active),
      impressions: adEvents.filter((e) => e.event_type === "impression").length,
      clicks: adEvents.filter((e) => e.event_type === "click").length,
    };
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Advertisement Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Enable or pause advertisements on eligible free-tier and public
          surfaces.
        </p>
      </div>
      <AdminAdsManager
        adsEnabled={Boolean(cfg.ads_enabled)}
        requireConsent={cfg.require_consent ?? true}
        ads={rows}
      />
    </div>
  );
}

