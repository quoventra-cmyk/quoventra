import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Document Preview",
  description:
    "Preview how Quoventra formats itemized estimates and client-ready quotations.",
};

export default function PublicPreviewPage() {
  return (
    <main className="flex-1 py-16 sm:py-20 bg-muted/20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Badge variant="outline">Sample Document Preview</Badge>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Quotation Layout Preview
            </h1>
          </div>
          <Link href="/register">
            <Button>
              Create Your Own
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>

        <Card className="shadow-md">
          <CardHeader className="border-b border-border bg-muted/30">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">Quotation QUO-2026-014</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sample Business Name • 123 Service Way • (555) 010-2000
                </p>
              </div>
              <div className="text-sm sm:text-right space-y-1">
                <Badge variant="success">Pending Client Review</Badge>
                <p className="text-xs text-muted-foreground">
                  Issue Date: Nov 15, 2026 • Valid for 14 days
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Prepared For
                </p>
                <p className="font-medium mt-1">Sample Client</p>
                <p className="text-muted-foreground">
                  450 Oakridge Ave, Suite 200
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Project Scope
                </p>
                <p className="font-medium mt-1">
                  500 sq ft Basement Renovation
                </p>
                <p className="text-muted-foreground">
                  Framing, drywall installation, taping, and finishing.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Item</th>
                    <th className="px-4 py-2.5 font-medium">Qty</th>
                    <th className="px-4 py-2.5 font-medium">Unit Price</th>
                    <th className="px-4 py-2.5 font-medium text-right">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-3">
                      <p className="font-medium">Renovation Labour</p>
                      <p className="text-xs text-muted-foreground">
                        Crew hours at configured business rate
                      </p>
                    </td>
                    <td className="px-4 py-3">80 hrs</td>
                    <td className="px-4 py-3">$45.00</td>
                    <td className="px-4 py-3 text-right font-medium">
                      $3,600.00
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">
                      <p className="font-medium">Materials</p>
                      <p className="text-xs text-muted-foreground">
                        Lumber, drywall sheets, fasteners, compound
                      </p>
                    </td>
                    <td className="px-4 py-3">1 lot</td>
                    <td className="px-4 py-3">$4,500.00</td>
                    <td className="px-4 py-3 text-right font-medium">
                      $4,500.00
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-end space-y-1.5 text-sm">
              <div className="flex w-full max-w-xs justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>$8,100.00</span>
              </div>
              <div className="flex w-full max-w-xs justify-between">
                <span className="text-muted-foreground">
                  Tax (configured per business)
                </span>
                <span>$405.00</span>
              </div>
              <Separator className="max-w-xs my-1" />
              <div className="flex w-full max-w-xs justify-between text-base font-bold">
                <span>Estimated Total</span>
                <span>$8,505.00</span>
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-4 text-xs text-muted-foreground flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                In the live application (Phase 6), customers receive a unique,
                verified share link where they can accept, reject, or request
                changes with full audit history.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

