import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy Policy for ${siteConfig.name}.`,
};

export default function PrivacyPage() {
  return (
    <main className="flex-1 py-16 sm:py-20">
      <article className="mx-auto max-w-3xl px-4 sm:px-6 space-y-6">
        <div className="space-y-2 border-b border-border pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">
            Effective Date: November 2026 — {siteConfig.name}
          </p>
        </div>

        <section className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">
            1. Information We Collect
          </h2>
          <p>
            {siteConfig.name} collects account registration details, business
            profile information, customer records, and financial document data
            (estimates, quotations, and invoices) that you voluntarily provide
            to operate your workspace.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">
            2. Tenant Isolation &amp; Security
          </h2>
          <p>
            Each business workspace is logically isolated at the database level
            using row-level security. We never share your private pricing rules,
            customer lists, or estimates with other businesses on the platform.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">
            3. AI Processing
          </h2>
          <p>
            When you use AI Estimate Generation, your job description and
            relevant catalog context are transmitted securely to the configured
            server-side AI provider to draft structured line items. Private
            credentials are never exposed to client browsers.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">
            4. Contact
          </h2>
          <p>
            For privacy inquiries or data deletion requests, contact{" "}
            <span className="font-medium text-foreground">
              privacy@quoventra.com
            </span>
            .
          </p>
        </section>
      </article>
    </main>
  );
}

