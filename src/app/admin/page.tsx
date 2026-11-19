import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createInsForgeServerClient } from "@/lib/database/server";
import { requirePlatformAdmin } from "@/lib/permissions/admin";

export default async function AdminOverviewPage() {
  await requirePlatformAdmin();
  const insforge = await createInsForgeServerClient();

  const [
    { data: profiles },
    { data: businesses },
    { data: subscriptions },
    { data: plans },
    { data: aiUsage },
    { data: adEvents },
  ] = await Promise.all([
    insforge.database.from("profiles").select("id, is_suspended"),
    insforge.database.from("businesses").select("id"),
    insforge.database.from("subscriptions").select("tier, status"),
    insforge.database
      .from("subscription_plans")
      .select("tier, price_monthly_cents"),
    insforge.database.from("ai_usage_records").select("total_tokens"),
    insforge.database.from("advertisement_events").select("event_type"),
  ]);

  const priceMap = new Map(
    (plans ?? []).map((p) => [p.tier, Number(p.price_monthly_cents)])
  );

  const activePaid = (subscriptions ?? []).filter(
    (s) =>
      (s.status === "active" || s.status === "trialing") && s.tier !== "free"
  );
  const freeAccounts = (subscriptions ?? []).filter(
    (s) => s.tier === "free"
  ).length;
  const canceledSubs = (subscriptions ?? []).filter(
    (s) => s.status === "canceled"
  ).length;

  const mrrCents = activePaid.reduce(
    (sum, s) => sum + (priceMap.get(s.tier) ?? 0),
    0
  );

  const totalTokens = (aiUsage ?? []).reduce(
    (sum, u) => sum + Number(u.total_tokens ?? 0),
    0
  );

  const impressions = (adEvents ?? []).filter(
    (e) => e.event_type === "impression"
  ).length;
  const clicks = (adEvents ?? []).filter((e) => e.event_type === "click").length;

  const cards = [
    { label: "Registered Users", value: String(profiles?.length ?? 0) },
    { label: "Businesses", value: String(businesses?.length ?? 0) },
    { label: "Active Paid Subscriptions", value: String(activePaid.length) },
    { label: "Free Accounts", value: String(freeAccounts) },
    {
      label: "Monthly Recurring Revenue",
      value: `$${(mrrCents / 100).toFixed(2)}`,
    },
    { label: "Cancellations", value: String(canceledSubs) },
    {
      label: "AI Requests / Tokens",
      value: `${aiUsage?.length ?? 0} / ${totalTokens.toLocaleString()}`,
    },
    { label: "Ad Impressions / Clicks", value: `${impressions} / ${clicks}` },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide metrics across users, businesses, subscriptions, AI, and
          advertisements.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardDescription>{c.label}</CardDescription>
              <CardTitle className="text-2xl">{c.value}</CardTitle>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>
    </div>
  );
}

