import { redirect } from "next/navigation";
import {
  SubscriptionManager,
  type PlanRecord,
} from "@/components/dashboard/subscription-manager";
import { getActiveBusinessContext, requireAuthUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";
import { isStripeConfigured } from "@/lib/payments/stripe";
import { getBusinessEntitlements } from "@/services/subscriptions/entitlements";

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    redirect("/dashboard/onboarding");
  }

  const { checkout } = await searchParams;
  const insforge = await createInsForgeServerClient();

  const [entitlements, { data: plans }] = await Promise.all([
    getBusinessEntitlements(context.business.id),
    insforge.database
      .from("subscription_plans")
      .select(
        "id, tier, name, price_monthly_cents, monthly_estimate_limit, monthly_ai_limit, customer_limit, team_member_limit, allow_custom_branding, allow_automation"
      )
      .eq("is_active", true)
      .order("price_monthly_cents", { ascending: true }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Subscription &amp; Billing
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your plan, monitor usage limits, and access your Stripe
          billing portal for{" "}
          <span className="font-medium text-foreground">
            {context.business.name}
          </span>
          .
        </p>
      </div>

      <SubscriptionManager
        stripeConfigured={isStripeConfigured()}
        entitlements={entitlements}
        plans={(plans ?? []) as PlanRecord[]}
        checkoutStatus={checkout}
      />
    </div>
  );
}

