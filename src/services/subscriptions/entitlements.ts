import { createInsForgeServerClient } from "@/lib/database/server";
import type { SubscriptionTier } from "@/types";

export interface BusinessEntitlements {
  tier: SubscriptionTier;
  planName: string;
  status: string;
  priceMonthlyCents: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  limits: {
    monthlyEstimates: number;
    monthlyAI: number;
    customers: number;
    teamMembers: number;
  };
  usage: {
    estimatesThisMonth: number;
    aiThisMonth: number;
    customersTotal: number;
    teamMembersTotal: number;
  };
  canCreateEstimate: boolean;
  canUseAI: boolean;
  canAddCustomer: boolean;
  canAddTeamMember: boolean;
  allowCustomBranding: boolean;
  allowAutomation: boolean;
  showAds: boolean;
}

/**
 * Centralized subscription entitlement resolver.
 * Never trusts frontend-supplied subscription status.
 */
export async function getBusinessEntitlements(
  businessId: string
): Promise<BusinessEntitlements> {
  const insforge = await createInsForgeServerClient();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthStartIso = monthStart.toISOString();

  const [
    { data: businessRow },
    { data: subRow },
    { data: freePlan },
    { data: estRows },
    { data: aiRows },
    { data: custRows },
    { data: memberRows },
  ] = await Promise.all([
    insforge.database
      .from("businesses")
      .select("owner_id")
      .eq("id", businessId)
      .maybeSingle(),
    insforge.database
      .from("subscriptions")
      .select(
        "tier, status, current_period_end, cancel_at_period_end, plan:subscription_plans(*)"
      )
      .eq("business_id", businessId)
      .maybeSingle(),
    insforge.database
      .from("subscription_plans")
      .select("*")
      .eq("tier", "free")
      .maybeSingle(),
    insforge.database
      .from("estimates")
      .select("id")
      .eq("business_id", businessId)
      .gte("created_at", monthStartIso),
    insforge.database
      .from("ai_usage_records")
      .select("id")
      .eq("business_id", businessId)
      .gte("created_at", monthStartIso),
    insforge.database
      .from("customers")
      .select("id")
      .eq("business_id", businessId),
    insforge.database
      .from("business_members")
      .select("id")
      .eq("business_id", businessId),
  ]);

  const activeStatuses = new Set(["active", "trialing"]);
  const isPaidActive =
    subRow && activeStatuses.has(String(subRow.status)) && subRow.tier !== "free";

  const rawPlan = (
    isPaidActive && subRow?.plan ? subRow.plan : freePlan
  ) as {
    tier?: SubscriptionTier;
    name?: string;
    price_monthly_cents?: number;
    monthly_estimate_limit?: number;
    monthly_ai_limit?: number;
    customer_limit?: number;
    team_member_limit?: number;
    allow_custom_branding?: boolean;
    allow_automation?: boolean;
    show_ads?: boolean;
  } | null;

  const tier: SubscriptionTier = rawPlan?.tier ?? "free";
  const limits = {
    monthlyEstimates: rawPlan?.monthly_estimate_limit ?? 10,
    monthlyAI: rawPlan?.monthly_ai_limit ?? 10,
    customers: rawPlan?.customer_limit ?? 25,
    teamMembers: rawPlan?.team_member_limit ?? 1,
  };

  const usage = {
    estimatesThisMonth: estRows?.length ?? 0,
    aiThisMonth: aiRows?.length ?? 0,
    customersTotal: custRows?.length ?? 0,
    teamMembersTotal: memberRows?.length ?? 0,
  };

  if (businessRow?.owner_id) {
    const { data: adminRow } = await insforge.database
      .from("admin_users")
      .select("is_active")
      .eq("user_id", businessRow.owner_id)
      .eq("is_active", true)
      .maybeSingle();

    if (adminRow?.is_active) {
      return {
        tier: "business",
        planName: "Admin All-Access",
        status: "active",
        priceMonthlyCents: 0,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        limits: {
          monthlyEstimates: 999999,
          monthlyAI: 999999,
          customers: 999999,
          teamMembers: 999999,
        },
        usage,
        canCreateEstimate: true,
        canUseAI: true,
        canAddCustomer: true,
        canAddTeamMember: true,
        allowCustomBranding: true,
        allowAutomation: true,
        showAds: false,
      };
    }
  }

  return {
    tier,
    planName: rawPlan?.name ?? "Free",
    status: subRow?.status ?? "active",
    priceMonthlyCents: rawPlan?.price_monthly_cents ?? 0,
    currentPeriodEnd: subRow?.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(subRow?.cancel_at_period_end),
    limits,
    usage,
    canCreateEstimate: usage.estimatesThisMonth < limits.monthlyEstimates,
    canUseAI: usage.aiThisMonth < limits.monthlyAI,
    canAddCustomer: usage.customersTotal < limits.customers,
    canAddTeamMember: usage.teamMembersTotal < limits.teamMembers,
    allowCustomBranding: Boolean(rawPlan?.allow_custom_branding),
    allowAutomation: Boolean(rawPlan?.allow_automation),
    showAds: rawPlan?.show_ads ?? true,
  };
}

