import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { howItWorksSteps } from "@/config/marketing";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Learn how Quoventra turns plain-language job descriptions into structured estimates, approved quotations, and invoices.",
};

export default function HowItWorksPage() {
  return (
    <main className="flex-1 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-12">
        <div className="max-w-3xl space-y-4">
          <Badge variant="outline">Workflow</Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            From job description to paid invoice in four clear steps
          </h1>
          <p className="text-lg text-muted-foreground">
            Quoventra keeps AI in an assistive role while your business rates
            and backend calculation engine guarantee financial accuracy.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {howItWorksSteps.map((step) => (
            <Card key={step.step}>
              <CardHeader>
                <span className="text-xs font-mono font-semibold text-primary">
                  STEP {step.step}
                </span>
                <CardTitle className="text-xl pt-1">{step.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/register">
            <Button size="lg">
              Create Your Workspace
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
          <Link href="/preview">
            <Button variant="outline" size="lg">
              Inspect Sample Quotation
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

