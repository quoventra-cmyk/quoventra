import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of Service for ${siteConfig.name}.`,
};

export default function TermsPage() {
  return (
    <main className="flex-1 py-16 sm:py-20">
      <article className="mx-auto max-w-3xl px-4 sm:px-6 space-y-6">
        <div className="space-y-2 border-b border-border pb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground">
            Effective Date: November 2026 — {siteConfig.name}
          </p>
        </div>

        <section className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">
            1. Use of Service
          </h2>
          <p>
            {siteConfig.name} provides software tools for creating estimates,
            quotations, and invoices. You are responsible for reviewing all
            pricing, tax rates, terms, and final documents before sending them
            to your customers.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">
            2. AI-Generated Drafts
          </h2>
          <p>
            AI estimate drafts are assistive starting points. You retain full
            responsibility and control over final quantities, unit prices,
            taxes, and contractual terms.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">
            3. Subscriptions &amp; Billing
          </h2>
          <p>
            Paid plans are billed on a recurring monthly basis through Stripe.
            You may upgrade, downgrade, or cancel your subscription at any time
            from your billing portal.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">
            4. Contact
          </h2>
          <p>
            Questions regarding these terms may be sent to{" "}
            <span className="font-medium text-foreground">
              legal@quoventra.com
            </span>
            .
          </p>
        </section>
      </article>
    </main>
  );
}

