import { redirect } from "next/navigation";
import {
  CustomersManager,
  type CustomerRow,
} from "@/components/customers/customers-manager";
import { getActiveBusinessContext, requireAuthUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";

export default async function CustomersPage() {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    redirect("/dashboard/onboarding");
  }

  const insforge = await createInsForgeServerClient();
  const { data } = await insforge.database
    .from("customers")
    .select(
      "id, customer_type, name, company_name, email, phone, address, created_at"
    )
    .eq("business_id", context.business.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Manage individual and business clients, document histories, and
          balances for{" "}
          <span className="font-medium text-foreground">
            {context.business.name}
          </span>
          .
        </p>
      </div>

      <CustomersManager customers={(data ?? []) as CustomerRow[]} />
    </div>
  );
}

