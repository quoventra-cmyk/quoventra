import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  FileCheck2,
  FileSpreadsheet,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { DashboardPreview } from "@/components/marketing/dashboard-preview";
import { FaqSection } from "@/components/marketing/faq-section";
import { PricingGrid } from "@/components/marketing/pricing-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  faqItems,
  howItWorksSteps,
  industriesList,
} from "@/config/marketing";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
};

const highlights = [
  {
    icon: Sparkles,
    title: "AI Estimate Drafting",
    description:
      "Convert plain-language job notes into itemized labour and material drafts using your saved rates.",
  },
  {
    icon: Calculator,
    title: "Multi-Industry Pricing Engine",
    description:
      "Support fixed, hourly, square-foot, distance, material, and custom pricing with decimal-safe totals.",
  },
  {
    icon: FileCheck2,
    title: "Quotations & Client Approval",
    description:
      "Share secure quotation links where customers can review terms, approve, or request revisions.",
  },
  {
    icon: FileSpreadsheet,
    title: "Invoices & Branded PDFs",
    description:
      "Convert approved quotes into invoices, track payments, and export clean client-ready PDFs.",
  },
  {
    icon: Users,
    title: "Customer CRM",
    description:
      "Keep individual and commercial client details, document histories, and balances in one place.",
  },
  {
    icon: ShieldCheck,
    title: "Business Control & Security",
    description:
      "AI never invents prices or sends documents without your review. Data is isolated per business.",
  },
];

export default function HomePage() {
  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-indigo-50/70 via-background to-background dark:from-indigo-950/30">
        <div
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-80 w-[44rem] rounded-full bg-gradient-to-r from-blue-500/15 via-indigo-500/15 to-violet-500/15 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl text-center space-y-6">
            <Badge
              variant="outline"
              className="rounded-full border-indigo-200 bg-white/80 px-3.5 py-1 text-indigo-700 shadow-xs dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
              {siteConfig.tagline}
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              AI-powered{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                estimates, quotations and invoicing
              </span>{" "}
              for modern businesses.
            </h1>
            <p className="text-lg text-muted-foreground sm:text-xl">
              Turn simple job descriptions into accurate, itemized estimates
              using your own pricing rules—then convert them into approved
              quotations and invoices without losing control.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/register">
                <Button
                  size="lg"
                  className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-600/25"
                >
                  Start Free
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/preview">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto rounded-xl bg-card/80 backdrop-blur-xs"
                >
                  View Document Preview
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                No fabricated pricing
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Multi-industry pricing rules
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Free plan available
              </span>
            </div>
          </div>

          <div className="mt-12 sm:mt-16">
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* Feature Overview */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-10">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">
              Everything you need from first estimate to paid invoice
            </h2>
            <p className="text-muted-foreground">
              Built for real service businesses that need speed from AI without
              giving up pricing accuracy or client professionalism.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title}>
                  <CardHeader>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>

          <div>
            <Link href="/features">
              <Button variant="outline">
                Explore all features
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Supported Industries */}
      <section className="border-y border-border bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl space-y-3">
              <h2 className="text-3xl font-bold tracking-tight">
                Designed for multi-industry service businesses
              </h2>
              <p className="text-muted-foreground">
                Whether you quote by square foot, crew hours, fixed packages, or
                materials, Quoventra adapts to your workflow.
              </p>
            </div>
            <Link href="/industries">
              <Button variant="ghost">
                All industries
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {industriesList.slice(0, 6).map((industry) => (
              <Card key={industry.slug}>
                <CardHeader className="pb-3">
                  <Badge variant="secondary" className="w-fit mb-1">
                    {industry.category}
                  </Badge>
                  <CardTitle className="text-base">{industry.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>{industry.summary}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-10">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">
              How Quoventra works
            </h2>
            <p className="text-muted-foreground">
              Four structured steps from job inquiry to paid invoice.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorksSteps.map((step) => (
              <Card key={step.step}>
                <CardHeader>
                  <span className="text-xs font-mono font-semibold text-primary">
                    STEP {step.step}
                  </span>
                  <CardTitle className="text-base pt-1">{step.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {step.description}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="border-y border-border bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">
              Simple, transparent plans
            </h2>
            <p className="text-muted-foreground">
              Start free and scale as your estimating volume and team grow.
            </p>
          </div>

          <PricingGrid />
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
              Frequently asked questions
            </h2>
            <p className="text-muted-foreground">
              Clear answers on AI pricing rules, security, and client approvals.
            </p>
          </div>
          <FaqSection items={faqItems} />
        </div>
      </section>
    </main>
  );
}
