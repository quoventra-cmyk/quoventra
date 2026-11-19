"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
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
  generateAIEstimateAction,
  saveAIEstimateDraftAction,
} from "@/lib/ai/actions";
import { PRICING_METHODS } from "@/lib/pricing/constants";
import {
  calculateDocumentPricing,
  formatCurrency,
  type LineItemCategory,
} from "@/lib/pricing/engine";
import type { PricingMethod } from "@/types";

interface EditableLineItem {
  name: string;
  description: string;
  category: LineItemCategory;
  pricingMethod: PricingMethod;
  quantity: string;
  unit: string;
  unitPrice: string;
  pricingSource: "business_rate" | "user_provided" | "missing";
  isTaxable: boolean;
  needsPrice: boolean;
  needsQuantity: boolean;
}

export interface AIHistorySummary {
  id: string;
  provider: string;
  model: string;
  prompt: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface AIEstimateGeneratorProps {
  businessName: string;
  currency: string;
  defaultTaxRate: number;
  defaultIndustryName: string;
  industries: { id: string; name: string }[];
  aiProviderStatus: {
    provider: string;
    model: string;
    configured: boolean;
  };
  recentHistory: AIHistorySummary[];
}

export function AIEstimateGenerator({
  businessName,
  currency,
  defaultTaxRate,
  defaultIndustryName,
  industries,
  aiProviderStatus,
  recentHistory,
}: AIEstimateGeneratorProps) {
  const router = useRouter();

  // Prompt inputs
  const [projectDescription, setProjectDescription] = useState("");
  const [industryName, setIndustryName] = useState(defaultIndustryName);
  const [customerName, setCustomerName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [measurements, setMeasurements] = useState("");
  const [labourDetails, setLabourDetails] = useState("");
  const [materialsDetails, setMaterialsDetails] = useState("");
  const [requirements, setRequirements] = useState("");

  // Draft state
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [missingInformation, setMissingInformation] = useState<string[]>([]);
  const [items, setItems] = useState<EditableLineItem[]>([]);
  const [taxRatePercent, setTaxRatePercent] = useState(
    String((defaultTaxRate * 100).toFixed(2))
  );

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const liveSummary = useMemo(() => {
    if (items.length === 0) return null;
    const taxDecimal = (Number(taxRatePercent) || 0) / 100;
    return calculateDocumentPricing({
      items: items.map((item) => ({
        name: item.name || "Untitled item",
        category: item.category,
        pricingMethod: item.pricingMethod,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        isTaxable: item.isTaxable,
      })),
      defaultTaxRate,
      documentTaxRateOverride: taxDecimal,
    });
  }, [items, taxRatePercent, defaultTaxRate]);

  async function handleGenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSavedNotice(null);
    setGenerating(true);

    try {
      const res = await generateAIEstimateAction({
        projectDescription,
        industryName,
        customerName: customerName || undefined,
        projectLocation: projectLocation || undefined,
        measurements: measurements || undefined,
        labourDetails: labourDetails || undefined,
        materialsDetails: materialsDetails || undefined,
        requirements: requirements || undefined,
      });

      if (!res.ok || !res.draft) {
        setError(res.error ?? "Failed to generate estimate.");
        return;
      }

      setGenerationId(res.generationId ?? null);
      setTitle(res.draft.project_title);
      setDescription(res.draft.description);
      setNotes(res.draft.notes.join("\n"));
      setAssumptions(res.draft.assumptions);
      setMissingInformation(res.draft.missing_information);
      setItems(
        res.draft.line_items.map((item) => ({
          name: item.name,
          description: item.description,
          category: item.category,
          pricingMethod: item.pricing_method,
          quantity: item.quantity != null ? String(item.quantity) : "",
          unit: item.unit,
          unitPrice: item.unit_price != null ? String(item.unit_price) : "",
          pricingSource: item.pricing_source,
          isTaxable: item.is_taxable,
          needsPrice: item.needs_price || item.unit_price == null,
          needsQuantity: item.needs_quantity || item.quantity == null,
        }))
      );
      router.refresh();
    } finally {
      setGenerating(false);
    }
  }

  function addBlankLineItem() {
    setItems((prev) => [
      ...prev,
      {
        name: "",
        description: "",
        category: "service",
        pricingMethod: "fixed",
        quantity: "1",
        unit: "unit",
        unitPrice: "0",
        pricingSource: "user_provided",
        isTaxable: true,
        needsPrice: false,
        needsQuantity: false,
      },
    ]);
  }

  async function handleSaveDraft() {
    setError(null);
    setSavedNotice(null);

    const missingInputs = items.some(
      (i) => i.quantity.trim() === "" || i.unitPrice.trim() === ""
    );
    if (missingInputs) {
      setError(
        "Fill in all missing quantities and unit prices before saving the estimate."
      );
      return;
    }

    setSaving(true);
    try {
      const res = await saveAIEstimateDraftAction({
        title,
        description,
        customerName: customerName || undefined,
        notes: notes || undefined,
        assumptions,
        missingInformation,
        aiGenerationId: generationId,
        taxRateOverridePercent: Number(taxRatePercent),
        discountType: "none",
        discountValue: 0,
        items: items.map((i) => ({
          name: i.name,
          description: i.description,
          category: i.category,
          pricingMethod: i.pricingMethod,
          quantity: Number(i.quantity) || 0,
          unit: i.unit,
          unitPrice: Number(i.unitPrice) || 0,
          pricingSource: i.pricingSource,
          isTaxable: i.isTaxable,
        })),
      });

      if (!res.ok) {
        setError(res.error ?? "Failed to save estimate.");
        return;
      }

      setSavedNotice(
        `Estimate ${res.estimateNumber} saved to database as a draft.`
      );
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {!aiProviderStatus.configured ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">
              AI provider API key not configured ({aiProviderStatus.provider})
            </p>
            <p className="text-xs mt-1">
              Set{" "}
              <code className="font-mono">
                {aiProviderStatus.provider === "openrouter"
                  ? "OPENROUTER_API_KEY"
                  : aiProviderStatus.provider === "anthropic"
                    ? "ANTHROPIC_API_KEY"
                    : "OPENAI_API_KEY"}
              </code>{" "}
              in <code className="font-mono">.env.local</code> to enable live
              AI estimate generation. You can still build and save manual line
              items below.
            </p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {savedNotice ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Project Prompt Form */}
        <Card className="lg:col-span-2 h-fit">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>Describe the Job</CardTitle>
              </div>
              <Badge variant="outline" className="text-[11px]">
                {aiProviderStatus.provider}
              </Badge>
            </div>
            <CardDescription>
              Quoventra AI uses {businessName}&apos;s saved catalog and pricing
              rules without inventing prices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ai-desc">Project description *</Label>
                <textarea
                  id="ai-desc"
                  rows={4}
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="e.g. Renovate a 500 sq ft basement. Labour costs $45/hr for 80 hours. Materials are expected to cost $4,500."
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ai-industry">Industry</Label>
                  <select
                    id="ai-industry"
                    value={industryName}
                    onChange={(e) => setIndustryName(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                  >
                    {industries.map((ind) => (
                      <option key={ind.id} value={ind.name}>
                        {ind.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ai-customer">Customer (optional)</Label>
                  <Input
                    id="ai-customer"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Client or company name"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ai-location">Location (optional)</Label>
                  <Input
                    id="ai-location"
                    value={projectLocation}
                    onChange={(e) => setProjectLocation(e.target.value)}
                    placeholder="City or site address"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ai-measurements">Measurements (optional)</Label>
                  <Input
                    id="ai-measurements"
                    value={measurements}
                    onChange={(e) => setMeasurements(e.target.value)}
                    placeholder="e.g. 500 sq ft, 3 rooms"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ai-labour">Labour details (optional)</Label>
                  <Input
                    id="ai-labour"
                    value={labourDetails}
                    onChange={(e) => setLabourDetails(e.target.value)}
                    placeholder="e.g. 2 crew, 80 hours"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ai-materials">Materials (optional)</Label>
                  <Input
                    id="ai-materials"
                    value={materialsDetails}
                    onChange={(e) => setMaterialsDetails(e.target.value)}
                    placeholder="e.g. Drywall, lumber"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ai-req">Project requirements (optional)</Label>
                <Input
                  id="ai-req"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="Any special site access or timeline notes"
                />
              </div>

              <Button type="submit" className="w-full" disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Estimate...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Estimate
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right: Structured Estimate Draft Editor */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Structured Estimate Draft</CardTitle>
              <CardDescription>
                Review AI assumptions, fill missing prices or quantities, and
                edit any line item before saving.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addBlankLineItem}
            >
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </CardHeader>

          <CardContent className="space-y-5">
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-2">
                <p className="text-sm font-medium">No draft generated yet</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Describe your project on the left and click Generate Estimate,
                  or click &ldquo;Add Item&rdquo; to start a manual draft.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="draft-title">Project title</Label>
                    <Input
                      id="draft-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Project title"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="draft-tax">Tax rate (%)</Label>
                    <Input
                      id="draft-tax"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={taxRatePercent}
                      onChange={(e) => setTaxRatePercent(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="draft-desc">Scope description</Label>
                  <textarea
                    id="draft-desc"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                {missingInformation.length > 0 ? (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs space-y-1">
                    <p className="font-semibold text-amber-800 dark:text-amber-300">
                      Missing information flagged by AI:
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5 text-amber-800/90 dark:text-amber-300/90">
                      {missingInformation.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {assumptions.length > 0 ? (
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1">
                    <p className="font-semibold">AI Assumptions:</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                      {assumptions.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* Editable Line Items */}
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-border p-3 space-y-3 bg-background"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize">
                            {item.category}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {item.pricingSource.replace("_", " ")}
                          </Badge>
                          {item.needsPrice || item.needsQuantity ? (
                            <Badge variant="warning">Needs input</Badge>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setItems((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Remove line item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                          value={item.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItems((prev) =>
                              prev.map((row, i) =>
                                i === idx ? { ...row, name: val } : row
                              )
                            );
                          }}
                          placeholder="Line item name"
                        />
                        <select
                          value={item.pricingMethod}
                          onChange={(e) => {
                            const val = e.target.value as PricingMethod;
                            setItems((prev) =>
                              prev.map((row, i) =>
                                i === idx ? { ...row, pricingMethod: val } : row
                              )
                            );
                          }}
                          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                        >
                          {PRICING_METHODS.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-4">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItems((prev) =>
                              prev.map((row, i) =>
                                i === idx
                                  ? {
                                      ...row,
                                      quantity: val,
                                      needsQuantity: val.trim() === "",
                                    }
                                  : row
                              )
                            );
                          }}
                          placeholder="Qty"
                        />
                        <Input
                          value={item.unit}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItems((prev) =>
                              prev.map((row, i) =>
                                i === idx ? { ...row, unit: val } : row
                              )
                            );
                          }}
                          placeholder="Unit"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItems((prev) =>
                              prev.map((row, i) =>
                                i === idx
                                  ? {
                                      ...row,
                                      unitPrice: val,
                                      needsPrice: val.trim() === "",
                                    }
                                  : row
                              )
                            );
                          }}
                          placeholder="Unit price"
                        />
                        <div className="flex items-center justify-end text-sm font-semibold">
                          {formatCurrency(
                            liveSummary?.items[idx]?.lineSubtotal ?? 0,
                            currency
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {liveSummary ? (
                  <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Labour</span>
                      <span>
                        {formatCurrency(liveSummary.labourTotal, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Materials</span>
                      <span>
                        {formatCurrency(liveSummary.materialsTotal, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>
                        {formatCurrency(liveSummary.subtotal, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span>
                        {formatCurrency(liveSummary.taxTotal, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 font-bold text-base">
                      <span>Estimated Total</span>
                      <span>{formatCurrency(liveSummary.total, currency)}</span>
                    </div>
                  </div>
                ) : null}

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving Draft...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Estimate Draft
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent AI Generation History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent AI Generation History</CardTitle>
          <CardDescription>
            Audit trail of recent AI estimate requests for {businessName}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No AI generations recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {recentHistory.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 text-sm"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="truncate font-medium">{row.prompt}</p>
                    <p
                      className="text-xs text-muted-foreground"
                      suppressHydrationWarning
                    >
                      {row.provider} ({row.model}) •{" "}
                      {new Date(row.created_at).toLocaleString()}
                    </p>
                    {row.error_message ? (
                      <p className="text-xs text-destructive">
                        {row.error_message}
                      </p>
                    ) : null}
                  </div>
                  <Badge
                    variant={row.status === "success" ? "success" : "destructive"}
                  >
                    {row.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

