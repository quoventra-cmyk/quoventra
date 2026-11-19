import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import {
  QuotationsList,
  type QuotationSummaryRow,
} from "@/components/quotations/quotations-list";
import { Button } from "@/components/ui/button";
import { getActiveBusinessContext, requireAuthUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";

export default async function QuotationsPage() {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    redirect("/dashboard/onboarding");
  }

  const insforge = await createInsForgeServerClient();
  const { data } = await insforge.database
    .from("quotations")
    .select(
      "id, quotation_number, public_token, title, customer_name, status, currency, total, issue_date, created_at"
    )
    .eq("business_id", context.business.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quotations</h1>
          <p className="text-sm text-muted-foreground">
            Share client-ready quotations and track customer approvals for{" "}
            <span className="font-medium text-foreground">
              {context.business.name}
            </span>
            .
          </p>
        </div>

        <Link href="/dashboard/quotations/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Quotation
          </Button>
        </Link>
      </div>

      <QuotationsList quotations={(data ?? []) as QuotationSummaryRow[]} />
    </div>
  );
}

