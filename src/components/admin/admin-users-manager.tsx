"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toggleUserSuspensionAction } from "@/services/admin/actions";

export interface AdminUserRow {
  id: string;
  full_name: string;
  email: string;
  is_suspended: boolean;
  created_at: string;
  businessName: string | null;
  subscriptionTier: string | null;
}

export function AdminUsersManager({ users }: { users: AdminUserRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.full_name.toLowerCase().includes(q) ||
        (u.businessName?.toLowerCase().includes(q) ?? false)
    );
  }, [users, search]);

  return (
    <div className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users or businesses..."
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Business</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{u.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {u.businessName || "Not onboarded"}
                </td>
                <td className="px-4 py-3 capitalize">
                  {u.subscriptionTier || "free"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.is_suspended ? "destructive" : "success"}>
                    {u.is_suspended ? "Suspended" : "Active"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant={u.is_suspended ? "outline" : "destructive"}
                    disabled={busyId === u.id}
                    onClick={async () => {
                      setError(null);
                      setBusyId(u.id);
                      try {
                        const res = await toggleUserSuspensionAction(
                          u.id,
                          !u.is_suspended
                        );
                        if (!res.ok) {
                          setError(res.error ?? "Failed to update user.");
                          return;
                        }
                        router.refresh();
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    {u.is_suspended ? "Reactivate" : "Suspend"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

