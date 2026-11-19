import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { AdSlot } from "@/components/ads/ad-slot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { resourceArticles } from "@/config/marketing";
import { getEligibleAdForPlacement } from "@/services/ads/queries";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Guides on estimating, quoting, pricing strategies, and invoicing workflows for service businesses.",
};

export default async function ResourcesPage() {
  const ad = await getEligibleAdForPlacement("public_resources", true);

  return (
    <main className="flex-1 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-12">
        <div className="max-w-2xl space-y-4">
          <Badge variant="outline">Resources &amp; Guides</Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Practical estimating and quoting guides
          </h1>
          <p className="text-lg text-muted-foreground">
            Learn how modern service businesses structure estimates, protect
            margins, and speed up client approvals.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {resourceArticles.map((article) => (
            <Card key={article.slug} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Badge variant="secondary">{article.category}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {article.readTime}
                  </span>
                </div>
                <CardTitle className="text-lg leading-snug">
                  {article.title}
                </CardTitle>
                <CardDescription className="pt-1">
                  {article.summary}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Guide</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <AdSlot ad={ad} />

        <div className="rounded-2xl border border-border bg-muted/30 p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">
              Put these workflows into practice
            </h2>
            <p className="text-sm text-muted-foreground">
              Start creating structured estimates and quotations with Quoventra.
            </p>
          </div>
          <Link href="/register">
            <Button>
              Start Free
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

