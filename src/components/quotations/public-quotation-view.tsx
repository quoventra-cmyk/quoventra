"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, MessageSquareWarning, XCircle } from "lucide-react";
import { submitPublicQuotationResponseAction } from "@/app/q/[token]/actions";
import { Badge } from "@/components/ui/badge";
import type { DocumentTemplateStyle } from "@/components/ui/document-color-picker";
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
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/pricing/engine";

export interface PublicQuotationPayload {
  quotation_number: string;
  title: string;
  description: string | null;
  status: string;
  currency: string;
  subtotal: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  terms: string | null;
  issue_date: string;
  expiry_date: string | null;
  approved_at: string | null;
  customer_name: string | null;
  business: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    region?: string | null;
    country?: string | null;
    logo_url?: string | null;
    brand_color?: string | null;
    template_style?: DocumentTemplateStyle | null;
  };
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    quantity: number;
    unit: string;
    unit_price: number;
    line_total: number;
  }>;
  approvals: Array<{
    decision: string;
    customer_name: string;
    comment: string | null;
    created_at: string;
  }>;
}

export function PublicQuotationView({
  token,
  quotation,
}: {
  token: string;
  quotation: PublicQuotationPayload;
}) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState(
    quotation.customer_name ?? ""
  );
  const [customerEmail, setCustomerEmail] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const isLocked =
    quotation.status === "converted" || quotation.status === "expired";
  const accent =
    quotation.business?.brand_color &&
    /^#[0-9a-fA-F]{6}$/.test(quotation.business.brand_color)
      ? quotation.business.brand_color
      : "#2563eb";
  const templateStyle: DocumentTemplateStyle =
    quotation.business?.template_style ?? "executive_sidebar";
  const logoSrc = quotation.business?.logo_url || "/quoventra-logo.png";
  const isDarkHeader =
    templateStyle === "executive_sidebar" ||
    templateStyle === "bold_split_header" ||
    templateStyle === "sleek_agency";

  async function handleDecision(
    decision: "approved" | "rejected" | "changes_requested"
  ) {
    setError(null);
    setDoneMessage(null);
    setSubmitting(true);
    try {
      const res = await submitPublicQuotationResponseAction({
        token,
        decision,
        customerName,
        customerEmail,
        comment: comment || undefined,
      });

      if (!res.ok) {
        setError(res.error ?? "Failed to submit response.");
        return;
      }

      setDoneMessage(
        decision === "approved"
          ? "Thank you! Quotation accepted and recorded."
          : decision === "rejected"
            ? "Quotation declined and recorded."
            : "Revision request submitted to the business."
      );
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-muted/20 py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <Card
          className={
            templateStyle === "royal_bordered"
              ? "overflow-hidden rounded-2xl shadow-lg border-4"
              : templateStyle === "minimal_swiss"
                ? "overflow-hidden rounded-2xl shadow-lg border-border/80 border-l-8"
                : "overflow-hidden rounded-2xl shadow-lg border-border/80"
          }
          style={
            templateStyle === "royal_bordered"
              ? { borderColor: accent }
              : templateStyle === "minimal_swiss"
                ? { borderLeftColor: accent }
                : undefined
          }
        >
          {!isDarkHeader &&
          templateStyle !== "royal_bordered" &&
          templateStyle !== "minimal_swiss" ? (
            <div
              className={
                templateStyle === "classic_banner"
                  ? "h-4 w-full"
                  : "h-2.5 w-full"
              }
              style={{ backgroundColor: accent }}
            />
          ) : null}
          <CardHeader
            className={
              templateStyle === "sleek_agency"
                ? "bg-slate-950 p-6 sm:p-8 text-white border-b-4"
                : isDarkHeader
                  ? "p-6 sm:p-8 text-white"
                  : templateStyle === "modern_corporate" ||
                      templateStyle === "compact_contractor"
                    ? "border-b border-border bg-muted/50 p-6 sm:p-8"
                    : "border-b border-border bg-card p-6 sm:p-8"
            }
            style={
              templateStyle === "sleek_agency"
                ? { borderBottomColor: accent }
                : isDarkHeader
                  ? { backgroundColor: accent }
                  : undefined
            }
          >
            <div
              className={
                templateStyle === "centered_prestige"
                  ? "flex flex-col items-center text-center gap-3"
                  : "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
              }
            >
              <div
                className={
                  templateStyle === "centered_prestige"
                    ? "flex flex-col items-center space-y-2"
                    : "flex items-start gap-4"
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoSrc}
                  alt={quotation.business.name ?? "Business logo"}
                  className="h-14 w-16 shrink-0 rounded-xl border border-border/60 bg-white p-1.5 object-contain shadow-xs"
                />
                <div className="space-y-1.5">
                  <span
                    className="inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                    style={
                      isDarkHeader
                        ? { backgroundColor: "#ffffff", color: accent }
                        : { backgroundColor: accent, color: "#ffffff" }
                    }
                  >
                    Quotation
                  </span>
                  <p
                    className={
                      isDarkHeader
                        ? "text-sm font-semibold text-white/90 pt-1"
                        : "text-sm font-semibold text-muted-foreground pt-1"
                    }
                  >
                    From {quotation.business.name ?? "Business"}
                  </p>
                  <CardTitle
                    className={
                      isDarkHeader
                        ? "text-2xl sm:text-3xl font-extrabold tracking-tight text-white"
                        : "text-2xl sm:text-3xl font-extrabold tracking-tight"
                    }
                  >
                    {quotation.title}
                  </CardTitle>
                  <CardDescription
                    className={
                      isDarkHeader
                        ? "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/85"
                        : "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
                    }
                  >
                    <span
                      className={
                        isDarkHeader
                          ? "font-mono font-bold text-white"
                          : "font-mono font-bold text-foreground"
                      }
                    >
                      {quotation.quotation_number}
                    </span>
                    <span>• Issue Date: {quotation.issue_date}</span>
                    {quotation.expiry_date ? (
                      <span>• Valid Until: {quotation.expiry_date}</span>
                    ) : null}
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant={
                  quotation.status === "approved"
                    ? "success"
                    : quotation.status === "rejected"
                      ? "destructive"
                      : "outline"
                }
                className="capitalize w-fit rounded-full px-3 py-1 text-xs font-bold bg-white/95 text-slate-900"
              >
                {quotation.status.replace("_", " ")}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-6">
            {quotation.description ? (
              <div
                className="rounded-xl bg-muted/40 p-4 border-l-4 text-sm text-muted-foreground leading-relaxed"
                style={{ borderLeftColor: accent }}
              >
                {quotation.description}
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead
                  className="text-xs text-white uppercase tracking-wider"
                  style={{ backgroundColor: accent }}
                >
                  <tr>
                    <th className="px-4 py-3 font-semibold">Item</th>
                    <th className="px-4 py-3 font-semibold">Qty</th>
                    <th className="px-4 py-3 font-semibold">Unit Price</th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {quotation.items.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={idx % 2 === 1 ? "bg-muted/25" : "bg-card"}
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-foreground">
                          {item.name}
                        </p>
                        {item.description ? (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5">
                        {Number(item.quantity)} {item.unit}
                      </td>
                      <td className="px-4 py-3.5">
                        {formatCurrency(
                          Number(item.unit_price),
                          quotation.currency
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold">
                        {formatCurrency(
                          Number(item.line_total),
                          quotation.currency
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-end">
              <div className="w-full max-w-xs rounded-xl border border-border bg-muted/30 p-4 space-y-2 text-sm">
                {Number(quotation.discount_amount) > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span>
                      -
                      {formatCurrency(
                        Number(quotation.discount_amount),
                        quotation.currency
                      )}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>
                    {formatCurrency(
                      Number(quotation.subtotal),
                      quotation.currency
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Tax ({(Number(quotation.tax_rate) * 100).toFixed(2)}%)
                  </span>
                  <span>
                    {formatCurrency(
                      Number(quotation.tax_amount),
                      quotation.currency
                    )}
                  </span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between text-base font-extrabold pt-1">
                  <span>Total</span>
                  <span style={{ color: accent }}>
                    {formatCurrency(
                      Number(quotation.total),
                      quotation.currency
                    )}
                  </span>
                </div>
              </div>
            </div>

            {quotation.terms ? (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs space-y-1">
                <p className="font-semibold text-foreground">
                  Terms &amp; Conditions
                </p>
                <p className="text-muted-foreground whitespace-pre-line">
                  {quotation.terms}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Customer Response / Approval Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Respond to this Quotation</CardTitle>
            <CardDescription>
              Verify your name and email to accept, decline, or request changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            ) : null}
            {doneMessage ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                {doneMessage}
              </div>
            ) : null}

            {isLocked ? (
              <p className="text-sm text-muted-foreground">
                This quotation is marked as{" "}
                <span className="font-medium">{quotation.status}</span> and can
                no longer be modified.
              </p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="resp-name">Your full name *</Label>
                    <Input
                      id="resp-name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Alex Morgan"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="resp-email">Your email *</Label>
                    <Input
                      id="resp-email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="alex@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="resp-comment">
                    Comments or requested changes (optional)
                  </Label>
                  <textarea
                    id="resp-comment"
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add any notes, questions, or revision details..."
                    className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleDecision("approved")}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Accept Quotation
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => handleDecision("changes_requested")}
                  >
                    <MessageSquareWarning className="h-4 w-4" />
                    Request Changes
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={submitting}
                    onClick={() => handleDecision("rejected")}
                  >
                    <XCircle className="h-4 w-4" />
                    Decline
                  </Button>
                </div>
              </>
            )}

            {quotation.approvals.length > 0 ? (
              <div className="pt-4 border-t border-border space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Response Log
                </p>
                <ul className="space-y-2 text-xs">
                  {quotation.approvals.map((a, i) => (
                    <li
                      key={i}
                      className="rounded-lg bg-muted/40 p-2.5 flex flex-col gap-0.5"
                    >
                      <span className="font-medium capitalize">
                        {a.decision.replace("_", " ")} by {a.customer_name} •{" "}
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                      {a.comment ? (
                        <span className="text-muted-foreground">
                          &ldquo;{a.comment}&rdquo;
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

