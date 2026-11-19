"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSubscriptionPlanAction } from "@/services/admin/actions";

export interface AdminPlanRow {
  id: string;
  tier: string;
  name: string;
  price_monthly_cents: number;
  monthly_estimate_limit: number;
  monthly_ai_limit: number;
  customer_limit: number;
  team_member_limit: number;
}

export function AdminPlansManager({ plans }: { plans: AdminPlanRow[] }) {
  const router = useRouter();
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}
      {savedId ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>Plan configuration updated and logged.</span>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => (
          <PlanEditorCard
            key={plan.id}
            plan={plan}
            onSaved={() => {
              setSavedId(plan.id);
              router.refresh();
            }}
            onError={(msg) => setError(msg)}
          />
        ))}
      </div>
    </div>
  );
}

function PlanEditorCard({
  plan,
  onSaved,
  onError,
}: {
  plan: AdminPlanRow;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [priceUsd, setPriceUsd] = useState(
    String(plan.price_monthly_cents / 100)
  );
  const [estLimit, setEstLimit] = useState(String(plan.monthly_estimate_limit));
  const [aiLimit, setAiLimit] = useState(String(plan.monthly_ai_limit));
  const [custLimit, setCustLimit] = useState(String(plan.customer_limit));
  const [teamLimit, setTeamLimit] = useState(String(plan.team_member_limit));
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateSubscriptionPlanAction(plan.id, {
        priceMonthlyCents: Math.round((Number(priceUsd) || 0) * 100),
        monthlyEstimateLimit: Number(estLimit) || 1,
        monthlyAiLimit: Number(aiLimit) || 0,
        customerLimit: Number(custLimit) || 1,
        teamMemberLimit: Number(teamLimit) || 1,
      });
      if (!res.ok) {
        onError(res.error ?? "Failed to update plan.");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base capitalize">
          {plan.name} ({plan.tier})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Monthly Price (USD)</Label>
              <Input
                type="number"
                step="0.01"
                value={priceUsd}
                onChange={(e) => setPriceUsd(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Monthly Estimates</Label>
              <Input
                type="number"
                value={estLimit}
                onChange={(e) => setEstLimit(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Monthly AI Limit</Label>
              <Input
                type="number"
                value={aiLimit}
                onChange={(e) => setAiLimit(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Customer Limit</Label>
              <Input
                type="number"
                value={custLimit}
                onChange={(e) => setCustLimit(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Team Member Limit</Label>
              <Input
                type="number"
                value={teamLimit}
                onChange={(e) => setTeamLimit(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" size="sm" disabled={saving}>
            <Save className="h-4 w-4" />
            Save Plan
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

