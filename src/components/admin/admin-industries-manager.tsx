"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createIndustryAction,
  toggleIndustryActiveAction,
} from "@/services/admin/actions";

export interface AdminIndustryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
}

export function AdminIndustriesManager({
  industries,
}: {
  industries: AdminIndustryRow[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await createIndustryAction({
        name,
        description: description || undefined,
      });
      if (res.ok) {
        setName("");
        setDescription("");
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Industry</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Industry name *"
              required
            />
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
            />
            <Button type="submit" disabled={submitting}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {industries.map((ind) => (
          <div
            key={ind.id}
            className="flex items-center justify-between gap-4 p-4 text-sm"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{ind.name}</span>
                <Badge variant={ind.is_active ? "success" : "secondary"}>
                  {ind.is_active ? "Active" : "Disabled"}
                </Badge>
              </div>
              {ind.description ? (
                <p className="text-xs text-muted-foreground">
                  {ind.description}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                await toggleIndustryActiveAction(ind.id, !ind.is_active);
                router.refresh();
              }}
            >
              {ind.is_active ? "Disable" : "Enable"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

