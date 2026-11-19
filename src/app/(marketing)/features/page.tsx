import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { coreFeatures } from "@/config/marketing";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Explore Quoventra's AI estimate generation, quotation approval workflows, invoicing, customer CRM, and multi-industry pricing engine.",
};

export default function FeaturesPage() {
  return (
    <main className="flex-1 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-12">
        <div className="max-w-3xl space-y-4">
          <Badge variant="outline">Platform Capabilities</Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built to streamline estimating, quoting, and invoicing
          </h1>
          <p className="text-lg text-muted-foreground">
            Quoventra combines structured AI drafting with deterministic
            financial calculations and tenant-isolated business workflows.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {coreFeatures.map((feature) => (
            <Card key={feature.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-2">
                {feature.highlights.map((point) => (
                  <div
                    key={point}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-muted/40 p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">
              Ready to see a generated document?
            </h2>
            <p className="text-sm text-muted-foreground">
              Inspect a sample Quoventra quotation or create your free account.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/preview">
              <Button variant="outline">Document Preview</Button>
            </Link>
            <Link href="/register">
              <Button>
                Get Started Free
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

