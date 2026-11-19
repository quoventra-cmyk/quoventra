"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Loader2, Plus, Trash2 } from "lucide-react";
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
  createPricingRuleAction,
  deletePricingRuleAction,
  togglePricingRuleActiveAction,
} from "@/lib/pricing/actions";
import { PRICING_METHODS, UNIT_TYPES } from "@/lib/pricing/constants";
import {
  calculateDocumentPricing,
  formatCurrency,
  type DiscountType,
  type LineItemCategory,
} from "@/lib/pricing/engine";
import type { PricingMethod } from "@/types";

export interface PricingRuleRecord {
  id: string;
  name: string;
  description: string | null;
  pricing_method: PricingMethod;
  unit_type: string;
  base_fee: number;
  unit_rate: number;
  min_charge: number | null;
  markup_percent: number | null;
  tax_rate_override: number | null;
  is_taxable: boolean;
  is_active: boolean;
}

interface PricingManagerProps {
  currency: string;
  defaultTaxRate: number;
  rules: PricingRuleRecord[];
}

export function PricingManager({
  currency,
  defaultTaxRate,
  rules,
}: PricingManagerProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pricingMethod, setPricingMethod] = useState<PricingMethod>("hourly");
  const [unitType, setUnitType] = useState("hour");
  const [baseFee, setBaseFee] = useState("0");
  const [unitRate, setUnitRate] = useState("");
  const [minCharge, setMinCharge] = useState("");
  const [markupPercent, setMarkupPercent] = useState("");
  const [isTaxable, setIsTaxable] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Interactive Pricing Engine Test State
  const [simMethod, setSimMethod] = useState<PricingMethod>("hourly");
  const [simCategory, setSimCategory] = useState<LineItemCategory>("labour");
  const [simQty, setSimQty] = useState("8");
  const [simRate, setSimRate] = useState("45");
  const [simBaseFee, setSimBaseFee] = useState("0");
  const [simMarkup, setSimMarkup] = useState("0");
  const [simAdditional, setSimAdditional] = useState("0");
  const [simDiscountType, setSimDiscountType] = useState<DiscountType>("none");
  const [simDiscountVal, setSimDiscountVal] = useState("0");
  const [simTaxPercent, setSimTaxPercent] = useState(
    String((defaultTaxRate * 100).toFixed(2))
  );

  const simulation = useMemo(() => {
    const taxDecimal = (Number(simTaxPercent) || 0) / 100;
    return calculateDocumentPricing({
      items: [
        {
          name: "Test Line Item",
          category: simCategory,
          pricingMethod: simMethod,
          quantity: Number(simQty) || 0,
          unitPrice: Number(simRate) || 0,
          baseFee: Number(simBaseFee) || 0,
          markupPercent: Number(simMarkup) || 0,
          percentageBaseAmount: 1000,
          isTaxable: true,
        },
      ],
      additionalCharges: Number(simAdditional) || 0,
      discountType: simDiscountType,
      discountValue: Number(simDiscountVal) || 0,
      defaultTaxRate: taxDecimal,
    });
  }, [
    simMethod,
    simCategory,
    simQty,
    simRate,
    simBaseFee,
    simMarkup,
    simAdditional,
    simDiscountType,
    simDiscountVal,
    simTaxPercent,
  ]);

  async function handleCreateRule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await createPricingRuleAction({
        name,
        description: description || undefined,
        pricingMethod,
        unitType,
        baseFee: Number(baseFee) || 0,
        unitRate: Number(unitRate) || 0,
        minCharge: minCharge ? Number(minCharge) : null,
        markupPercent: markupPercent ? Number(markupPercent) : null,
        taxRateOverride: null,
        isTaxable,
        isActive: true,
      });

      if (!res.ok) {
        setError(res.error ?? "Failed to create pricing rule.");
        return;
      }

      setName("");
      setDescription("");
      setBaseFee("0");
      setUnitRate("");
      setMinCharge("");
      setMarkupPercent("");
      router.refresh();
    } finally {
      setSubmitting(false);
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Create Pricing Rule */}
        <Card>
          <CardHeader>
            <CardTitle>Create Pricing Rule</CardTitle>
            <CardDescription>
              Define reusable formulas for labour, materials, square footage,
              distance, or minimum charges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateRule} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="rule-name">Rule name</Label>
                <Input
                  id="rule-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Standard Crew Hourly, Moving Distance"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rule-method">Pricing method</Label>
                  <select
                    id="rule-method"
                    value={pricingMethod}
                    onChange={(e) => {
                      const next = e.target.value as PricingMethod;
                      setPricingMethod(next);
                      const m = PRICING_METHODS.find((x) => x.value === next);
                      if (m) setUnitType(m.defaultUnit);
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
                  <Label htmlFor="rule-unit">Unit type</Label>
                  <select
                    id="rule-unit"
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
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rule-rate">Unit rate ({currency})</Label>
                  <Input
                    id="rule-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={unitRate}
                    onChange={(e) => setUnitRate(e.target.value)}
                    placeholder="45.00"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rule-base">Base / call-out fee</Label>
                  <Input
                    id="rule-base"
                    type="number"
                    step="0.01"
                    min="0"
                    value={baseFee}
                    onChange={(e) => setBaseFee(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rule-min">Minimum charge (optional)</Label>
                  <Input
                    id="rule-min"
                    type="number"
                    step="0.01"
                    min="0"
                    value={minCharge}
                    onChange={(e) => setMinCharge(e.target.value)}
                    placeholder="150.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rule-markup">Material markup % (optional)</Label>
                  <Input
                    id="rule-markup"
                    type="number"
                    step="0.1"
                    min="0"
                    value={markupPercent}
                    onChange={(e) => setMarkupPercent(e.target.value)}
                    placeholder="15"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rule-desc">Description (optional)</Label>
                <Input
                  id="rule-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notes on when to apply this rule"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTaxable}
                  onChange={(e) => setIsTaxable(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <span>Taxable by default</span>
              </label>

              <div>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Save Pricing Rule
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Pricing Engine Verification Calculator */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <CardTitle>Pricing Engine Calculator</CardTitle>
            </div>
            <CardDescription>
              Test decimal-safe calculations across all 9 pricing methods,
              discounts, and tax overrides.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="sim-method">Method</Label>
                <select
                  id="sim-method"
                  value={simMethod}
                  onChange={(e) =>
                    setSimMethod(e.target.value as PricingMethod)
                  }
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                >
                  {PRICING_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="sim-cat">Category</Label>
                <select
                  id="sim-cat"
                  value={simCategory}
                  onChange={(e) =>
                    setSimCategory(e.target.value as LineItemCategory)
                  }
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="labour">Labour</option>
                  <option value="material">Material</option>
                  <option value="equipment">Equipment</option>
                  <option value="service">Service</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="sim-qty">Quantity</Label>
                <Input
                  id="sim-qty"
                  type="number"
                  step="0.01"
                  value={simQty}
                  onChange={(e) => setSimQty(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sim-rate">Unit Rate</Label>
                <Input
                  id="sim-rate"
                  type="number"
                  step="0.01"
                  value={simRate}
                  onChange={(e) => setSimRate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sim-base">Base Fee</Label>
                <Input
                  id="sim-base"
                  type="number"
                  step="0.01"
                  value={simBaseFee}
                  onChange={(e) => setSimBaseFee(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="sim-markup">Markup %</Label>
                <Input
                  id="sim-markup"
                  type="number"
                  step="0.1"
                  value={simMarkup}
                  onChange={(e) => setSimMarkup(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sim-add">Add. Charges</Label>
                <Input
                  id="sim-add"
                  type="number"
                  step="0.01"
                  value={simAdditional}
                  onChange={(e) => setSimAdditional(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sim-disc-type">Discount</Label>
                <select
                  id="sim-disc-type"
                  value={simDiscountType}
                  onChange={(e) =>
                    setSimDiscountType(e.target.value as DiscountType)
                  }
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-2 py-1 text-sm"
                >
                  <option value="none">None</option>
                  <option value="percent">%</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="sim-tax">Tax (%)</Label>
                <Input
                  id="sim-tax"
                  type="number"
                  step="0.01"
                  value={simTaxPercent}
                  onChange={(e) => setSimTaxPercent(e.target.value)}
                />
              </div>
            </div>

            {simDiscountType !== "none" ? (
              <div className="space-y-1">
                <Label htmlFor="sim-disc-val">Discount value</Label>
                <Input
                  id="sim-disc-val"
                  type="number"
                  step="0.01"
                  value={simDiscountVal}
                  onChange={(e) => setSimDiscountVal(e.target.value)}
                />
              </div>
            ) : null}

            <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Labour</span>
                <span>{formatCurrency(simulation.labourTotal, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Materials</span>
                <span>
                  {formatCurrency(simulation.materialsTotal, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>
                  -{formatCurrency(simulation.discountAmount, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(simulation.subtotal, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(simulation.taxTotal, currency)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-bold text-base">
                <span>Total</span>
                <span>{formatCurrency(simulation.total, currency)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Saved Pricing Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Pricing Rules ({rules.length})</CardTitle>
          <CardDescription>
            Business-specific rules ready for AI estimate drafting and quotes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No pricing rules configured yet.
            </p>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{rule.name}</span>
                      <Badge variant="outline" className="capitalize">
                        {rule.pricing_method.replace("_", " ")}
                      </Badge>
                      <Badge
                        variant={rule.is_active ? "success" : "secondary"}
                      >
                        {rule.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Rate: {formatCurrency(Number(rule.unit_rate), currency)} /{" "}
                      {rule.unit_type}
                      {Number(rule.base_fee) > 0
                        ? ` • Base fee: ${formatCurrency(Number(rule.base_fee), currency)}`
                        : ""}
                      {rule.min_charge != null
                        ? ` • Min: ${formatCurrency(Number(rule.min_charge), currency)}`
                        : ""}
                      {rule.markup_percent != null
                        ? ` • Markup: ${rule.markup_percent}%`
                        : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await togglePricingRuleActiveAction(
                          rule.id,
                          !rule.is_active
                        );
                        router.refresh();
                      }}
                    >
                      {rule.is_active ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await deletePricingRuleAction(rule.id);
                        router.refresh();
                      }}
                      className="text-destructive hover:text-destructive"
                      aria-label={`Delete rule ${rule.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

