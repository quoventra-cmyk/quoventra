import {
  AdminPlansManager,
  type AdminPlanRow,
} from "@/components/admin/admin-plans-manager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createInsForgeServerClient } from "@/lib/database/server";
import { requirePlatformAdmin } from "@/lib/permissions/admin";

export default async function AdminSubscriptionsPage() {
  await requirePlatformAdmin();
  const insforge = await createInsForgeServerClient();

  const [{ data: plans }, { data: subscriptions }] = await Promise.all([
    insforge.database
      .from("subscription_plans")
      .select(
        "id, tier, name, price_monthly_cents, monthly_estimate_limit, monthly_ai_limit, customer_limit, team_member_limit"
      )
      .order("price_monthly_cents", { ascending: true }),
    insforge.database
      .from("subscriptions")
      .select("id, tier, status, business:businesses(name)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Subscription &amp; Plan Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure plan pricing and limits, and inspect active tenant
          subscriptions.
        </p>
      </div>

      <AdminPlansManager plans={(plans ?? []) as AdminPlanRow[]} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Recent Business Subscriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border text-sm">
            {(subscriptions ?? []).map((s) => {
              const biz = s.business as { name?: string } | null;
              return (
                <div
                  key={s.id}
                  className="py-2.5 flex items-center justify-between gap-2"
                >
                  <span className="font-medium">
                    {biz?.name ?? "Unknown Business"}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {s.tier}
                    </Badge>
                    <Badge variant="secondary" className="capitalize">
                      {s.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

