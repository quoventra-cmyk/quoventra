"use client";

import { useEffect, useRef } from "react";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EligibleAd } from "@/services/ads/queries";

export function AdSlot({ ad }: { ad: EligibleAd | null }) {
  const trackedRef = useRef(false);

  const consentGranted =
    typeof window !== "undefined" &&
    window.localStorage.getItem("quoventra_ad_consent") === "granted";

  useEffect(() => {
    if (!ad || trackedRef.current) return;
    if (ad.requireConsent && !consentGranted) return;

    trackedRef.current = true;
    void fetch("/api/ads/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        advertisementId: ad.id,
        eventType: "impression",
        surface: ad.placement,
        consentGranted,
      }),
    });
  }, [ad, consentGranted]);

  if (!ad) return null;

  function handleClick() {
    if (!ad) return;
    if (ad.requireConsent && !consentGranted) return;
    void fetch("/api/ads/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        advertisementId: ad.id,
        eventType: "click",
        surface: ad.placement,
        consentGranted,
      }),
    });
  }

  return (
    <aside
      aria-label="Sponsored message"
      className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            Sponsored
          </Badge>
          <p className="text-sm font-semibold">{ad.headline}</p>
        </div>
        {ad.body ? (
          <p className="text-xs text-muted-foreground">{ad.body}</p>
        ) : null}
      </div>

      <a
        href={ad.target_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={handleClick}
      >
        <Button variant="outline" size="sm">
          {ad.cta_label}
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </a>
    </aside>
  );
}

