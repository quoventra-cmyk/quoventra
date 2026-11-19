import {
  AdminUsersManager,
  type AdminUserRow,
} from "@/components/admin/admin-users-manager";
import { createInsForgeServerClient } from "@/lib/database/server";
import { requirePlatformAdmin } from "@/lib/permissions/admin";

export default async function AdminUsersPage() {
  await requirePlatformAdmin();
  const insforge = await createInsForgeServerClient();

  const [{ data: profiles }, { data: businesses }, { data: subscriptions }] =
    await Promise.all([
      insforge.database
        .from("profiles")
        .select("id, full_name, email, is_suspended, created_at")
        .order("created_at", { ascending: false }),
      insforge.database.from("businesses").select("id, owner_id, name"),
      insforge.database.from("subscriptions").select("business_id, tier"),
    ]);

  const bizByOwner = new Map(
    (businesses ?? []).map((b) => [b.owner_id, { id: b.id, name: b.name }])
  );
  const subByBiz = new Map(
    (subscriptions ?? []).map((s) => [s.business_id, s.tier])
  );

  const rows: AdminUserRow[] = (profiles ?? []).map((p) => {
    const biz = bizByOwner.get(p.id);
    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      is_suspended: Boolean(p.is_suspended),
      created_at: p.created_at,
      businessName: biz?.name ?? null,
      subscriptionTier: biz ? (subByBiz.get(biz.id) ?? "free") : null,
    };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          User &amp; Business Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Search registered users, inspect business plans, and suspend or
          reactivate accounts.
        </p>
      </div>
      <AdminUsersManager users={rows} />
    </div>
  );
}

