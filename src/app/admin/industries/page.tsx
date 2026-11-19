import {
  AdminIndustriesManager,
  type AdminIndustryRow,
} from "@/components/admin/admin-industries-manager";
import { createInsForgeServerClient } from "@/lib/database/server";
import { requirePlatformAdmin } from "@/lib/permissions/admin";

export default async function AdminIndustriesPage() {
  await requirePlatformAdmin();
  const insforge = await createInsForgeServerClient();

  const { data } = await insforge.database
    .from("industries")
    .select("id, name, slug, description, is_active")
    .order("name", { ascending: true });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Industry Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Add, enable, or disable industries available during business
          onboarding.
        </p>
      </div>
      <AdminIndustriesManager industries={(data ?? []) as AdminIndustryRow[]} />
    </div>
  );
}

