import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createInsForgeServerClient } from "@/lib/database/server";
import { requirePlatformAdmin } from "@/lib/permissions/admin";

export default async function AdminLogsPage() {
  await requirePlatformAdmin();
  const insforge = await createInsForgeServerClient();

  const { data: logs } = await insforge.database
    .from("audit_logs")
    .select("id, actor_user_id, action, target_type, target_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          System Activity &amp; Audit Logs
        </h1>
        <p className="text-sm text-muted-foreground">
          Immutable log of sensitive administrative actions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Audit Events</CardTitle>
        </CardHeader>
        <CardContent>
          {!logs || logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No administrative actions recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-border text-sm">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-medium capitalize">
                      {String(log.action).replaceAll("_", " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Target: {log.target_type} ({log.target_id ?? "—"})
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

