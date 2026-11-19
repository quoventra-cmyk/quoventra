import type { Metadata } from "next";
import { FaqSection } from "@/components/marketing/faq-section";
import { PricingGrid } from "@/components/marketing/pricing-grid";
import { Badge } from "@/components/ui/badge";
import { faqItems } from "@/config/marketing";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Compare Quoventra Free, Starter, Professional, and Business plans for AI estimates, quotations, and invoicing.",
};

export default function PricingPage() {
  return (
    <main className="flex-1 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <Badge variant="outline">Subscription Plans</Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Plans built for solo operators and growing teams
          </h1>
          <p className="text-lg text-muted-foreground">
            Start on the Free plan and upgrade when you need higher AI limits,
            custom document branding, team roles, or automated reminders.
          </p>
        </div>

        <PricingGrid />

        <div className="mx-auto max-w-3xl space-y-6">
          <h2 className="text-2xl font-bold tracking-tight text-center">
            Pricing &amp; Billing FAQ
          </h2>
          <FaqSection items={faqItems} />
        </div>
      </div>
    </main>
  );
}

