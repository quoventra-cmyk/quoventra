"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Plus, Search, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCustomerAction } from "@/services/customers/actions";

export interface CustomerRow {
  id: string;
  customer_type: "individual" | "business";
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

export function CustomersManager({
  customers,
}: {
  customers: CustomerRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [customerType, setCustomerType] = useState<"individual" | "business">(
    "individual"
  );
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company_name?.toLowerCase().includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.phone?.toLowerCase().includes(q) ?? false)
    );
  }, [customers, search]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await createCustomerAction({
        customerType,
        name,
        companyName: companyName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        notes: notes || undefined,
      });

      if (!res.ok) {
        setError(res.error ?? "Could not add customer.");
        return;
      }

      setName("");
      setCompanyName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setNotes("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Customer</CardTitle>
          <CardDescription>
            Store individual or commercial clients to link estimates,
            quotations, and invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="cust-type">Customer type</Label>
                <select
                  id="cust-type"
                  value={customerType}
                  onChange={(e) =>
                    setCustomerType(
                      e.target.value as "individual" | "business"
                    )
                  }
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="individual">Individual</option>
                  <option value="business">Business</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cust-name">Contact / Full name *</Label>
                <Input
                  id="cust-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cust-company">Business name (optional)</Label>
                <Input
                  id="cust-company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Morgan Properties Ltd."
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="cust-email">Email</Label>
                <Input
                  id="cust-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cust-phone">Phone</Label>
                <Input
                  id="cust-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 234-5678"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cust-addr">Address</Label>
                <Input
                  id="cust-addr"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="450 Oakridge Ave"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cust-notes">Notes (optional)</Label>
              <Input
                id="cust-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Preferred contact window, site access notes..."
              />
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Customer
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers by name, business, email..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No customers found.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/customers/${c.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {c.name}
                    </Link>
                    {c.company_name ? (
                      <p className="text-xs text-muted-foreground">
                        {c.company_name}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="gap-1 capitalize">
                      {c.customer_type === "business" ? (
                        <Building2 className="h-3 w-3" />
                      ) : (
                        <User className="h-3 w-3" />
                      )}
                      {c.customer_type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

