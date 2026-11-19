import type { Metadata } from "next";
import { Mail, MessageSquare } from "lucide-react";
import { ContactForm } from "@/components/marketing/contact-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact the Quoventra team for product questions, onboarding help, or business inquiries.",
};

export default function ContactPage() {
  return (
    <main className="flex-1 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-6">
            <Badge variant="outline">Contact Us</Badge>
            <h1 className="text-3xl font-bold tracking-tight">
              Get in touch with Quoventra
            </h1>
            <p className="text-muted-foreground">
              Have questions about multi-industry pricing rules, team plans, or
              onboarding your business? Send us a note.
            </p>

            <div className="space-y-4 pt-2 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Support Email</p>
                  <p className="text-muted-foreground">support@quoventra.com</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Response Window</p>
                  <p className="text-muted-foreground">
                    Monday–Friday, within 1 business day
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Send a message</CardTitle>
              <CardDescription>
                Fill out the form below and we will get back to you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContactForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

