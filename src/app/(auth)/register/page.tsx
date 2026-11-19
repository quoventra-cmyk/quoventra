import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/auth-forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a free Quoventra account for your business.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create your Quoventra account</CardTitle>
        <CardDescription>
          Start generating AI-assisted estimates and professional quotations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm defaultPlan={plan} />
      </CardContent>
    </Card>
  );
}

