"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Save, Trash2 } from "lucide-react";
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
import { formatCurrency } from "@/lib/pricing/engine";
import {
  addCustomerNoteAction,
  deleteCustomerAction,
  deleteCustomerNoteAction,
  logCustomerCommunicationAction,
  updateCustomerAction,
} from "@/services/customers/actions";

interface CustomerDetailViewProps {
  currency: string;
  customer: {
    id: string;
    customer_type: "individual" | "business";
    name: string;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
    created_at: string;
  };
  outstandingBalance: number;
  estimates: Array<{
    id: string;
    estimate_number: string;
    title: string;
    status: string;
    total: number;
    issue_date: string;
  }>;
  quotations: Array<{
    id: string;
    quotation_number: string;
    title: string;
    status: string;
    total: number;
    issue_date: string;
  }>;
  invoices: Array<{
    id: string;
    invoice_number: string;
    title: string;
    status: string;
    total: number;
    balance_due: number;
    issue_date: string;
  }>;
  notesList: Array<{ id: string; content: string; created_at: string }>;
  communications: Array<{
    id: string;
    channel: string;
    subject: string;
    summary: string | null;
    occurred_at: string;
  }>;
}

export function CustomerDetailView({
  currency,
  customer,
  outstandingBalance,
  estimates,
  quotations,
  invoices,
  notesList,
  communications,
}: CustomerDetailViewProps) {
  const router = useRouter();
  const [customerType, setCustomerType] = useState(customer.customer_type);
  const [name, setName] = useState(customer.name);
  const [companyName, setCompanyName] = useState(customer.company_name ?? "");
  const [email, setEmail] = useState(customer.email ?? "");
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [address, setAddress] = useState(customer.address ?? "");
  const [notes, setNotes] = useState(customer.notes ?? "");

  const [newNote, setNewNote] = useState("");
  const [commChannel, setCommChannel] = useState<
    "email" | "phone" | "meeting" | "note" | "other"
  >("email");
  const [commSubject, setCommSubject] = useState("");
  const [commSummary, setCommSummary] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await updateCustomerAction(customer.id, {
        customerType,
        name,
        companyName: companyName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        notes: notes || undefined,
      });
      if (!res.ok) {
        setError(res.error ?? "Failed to update customer.");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete customer "${customer.name}"?`)) return;
    setError(null);
    const res = await deleteCustomerAction(customer.id);
    if (!res.ok) {
      setError(res.error ?? "Cannot delete customer.");
      return;
    }
    router.push("/dashboard/customers");
    router.refresh();
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

      {saved ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Customer details updated.</span>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding Balance</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(outstandingBalance, currency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Estimates</CardDescription>
            <CardTitle className="text-2xl">{estimates.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Quotations</CardDescription>
            <CardTitle className="text-2xl">{quotations.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Invoices</CardDescription>
            <CardTitle className="text-2xl">{invoices.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Customer Information</CardTitle>
            <CardDescription>
              Created {new Date(customer.created_at).toLocaleDateString()}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
            Delete Customer
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-type">Type</Label>
                <select
                  id="edit-type"
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
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-company">Business name</Label>
                <Input
                  id="edit-company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-addr">Address</Label>
                <Input
                  id="edit-addr"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-notes">Profile notes</Label>
              <Input
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Customer
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Linked Documents */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estimates</CardTitle>
          </CardHeader>
          <CardContent>
            {estimates.length === 0 ? (
              <p className="text-xs text-muted-foreground">No estimates.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {estimates.map((e) => (
                  <li key={e.id} className="py-2 flex justify-between gap-2">
                    <Link
                      href={`/dashboard/estimates/${e.id}`}
                      className="text-primary hover:underline truncate"
                    >
                      {e.estimate_number} — {e.title}
                    </Link>
                    <Badge variant="outline" className="capitalize">
                      {e.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quotations</CardTitle>
          </CardHeader>
          <CardContent>
            {quotations.length === 0 ? (
              <p className="text-xs text-muted-foreground">No quotations.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {quotations.map((q) => (
                  <li key={q.id} className="py-2 flex justify-between gap-2">
                    <Link
                      href={`/dashboard/quotations/${q.id}`}
                      className="text-primary hover:underline truncate"
                    >
                      {q.quotation_number} — {q.title}
                    </Link>
                    <Badge variant="outline" className="capitalize">
                      {q.status.replace("_", " ")}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-xs text-muted-foreground">No invoices.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {invoices.map((inv) => (
                  <li key={inv.id} className="py-2 flex justify-between gap-2">
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
                      className="text-primary hover:underline truncate"
                    >
                      {inv.invoice_number} — {inv.title}
                    </Link>
                    <span className="text-xs font-medium">
                      Due: {formatCurrency(Number(inv.balance_due), currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes & Communication History */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newNote.trim()) return;
                await addCustomerNoteAction(customer.id, newNote);
                setNewNote("");
                router.refresh();
              }}
              className="flex gap-2"
            >
              <Input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
              />
              <Button type="submit" size="sm">
                Add
              </Button>
            </form>

            {notesList.length === 0 ? (
              <p className="text-xs text-muted-foreground">No notes yet.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {notesList.map((n) => (
                  <li
                    key={n.id}
                    className="py-2 flex items-start justify-between gap-2"
                  >
                    <div>
                      <p>{n.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteCustomerNoteAction(customer.id, n.id);
                        router.refresh();
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Communication History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!commSubject.trim()) return;
                await logCustomerCommunicationAction(customer.id, {
                  channel: commChannel,
                  subject: commSubject,
                  summary: commSummary || undefined,
                });
                setCommSubject("");
                setCommSummary("");
                router.refresh();
              }}
              className="space-y-2"
            >
              <div className="grid gap-2 sm:grid-cols-3">
                <select
                  value={commChannel}
                  onChange={(e) =>
                    setCommChannel(
                      e.target.value as
                        | "email"
                        | "phone"
                        | "meeting"
                        | "note"
                        | "other"
                    )
                  }
                  className="flex h-9 rounded-lg border border-input bg-background px-2 py-1 text-sm"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="meeting">Meeting</option>
                  <option value="note">Note</option>
                  <option value="other">Other</option>
                </select>
                <Input
                  value={commSubject}
                  onChange={(e) => setCommSubject(e.target.value)}
                  placeholder="Subject *"
                  className="sm:col-span-2"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Input
                  value={commSummary}
                  onChange={(e) => setCommSummary(e.target.value)}
                  placeholder="Summary (optional)"
                />
                <Button type="submit" size="sm">
                  Log
                </Button>
              </div>
            </form>

            {communications.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No communications logged yet.
              </p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {communications.map((c) => (
                  <li key={c.id} className="py-2 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {c.channel}
                      </Badge>
                      <span className="font-medium">{c.subject}</span>
                    </div>
                    {c.summary ? (
                      <p className="text-xs text-muted-foreground">
                        {c.summary}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.occurred_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

