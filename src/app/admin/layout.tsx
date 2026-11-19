import type { ReactNode } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { requirePlatformAdmin } from "@/lib/permissions/admin";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const admin = await requirePlatformAdmin();

  return (
    <AdminShell adminEmail={admin.user.email} adminRole={admin.role}>
      {children}
    </AdminShell>
  );
}
