"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import {
  IndustrySelector,
  type IndustryOption,
} from "@/components/dashboard/industry-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createBusinessAction,
  updateBusinessProfileAction,
} from "@/lib/business/actions";
import { getInsForgeBrowserClient } from "@/lib/database/browser";

const CURRENCIES = ["USD", "CAD", "EUR", "GBP", "AUD", "NZD"] as const;
const COUNTRIES = [
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "GB", label: "United Kingdom" },
  { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" },
  { code: "OTHER", label: "Other" },
] as const;

interface BusinessFormProps {
  mode: "onboarding" | "edit";
  industries: IndustryOption[];
  initialValues: {
    businessName: string;
    ownerName: string;
    email: string;
    phone: string;
    website: string;
    address: string;
    city: string;
    region: string;
    country: string;
    postalCode: string;
    currency: string;
    industryId: string;
    description: string;
    taxRegistrationNumber: string;
    logoUrl: string;
    logoKey: string;
    defaultTaxRatePercent?: string;
    documentPrefix?: string;
    defaultPaymentTerms?: string;
    defaultExpiryDays?: string;
  };
}

export function BusinessForm({
  mode,
  industries,
  initialValues,
}: BusinessFormProps) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState(initialValues.businessName);
  const [ownerName, setOwnerName] = useState(initialValues.ownerName);
  const [email, setEmail] = useState(initialValues.email);
  const [phone, setPhone] = useState(initialValues.phone);
  const [website, setWebsite] = useState(initialValues.website);
  const [address, setAddress] = useState(initialValues.address);
  const [city, setCity] = useState(initialValues.city);
  const [region, setRegion] = useState(initialValues.region);
  const [country, setCountry] = useState(initialValues.country);
  const [postalCode, setPostalCode] = useState(initialValues.postalCode);
  const [currency, setCurrency] = useState(initialValues.currency);
  const [industryId, setIndustryId] = useState(initialValues.industryId);
  const [description, setDescription] = useState(initialValues.description);
  const [taxRegistrationNumber, setTaxRegistrationNumber] = useState(
    initialValues.taxRegistrationNumber
  );
  const [logoUrl, setLogoUrl] = useState(initialValues.logoUrl);
  const [logoKey, setLogoKey] = useState(initialValues.logoKey);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [defaultTaxRatePercent, setDefaultTaxRatePercent] = useState(
    initialValues.defaultTaxRatePercent ?? "0"
  );
  const [documentPrefix, setDocumentPrefix] = useState(
    initialValues.documentPrefix ?? "QVN"
  );
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState(
    initialValues.defaultPaymentTerms ?? "Due within 14 days"
  );
  const [defaultExpiryDays, setDefaultExpiryDays] = useState(
    initialValues.defaultExpiryDays ?? "14"
  );

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Logo must be an image file (PNG, JPG, WebP, or SVG).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo file size must be 2 MB or less.");
      return;
    }

    setError(null);
    setUploadingLogo(true);
    try {
      const insforge = getInsForgeBrowserClient();
      const { data, error: uploadError } = await insforge.storage
        .from("business-assets")
        .uploadAuto(file);

      if (uploadError || !data) {
        setError(uploadError?.message ?? "Logo upload failed.");
        return;
      }

      setLogoUrl(data.url);
      setLogoKey(data.key);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);

    try {
      const businessPayload = {
        businessName,
        ownerName,
        email,
        phone,
        website: website || undefined,
        address,
        city: city || undefined,
        region: region || undefined,
        country,
        postalCode: postalCode || undefined,
        currency,
        industryId,
        description,
        taxRegistrationNumber: taxRegistrationNumber || undefined,
        logoUrl: logoUrl || null,
        logoKey: logoKey || null,
      };

      if (mode === "onboarding") {
        const res = await createBusinessAction(businessPayload);
        if (!res.ok) {
          setError(res.error ?? "Could not complete onboarding.");
          return;
        }
        router.push("/dashboard");
        router.refresh();
        return;
      }

      const taxRateDecimal = Number(defaultTaxRatePercent) / 100;
      const res = await updateBusinessProfileAction({
        business: businessPayload,
        settings: {
          defaultTaxRate: Number.isFinite(taxRateDecimal) ? taxRateDecimal : 0,
          documentPrefix,
          defaultPaymentTerms,
          defaultExpiryDays: Number(defaultExpiryDays) || 14,
        },
      });

      if (!res.ok) {
        setError(res.error ?? "Could not update business profile.");
        return;
      }

      setSaved(true);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {saved ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Business profile and defaults saved.</span>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="biz-name">Business name</Label>
          <Input
            id="biz-name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Apex Contracting LLC"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="owner-name">Owner name</Label>
          <Input
            id="owner-name"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Jordan Taylor"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="biz-email">Business email</Label>
          <Input
            id="biz-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="billing@apexcontracting.com"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="biz-phone">Phone</Label>
          <Input
            id="biz-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 234-5678"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="biz-website">Website (optional)</Label>
          <Input
            id="biz-website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://apexcontracting.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="biz-tax-id">Tax registration number (optional)</Label>
          <Input
            id="biz-tax-id"
            value={taxRegistrationNumber}
            onChange={(e) => setTaxRegistrationNumber(e.target.value)}
            placeholder="EIN / GST / VAT ID"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="biz-address">Street address</Label>
        <Input
          id="biz-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main Street, Suite 400"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="biz-city">City</Label>
          <Input
            id="biz-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Austin"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="biz-region">State / Province</Label>
          <Input
            id="biz-region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="TX"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="biz-postal">Postal code</Label>
          <Input
            id="biz-postal"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="78701"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="biz-country">Country</Label>
          <select
            id="biz-country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="biz-currency">Default currency</Label>
          <select
            id="biz-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="biz-logo">Business logo (optional)</Label>
          <div className="flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent">
              <Upload className="h-3.5 w-3.5" />
              <span>{uploadingLogo ? "Uploading..." : "Upload Logo"}</span>
              <input
                id="biz-logo"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="sr-only"
                disabled={uploadingLogo}
              />
            </label>
            {logoUrl ? (
              <span className="text-xs text-emerald-600 truncate max-w-[180px]">
                Logo attached
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                PNG/JPG up to 2 MB
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Industry</Label>
        <IndustrySelector
          industries={industries}
          value={industryId}
          onChange={setIndustryId}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="biz-description">Business description</Label>
        <textarea
          id="biz-description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the services your business provides..."
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          required
        />
      </div>

      {mode === "edit" ? (
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
          <h3 className="text-sm font-semibold">Document &amp; Tax Defaults</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="default-tax">Default tax rate (%)</Label>
              <Input
                id="default-tax"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={defaultTaxRatePercent}
                onChange={(e) => setDefaultTaxRatePercent(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-prefix">Document prefix</Label>
              <Input
                id="doc-prefix"
                value={documentPrefix}
                onChange={(e) => setDocumentPrefix(e.target.value)}
                placeholder="QVN"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expiry-days">Default expiry (days)</Label>
              <Input
                id="expiry-days"
                type="number"
                min="1"
                max="365"
                value={defaultExpiryDays}
                onChange={(e) => setDefaultExpiryDays(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payment-terms">Default payment terms</Label>
            <Input
              id="payment-terms"
              value={defaultPaymentTerms}
              onChange={(e) => setDefaultPaymentTerms(e.target.value)}
            />
          </div>
        </div>
      ) : null}

      <Button type="submit" disabled={submitting || uploadingLogo}>
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : mode === "onboarding" ? (
          "Complete Business Setup"
        ) : (
          "Save Business Profile"
        )}
      </Button>
    </form>
  );
}

