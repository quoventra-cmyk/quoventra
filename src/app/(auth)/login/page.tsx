import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/auth-forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Quoventra business workspace.",
};

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Sign in to Quoventra</CardTitle>
        <CardDescription>
          Access your estimates, quotations, invoices, and customer workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}

