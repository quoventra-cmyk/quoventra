"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name."),
  email: z.string().trim().email("Please enter a valid email address."),
  company: z.string().trim().optional(),
  message: z
    .string()
    .trim()
    .min(10, "Please share at least 10 characters about your inquiry."),
});

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const parsed = contactSchema.safeParse({ name, email, company, message });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your inputs.");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
          <span>Inquiry validated</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Thank you, {name}. Email delivery will be connected to our
          transactional email provider in Phase 9, or you can reach us directly
          at <span className="font-medium text-foreground">support@quoventra.com</span>.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSubmitted(false);
            setName("");
            setEmail("");
            setCompany("");
            setMessage("");
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="contact-name">Full name</Label>
          <Input
            id="contact-name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Morgan"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-email">Work email</Label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@company.com"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-company">Business name (optional)</Label>
        <Input
          id="contact-company"
          name="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Morgan Contracting Ltd."
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-message">How can we help?</Label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us about your industry, team size, or question..."
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          required
        />
      </div>

      <Button type="submit" className="w-full sm:w-auto">
        Send Message
      </Button>
    </form>
  );
}

