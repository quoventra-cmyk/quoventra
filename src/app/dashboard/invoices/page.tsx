import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import {
  InvoicesList,
  type InvoiceSummaryRow,
} from "@/components/invoices/invoices-list";
import { Button } from "@/components/ui/button";
import { getActiveBusinessContext, requireAuthUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";

export default async function InvoicesPage() {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    redirect("/dashboard/onboarding");
  }

  const insforge = await createInsForgeServerClient();
  const { data } = await insforge.database
    .from("invoices")
    .select(
      "id, invoice_number, title, customer_name, status, currency, total, amount_paid, balance_due, issue_date, due_date"
    )
    .eq("business_id", context.business.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Create invoices, convert approved quotations, and track payments for{" "}
            <span className="font-medium text-foreground">
              {context.business.name}
            </span>
            .
          </p>
        </div>

        <Link href="/dashboard/invoices/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </Link>
      </div>

      <InvoicesList invoices={(data ?? []) as InvoiceSummaryRow[]} />
    </div>
  );
}

