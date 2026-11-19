import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { pricingPlans } from "@/config/marketing";
import { cn } from "@/lib/utils";

export function PricingGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {pricingPlans.map((plan) => (
        <Card
          key={plan.id}
          className={cn(
            "flex flex-col",
            plan.highlighted && "border-primary shadow-md ring-1 ring-primary/20"
          )}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              {plan.highlighted ? <Badge>Most Popular</Badge> : null}
            </div>
            <div className="pt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight">
                ${plan.priceMonthly}
              </span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <CardDescription className="pt-1">{plan.description}</CardDescription>
          </CardHeader>

          <CardContent className="flex-1">
            <ul className="space-y-2.5 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check
                    className="h-4 w-4 text-primary shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>

          <CardFooter>
            <Link href={`/register?plan=${plan.id}`} className="w-full">
              <Button
                variant={plan.highlighted ? "default" : "outline"}
                className="w-full"
              >
                {plan.ctaLabel}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
