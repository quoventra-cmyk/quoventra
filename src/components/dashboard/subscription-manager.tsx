"use client";

import { useState } from "react";
import { AlertCircle, Check, CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BusinessEntitlements } from "@/services/subscriptions/entitlements";
import type { SubscriptionTier } from "@/types";

export interface PlanRecord {
  id: string;
  tier: SubscriptionTier;
  name: string;
  price_monthly_cents: number;
  monthly_estimate_limit: number;
  monthly_ai_limit: number;
  customer_limit: number;
  team_member_limit: number;
  allow_custom_branding: boolean;
  allow_automation: boolean;
}

export function SubscriptionManager({
  stripeConfigured,
  entitlements,
  plans,
  checkoutStatus,
}: {
  stripeConfigured: boolean;
  entitlements: BusinessEntitlements;
  plans: PlanRecord[];
  checkoutStatus?: string;
}) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout(tier: SubscriptionTier) {
    if (tier === "free") return;
    setError(null);
    setLoadingTier(tier);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setError(json.error ?? "Unable to start Stripe Checkout.");
        return;
      }
      window.location.href = json.url;
    } finally {
      setLoadingTier(null);
    }
  }

  async function handlePortal() {
    setError(null);
    setOpeningPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setError(json.error ?? "Unable to open Stripe Customer Portal.");
        return;
      }
      window.location.href = json.url;
    } finally {
      setOpeningPortal(false);
    }
  }

  const usageMeters = [
    {
      label: "Monthly Estimates",
      used: entitlements.usage.estimatesThisMonth,
      limit: entitlements.limits.monthlyEstimates,
    },
    {
      label: "Monthly AI Generations",
      used: entitlements.usage.aiThisMonth,
      limit: entitlements.limits.monthlyAI,
    },
    {
      label: "Customers",
      used: entitlements.usage.customersTotal,
      limit: entitlements.limits.customers,
    },
    {
      label: "Team Members",
      used: entitlements.usage.teamMembersTotal,
      limit: entitlements.limits.teamMembers,
    },
  ];

  return (
    <div className="space-y-6">
      {!stripeConfigured ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Stripe billing keys not configured</p>
            <p className="text-xs mt-1">
              Set <code className="font-mono">STRIPE_SECRET_KEY</code>,{" "}
              <code className="font-mono">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>,
              and <code className="font-mono">STRIPE_WEBHOOK_SECRET</code> in{" "}
              <code className="font-mono">.env.local</code> to enable live
              Stripe Checkout and Customer Portal sessions.
            </p>
          </div>
        </div>
      ) : null}

      {checkoutStatus === "success" ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          Checkout completed! Your subscription status synchronizes
          automatically via verified Stripe webhooks.
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {/* Current Plan & Usage */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">
                Current Plan: {entitlements.planName}
              </CardTitle>
              <Badge
                variant={
                  entitlements.status === "active" ? "success" : "warning"
                }
                className="capitalize"
              >
                {entitlements.status.replace("_", " ")}
              </Badge>
            </div>
            <CardDescription>
              ${(entitlements.priceMonthlyCents / 100).toFixed(2)}/month
              {entitlements.currentPeriodEnd
                ? ` • Renews ${new Date(entitlements.currentPeriodEnd).toLocaleDateString()}`
                : ""}
              {entitlements.cancelAtPeriodEnd
                ? " • Cancels at period end"
                : ""}
            </CardDescription>
          </div>
          {entitlements.tier !== "free" ? (
            <Button
              type="button"
              variant="outline"
              onClick={handlePortal}
              disabled={openingPortal}
            >
              {openingPortal ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Manage Billing
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {usageMeters.map((m) => {
              const pct = Math.min(100, Math.round((m.used / m.limit) * 100));
              return (
                <div
                  key={m.label}
                  className="rounded-lg border border-border p-3 space-y-2"
                >
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="font-semibold">
                      {m.used} / {m.limit}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.tier === entitlements.tier;
          return (
            <Card
              key={plan.id}
              className={
                isCurrent ? "border-primary ring-1 ring-primary/20" : ""
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {isCurrent ? <Badge>Current</Badge> : null}
                </div>
                <div className="pt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold">
                    ${(plan.price_monthly_cents / 100).toFixed(0)}
                  </span>
                  <span className="text-xs text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span>{plan.monthly_estimate_limit} estimates / month</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span>{plan.monthly_ai_limit} AI generations / month</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span>Up to {plan.customer_limit} customers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span>Up to {plan.team_member_limit} team member(s)</span>
                </div>
              </CardContent>
              <CardFooter>
                {plan.tier === "free" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled
                  >
                    {isCurrent ? "Active Plan" : "Free Tier"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="w-full"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || loadingTier === plan.tier}
                    onClick={() => handleCheckout(plan.tier)}
                  >
                    {loadingTier === plan.tier ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    {isCurrent ? "Current Plan" : `Upgrade to ${plan.name}`}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

