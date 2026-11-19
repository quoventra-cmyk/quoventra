import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { industriesList } from "@/config/marketing";

export const metadata: Metadata = {
  title: "Industries",
  description:
    "See how Quoventra supports construction, cleaning, landscaping, moving, plumbing, electrical, consulting, photography, and more.",
};

export default function IndustriesPage() {
  return (
    <main className="flex-1 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-12">
        <div className="max-w-3xl space-y-4">
          <Badge variant="outline">Multi-Industry Architecture</Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            One platform adaptable to every service industry
          </h1>
          <p className="text-lg text-muted-foreground">
            Quoventra avoids rigid single-trade formulas. Configure hourly,
            fixed, square-foot, distance, material, and custom pricing rules for
            your business.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {industriesList.map((industry) => (
            <Card key={industry.slug}>
              <CardHeader>
                <Badge variant="secondary" className="w-fit mb-1">
                  {industry.category}
                </Badge>
                <CardTitle className="text-lg">{industry.name}</CardTitle>
                <CardDescription>{industry.summary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="font-medium text-foreground mb-1.5">
                    Common pricing drivers
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {industry.pricingDrivers.map((driver) => (
                      <Badge key={driver} variant="outline">
                        {driver}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Example prompt:{" "}
                  </span>
                  {industry.exampleJob}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            Don&apos;t see your exact niche? Select &ldquo;Other&rdquo; during
            onboarding and define your own services and pricing rules.
          </p>
          <Link href="/register">
            <Button>
              Start Free Setup
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

