import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getConfiguredAIProvider } from "@/lib/ai/providers";
import { createInsForgeServerClient } from "@/lib/database/server";
import { requirePlatformAdmin } from "@/lib/permissions/admin";

export default async function AdminAIMonitoringPage() {
  await requirePlatformAdmin();
  const insforge = await createInsForgeServerClient();
  const providerInfo = getConfiguredAIProvider();

  const [{ data: usage }, { data: recentHistory }] = await Promise.all([
    insforge.database
      .from("ai_usage_records")
      .select("provider, model, prompt_tokens, completion_tokens, total_tokens"),
    insforge.database
      .from("ai_generation_history")
      .select("id, provider, model, status, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  const totalTokens = (usage ?? []).reduce(
    (sum, u) => sum + Number(u.total_tokens ?? 0),
    0
  );
  const failedCount = (recentHistory ?? []).filter(
    (h) => h.status === "failed"
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Usage Monitoring</h1>
        <p className="text-sm text-muted-foreground">
          Server-side AI configuration status, token consumption, and error
          tracking (API keys are never exposed).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Configured Provider</CardDescription>
            <CardTitle className="text-xl capitalize">
              {providerInfo.provider} ({providerInfo.model})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={providerInfo.configured ? "success" : "warning"}>
              {providerInfo.configured ? "Key Configured" : "Key Missing"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tokens Consumed</CardDescription>
            <CardTitle className="text-2xl">
              {totalTokens.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Recent Failures (Last 25)</CardDescription>
            <CardTitle className="text-2xl">{failedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent AI Generations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border text-sm">
            {(recentHistory ?? []).map((h) => (
              <div
                key={h.id}
                className="py-2.5 flex items-center justify-between gap-2"
              >
                <div>
                  <p className="font-medium">
                    {h.provider} ({h.model})
                  </p>
                  {h.error_message ? (
                    <p className="text-xs text-destructive">{h.error_message}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {new Date(h.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge
                  variant={h.status === "success" ? "success" : "destructive"}
                >
                  {h.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

