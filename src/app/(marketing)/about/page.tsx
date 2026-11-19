import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Quoventra's mission to make professional estimating, quotation, and invoicing software accessible to businesses of all sizes.",
};

const principles = [
  {
    title: "Simplicity without compromise",
    body: "Business owners should be able to produce clear, itemized estimates without accounting software complexity.",
  },
  {
    title: "AI that respects your numbers",
    body: "AI reduces manual typing and structures scope, while your saved rates and backend calculations stay authoritative.",
  },
  {
    title: "Multi-industry by design",
    body: "Trades, field services, agencies, and independent professionals all quote differently—our pricing engine adapts to each.",
  },
  {
    title: "Trust and data isolation",
    body: "Every business operates in its own isolated tenant workspace with transparent document history.",
  },
];

export default function AboutPage() {
  return (
    <main className="flex-1 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 space-y-12">
        <div className="space-y-4">
          <Badge variant="outline">About {siteConfig.name}</Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Making professional estimating accessible to businesses of all sizes
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {siteConfig.name} ({siteConfig.tagline}) was created to help service
            businesses, contractors, and independent professionals turn job
            inquiries into clear, accurate estimates, client-approved
            quotations, and invoices faster.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {principles.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground leading-relaxed">
                {item.body}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="pt-2">
          <Link href="/register">
            <Button>
              Get Started Free
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

