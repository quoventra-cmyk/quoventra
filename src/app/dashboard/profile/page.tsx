import { redirect } from "next/navigation";
import { BusinessForm } from "@/components/dashboard/business-onboarding-form";
import type { IndustryOption } from "@/components/dashboard/industry-selector";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getActiveBusinessContext, requireAuthUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";

export default async function BusinessProfilePage() {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (!context) {
    redirect("/dashboard/onboarding");
  }

  const insforge = await createInsForgeServerClient();
  const { data: industriesData } = await insforge.database
    .from("industries")
    .select("id, name, slug, description")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const industries = (industriesData ?? []) as IndustryOption[];
  const { business, settings } = context;

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Business Profile</CardTitle>
          <CardDescription>
            Update your business contact details, industry, branding logo, and
            default document settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessForm
            mode="edit"
            industries={industries}
            initialValues={{
              businessName: business.name,
              ownerName: user.name,
              email: business.email ?? user.email,
              phone: business.phone ?? "",
              website: business.website ?? "",
              address: business.address ?? "",
              city: business.city ?? "",
              region: business.region ?? "",
              country: business.country,
              postalCode: business.postal_code ?? "",
              currency: business.currency,
              industryId: business.industry_id ?? industries[0]?.id ?? "",
              description: business.description ?? "",
              taxRegistrationNumber: business.tax_registration_number ?? "",
              logoUrl: business.logo_url ?? "",
              logoKey: business.logo_key ?? "",
              defaultTaxRatePercent: settings
                ? String(Number(settings.default_tax_rate) * 100)
                : "0",
              documentPrefix: settings?.document_prefix ?? "QVN",
              defaultPaymentTerms:
                settings?.default_payment_terms ?? "Due within 14 days",
              defaultExpiryDays: String(settings?.default_expiry_days ?? 14),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

