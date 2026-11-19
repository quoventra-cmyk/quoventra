import { redirect } from "next/navigation";
import { requireAuthUser, type AuthenticatedUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";

export interface PlatformAdminContext {
  user: AuthenticatedUser;
  role: "super_admin" | "support_admin";
}

/**
 * Enforces platform administrator authorization on /admin routes and actions.
 * Redirects non-admin users to /dashboard.
 */
export async function requirePlatformAdmin(): Promise<PlatformAdminContext> {
  const user = await requireAuthUser();
  const insforge = await createInsForgeServerClient();

  const { data: adminRow } = await insforge.database
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!adminRow) {
    redirect("/dashboard");
  }

  return {
    user,
    role: adminRow.role as "super_admin" | "support_admin",
  };
}

export async function recordAdminAuditLog(input: {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const insforge = await createInsForgeServerClient();
  await insforge.database.from("audit_logs").insert([
    {
      actor_user_id: input.actorUserId,
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId ?? null,
      metadata: input.metadata ?? {},
    },
  ]);
}

