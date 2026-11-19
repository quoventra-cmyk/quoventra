import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerDetailView } from "@/components/customers/customer-detail-view";
import { Button } from "@/components/ui/button";
import { getActiveBusinessContext, requireAuthUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    redirect("/dashboard/onboarding");
  }

  const { id } = await params;
  const insforge = await createInsForgeServerClient();

  const [
    { data: customer },
    { data: estimates },
    { data: quotations },
    { data: invoices },
    { data: notesList },
    { data: communications },
  ] = await Promise.all([
    insforge.database
      .from("customers")
      .select("*")
      .eq("id", id)
      .eq("business_id", context.business.id)
      .maybeSingle(),
    insforge.database
      .from("estimates")
      .select("id, estimate_number, title, status, total, issue_date")
      .eq("business_id", context.business.id)
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    insforge.database
      .from("quotations")
      .select("id, quotation_number, title, status, total, issue_date")
      .eq("business_id", context.business.id)
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    insforge.database
      .from("invoices")
      .select(
        "id, invoice_number, title, status, total, balance_due, issue_date"
      )
      .eq("business_id", context.business.id)
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    insforge.database
      .from("customer_notes")
      .select("id, content, created_at")
      .eq("business_id", context.business.id)
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    insforge.database
      .from("customer_communications")
      .select("id, channel, subject, summary, occurred_at")
      .eq("business_id", context.business.id)
      .eq("customer_id", id)
      .order("occurred_at", { ascending: false }),
  ]);

  if (!customer) {
    notFound();
  }

  const outstandingBalance =
    (invoices ?? [])
      .filter((inv) => inv.status !== "cancelled")
      .reduce(
        (sum, inv) => sum + Math.round(Number(inv.balance_due) * 100),
        0
      ) / 100;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">
            {customer.company_name || "Individual Customer"}
          </p>
        </div>
        <Link href="/dashboard/customers">
          <Button variant="outline" size="sm">
            Back to Customers
          </Button>
        </Link>
      </div>

      <CustomerDetailView
        currency={context.business.currency}
        customer={customer}
        outstandingBalance={outstandingBalance}
        estimates={estimates ?? []}
        quotations={quotations ?? []}
        invoices={invoices ?? []}
        notesList={notesList ?? []}
        communications={communications ?? []}
      />
    </div>
  );
}

