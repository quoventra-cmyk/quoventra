import { redirect } from "next/navigation";
import {
  AIEstimateGenerator,
  type AIHistorySummary,
} from "@/components/ai/ai-estimate-generator";
import { getConfiguredAIProvider } from "@/lib/ai/providers";
import { getActiveBusinessContext, requireAuthUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";

export default async function AIEstimatePage() {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    redirect("/dashboard/onboarding");
  }

  const insforge = await createInsForgeServerClient();
  const [{ data: industriesData }, { data: historyData }] = await Promise.all([
    insforge.database
      .from("industries")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    insforge.database
      .from("ai_generation_history")
      .select("id, provider, model, prompt, status, error_message, created_at")
      .eq("business_id", context.business.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const aiProviderStatus = getConfiguredAIProvider();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          AI Estimate Generator
        </h1>
        <p className="text-sm text-muted-foreground">
          Turn plain-language job descriptions into structured, editable
          estimates using your business&apos;s saved rates.
        </p>
      </div>

      <AIEstimateGenerator
        businessName={context.business.name}
        currency={context.business.currency}
        defaultTaxRate={Number(context.settings?.default_tax_rate ?? 0)}
        defaultIndustryName={context.industryName ?? "Other"}
        industries={(industriesData ?? []) as { id: string; name: string }[]}
        aiProviderStatus={aiProviderStatus}
        recentHistory={(historyData ?? []) as AIHistorySummary[]}
      />
    </div>
  );
}

