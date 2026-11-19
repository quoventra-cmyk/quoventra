import { AlertCircle, CheckCircle2, FileText, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function DashboardPreview() {
  return (
    <div className="rounded-3xl border border-indigo-100 dark:border-indigo-900/60 bg-card shadow-xl shadow-blue-900/10 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-700 px-5 py-3.5 text-white">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 text-xs font-semibold text-blue-100">
            Quoventra Workspace — AI Estimate Draft
          </span>
        </div>
        <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30">
          Draft Ready
        </Badge>
      </div>

      <div className="grid lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-border">
        <div className="lg:col-span-2 p-5 space-y-4 bg-muted/20">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>Job Description Input</span>
          </div>
          <div className="rounded-lg border border-border bg-background p-3.5 text-sm text-foreground leading-relaxed">
            &ldquo;Renovate a 500 sq ft basement. Labour is $45/hr for an
            estimated 80 hours. Materials are expected to cost $4,500.&rdquo;
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Matched saved labour rate ($45.00/hr)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Separated labour from materials</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Flagged permit fee &amp; tax jurisdiction for review</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold">
                Basement Renovation — EST-1042
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Editable before sending
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Line Item</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Rate</th>
                  <th className="px-3 py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-foreground">
                      Renovation Labour
                    </div>
                    <div className="text-muted-foreground">
                      Framing, drywall, finishing
                    </div>
                  </td>
                  <td className="px-3 py-2.5">80 hrs</td>
                  <td className="px-3 py-2.5">$45.00</td>
                  <td className="px-3 py-2.5 text-right font-medium">
                    $3,600.00
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-foreground">
                      Materials Package
                    </div>
                    <div className="text-muted-foreground">
                      Lumber, drywall, hardware
                    </div>
                  </td>
                  <td className="px-3 py-2.5">1 lot</td>
                  <td className="px-3 py-2.5">$4,500.00</td>
                  <td className="px-3 py-2.5 text-right font-medium">
                    $4,500.00
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border text-sm">
            <span className="text-xs text-muted-foreground">
              Totals calculated by backend pricing engine
            </span>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="text-base font-bold text-foreground">
                $8,100.00
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
