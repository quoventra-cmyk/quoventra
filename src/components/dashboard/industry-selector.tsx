"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface IndustryOption {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface IndustrySelectorProps {
  industries: IndustryOption[];
  value: string;
  onChange: (industryId: string) => void;
}

export function IndustrySelector({
  industries,
  value,
  onChange,
}: IndustrySelectorProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return industries;
    return industries.filter(
      (ind) =>
        ind.name.toLowerCase().includes(q) ||
        (ind.description?.toLowerCase().includes(q) ?? false)
    );
  }, [industries, query]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search industries (e.g. Construction, Cleaning, Consulting, Other)..."
          className="pl-9"
        />
      </div>

      <div className="max-h-56 overflow-y-auto rounded-lg border border-border divide-y divide-border bg-background">
        {filtered.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">
            No matching industry. Clear search to select &ldquo;Other&rdquo;.
          </p>
        ) : (
          filtered.map((industry) => {
            const selected = value === industry.id;
            return (
              <button
                key={industry.id}
                type="button"
                onClick={() => onChange(industry.id)}
                className={cn(
                  "flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/60",
                  selected && "bg-primary/10"
                )}
              >
                <div>
                  <p className="font-medium text-foreground">{industry.name}</p>
                  {industry.description ? (
                    <p className="text-xs text-muted-foreground">
                      {industry.description}
                    </p>
                  ) : null}
                </div>
                {selected ? (
                  <Check
                    className="h-4 w-4 text-primary shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

