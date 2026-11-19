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

export default async function OnboardingPage() {
  const user = await requireAuthUser();
  const context = await getActiveBusinessContext(user.id);
  if (context) {
    redirect("/dashboard");
  }

  const insforge = await createInsForgeServerClient();
  const { data: industriesData } = await insforge.database
    .from("industries")
    .select("id, name, slug, description")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const industries = (industriesData ?? []) as IndustryOption[];

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Set up your business</CardTitle>
          <CardDescription>
            Tell Quoventra about your business so we can configure your isolated
            workspace, currency, and industry defaults.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessForm
            mode="onboarding"
            industries={industries}
            initialValues={{
              businessName: "",
              ownerName: user.name,
              email: user.email,
              phone: "",
              website: "",
              address: "",
              city: "",
              region: "",
              country: "US",
              postalCode: "",
              currency: "USD",
              industryId: industries[0]?.id ?? "",
              description: "",
              taxRegistrationNumber: "",
              logoUrl: "",
              logoKey: "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

