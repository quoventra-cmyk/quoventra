import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getActiveBusinessContext, requireAuthUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";
import { getBusinessEntitlements } from "@/services/subscriptions/entitlements";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireAuthUser();
  const insforge = await createInsForgeServerClient();
  const [context, adminRes] = await Promise.all([
    getActiveBusinessContext(user.id),
    insforge.database
      .from("admin_users")
      .select("is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const entitlements = context
    ? await getBusinessEntitlements(context.business.id)
    : null;

  return (
    <DashboardShell
      userEmail={user.email}
      userName={user.name}
      businessName={context?.business.name ?? null}
      planName={entitlements?.planName ?? "Starter"}
      isPlatformAdmin={Boolean(adminRes.data?.is_active)}
    >
      {children}
    </DashboardShell>
  );
}
