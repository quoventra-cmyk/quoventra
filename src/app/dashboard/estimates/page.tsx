import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import {
  EstimatesList,
  type EstimateSummaryRow,
} from "@/components/estimates/estimates-list";
import { Button } from "@/components/ui/button";
import { getActiveBusinessContext, requireAuthUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";

export default async function EstimatesPage() {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    redirect("/dashboard/onboarding");
  }

  const insforge = await createInsForgeServerClient();
  const { data } = await insforge.database
    .from("estimates")
    .select(
      "id, estimate_number, title, customer_name, status, currency, total, issue_date, expiry_date, created_at"
    )
    .eq("business_id", context.business.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estimates</h1>
          <p className="text-sm text-muted-foreground">
            Manage, search, edit, duplicate, and export PDF estimates for{" "}
            <span className="font-medium text-foreground">
              {context.business.name}
            </span>
            .
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/ai-estimate">
            <Button>
              <Sparkles className="h-4 w-4" />
              Create with AI
            </Button>
          </Link>
          <Link href="/dashboard/estimates/new">
            <Button variant="outline">
              <Plus className="h-4 w-4" />
              Create Manually
            </Button>
          </Link>
        </div>
      </div>

      <EstimatesList estimates={(data ?? []) as EstimateSummaryRow[]} />
    </div>
  );
}

