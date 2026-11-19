import type { Metadata } from "next";
import { VerifyEmailForm } from "@/components/auth/auth-forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify your email address to activate your Quoventra account.",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Verify your email</CardTitle>
        <CardDescription>
          Enter your email and the 6-digit verification code sent to your
          inbox.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <VerifyEmailForm defaultEmail={email ?? ""} />
      </CardContent>
    </Card>
  );
}
