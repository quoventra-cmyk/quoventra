"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAdvertisementAction,
  toggleAdvertisementAction,
  updateAdsConfigAction,
} from "@/services/admin/actions";

export interface AdminAdRow {
  id: string;
  title: string;
  placement: "dashboard_free_banner" | "public_resources" | "public_tools";
  headline: string;
  target_url: string;
  is_active: boolean;
  impressions: number;
  clicks: number;
}

export function AdminAdsManager({
  adsEnabled,
  requireConsent,
  ads,
}: {
  adsEnabled: boolean;
  requireConsent: boolean;
  ads: AdminAdRow[];
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(adsEnabled);
  const [consent, setConsent] = useState(requireConsent);
  const [title, setTitle] = useState("");
  const [placement, setPlacement] = useState<
    "dashboard_free_banner" | "public_resources" | "public_tools"
  >("public_resources");
  const [headline, setHeadline] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Global Advertisement Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span>Enable advertisements on eligible free/public surfaces</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>Require user consent before tracking ad impressions/clicks</span>
          </label>
          <Button
            type="button"
            size="sm"
            onClick={async () => {
              await updateAdsConfigAction({
                adsEnabled: enabled,
                requireConsent: consent,
              });
              router.refresh();
            }}
          >
            <Save className="h-4 w-4" />
            Save Ad Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Advertisement</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              const res = await createAdvertisementAction({
                title,
                placement,
                provider: "direct_sponsor",
                headline,
                ctaLabel: "Learn More",
                targetUrl,
              });
              if (!res.ok) {
                setError(res.error ?? "Failed to create ad.");
                return;
              }
              setTitle("");
              setHeadline("");
              setTargetUrl("");
              router.refresh();
            }}
            className="grid gap-3 sm:grid-cols-2"
          >
            <div className="space-y-1">
              <Label>Campaign Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Placement</Label>
              <select
                value={placement}
                onChange={(e) =>
                  setPlacement(
                    e.target.value as
                      | "dashboard_free_banner"
                      | "public_resources"
                      | "public_tools"
                  )
                }
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="dashboard_free_banner">
                  Dashboard Free Tier Banner
                </option>
                <option value="public_resources">Public Resources Page</option>
                <option value="public_tools">Public Tools</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Headline</Label>
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Target URL</Label>
              <Input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" size="sm">
                <Plus className="h-4 w-4" />
                Add Campaign
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {ads.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">
            No advertisements configured yet.
          </p>
        ) : (
          ads.map((ad) => (
            <div
              key={ad.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 text-sm"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{ad.title}</span>
                  <Badge variant={ad.is_active ? "success" : "secondary"}>
                    {ad.is_active ? "Active" : "Paused"}
                  </Badge>
                  <Badge variant="outline">{ad.placement}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Impressions: {ad.impressions} • Clicks: {ad.clicks}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  await toggleAdvertisementAction(ad.id, !ad.is_active);
                  router.refresh();
                }}
              >
                {ad.is_active ? "Pause" : "Activate"}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

