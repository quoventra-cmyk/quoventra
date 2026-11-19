"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCategoryAction,
  createProductServiceAction,
  deleteCategoryAction,
  deleteProductServiceAction,
  toggleProductActiveAction,
} from "@/lib/pricing/actions";
import { PRICING_METHODS, UNIT_TYPES } from "@/lib/pricing/constants";
import { formatCurrency } from "@/lib/pricing/engine";
import type { PricingMethod } from "@/types";

export interface CategoryRecord {
  id: string;
  name: string;
  description: string | null;
}

export interface ProductServiceRecord {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  unit_type: string;
  pricing_method: PricingMethod;
  default_price: number;
  cost: number | null;
  is_taxable: boolean;
  is_active: boolean;
}

interface ProductsManagerProps {
  currency: string;
  categories: CategoryRecord[];
  items: ProductServiceRecord[];
}

export function ProductsManager({
  currency,
  categories,
  items,
}: ProductsManagerProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [pricingMethod, setPricingMethod] = useState<PricingMethod>("fixed");
  const [unitType, setUnitType] = useState("unit");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [cost, setCost] = useState("");
  const [isTaxable, setIsTaxable] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [catSubmitting, setCatSubmitting] = useState(false);

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  async function handleCreateItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await createProductServiceAction({
        name,
        description: description || undefined,
        categoryId: categoryId || null,
        unitType,
        pricingMethod,
        defaultPrice: Number(defaultPrice) || 0,
        cost: cost ? Number(cost) : null,
        isTaxable,
        isActive,
      });

      if (!res.ok) {
        setError(res.error ?? "Failed to create item.");
        return;
      }

      setName("");
      setDescription("");
      setDefaultPrice("");
      setCost("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setError(null);
    setCatSubmitting(true);
    try {
      const res = await createCategoryAction({ name: newCategoryName });
      if (!res.ok) {
        setError(res.error ?? "Failed to create category.");
        return;
      }
      setNewCategoryName("");
      router.refresh();
    } finally {
      setCatSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Create Product / Service */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Add Product or Service</CardTitle>
            <CardDescription>
              Create reusable catalog items that AI and estimates can reference.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateItem} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="item-name">Name</Label>
                  <Input
                    id="item-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Framing Labour, Deep Clean"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="item-category">Category</Label>
                  <select
                    id="item-category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="item-method">Pricing method</Label>
                  <select
                    id="item-method"
                    value={pricingMethod}
                    onChange={(e) => {
                      const next = e.target.value as PricingMethod;
                      setPricingMethod(next);
                      const matched = PRICING_METHODS.find(
                        (m) => m.value === next
                      );
                      if (matched) setUnitType(matched.defaultUnit);
                    }}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {PRICING_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="item-unit">Unit type</Label>
                  <select
                    id="item-unit"
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {UNIT_TYPES.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="item-price">Default price ({currency})</Label>
                  <Input
                    id="item-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={defaultPrice}
                    onChange={(e) => setDefaultPrice(e.target.value)}
                    placeholder="45.00"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="item-cost">Cost (optional)</Label>
                  <Input
                    id="item-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="25.00"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="item-desc">Description (optional)</Label>
                <Input
                  id="item-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Standard client-facing line description"
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTaxable}
                    onChange={(e) => setIsTaxable(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span>Taxable</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span>Active</span>
                </label>
              </div>

              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add to Catalog
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Service Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <CardDescription>
              Group services by trade, labour, or material type.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleCreateCategory} className="flex gap-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Labour, Materials"
              />
              <Button type="submit" size="sm" disabled={catSubmitting}>
                Add
              </Button>
            </form>

            {categories.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No categories created yet.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {categories.map((cat) => (
                  <li
                    key={cat.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <span>{cat.name}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteCategoryAction(cat.id);
                        router.refresh();
                      }}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Delete category ${cat.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Catalog List */}
      <Card>
        <CardHeader>
          <CardTitle>Catalog Items ({items.length})</CardTitle>
          <CardDescription>
            All products and services configured for this business.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No products or services yet. Add your first service above.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Category</th>
                    <th className="px-4 py-2.5 font-medium">Method</th>
                    <th className="px-4 py-2.5 font-medium">Rate</th>
                    <th className="px-4 py-2.5 font-medium">Taxable</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.name}</p>
                        {item.description ? (
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.category_id
                          ? categoryMap.get(item.category_id) ?? "—"
                          : "—"}
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {item.pricing_method.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatCurrency(Number(item.default_price), currency)} /{" "}
                        {item.unit_type}
                      </td>
                      <td className="px-4 py-3">
                        {item.is_taxable ? "Yes" : "No"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={item.is_active ? "success" : "secondary"}
                        >
                          {item.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await toggleProductActiveAction(
                              item.id,
                              !item.is_active
                            );
                            router.refresh();
                          }}
                        >
                          {item.is_active ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await deleteProductServiceAction(item.id);
                            router.refresh();
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

