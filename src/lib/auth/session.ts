import { redirect } from "next/navigation";
import { createInsForgeServerClient } from "@/lib/database/server";
import type { BusinessMemberRole } from "@/types";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface BusinessRecord {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  industry_id: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string;
  postal_code: string | null;
  currency: string;
  logo_url: string | null;
  logo_key: string | null;
  tax_registration_number: string | null;
}

export interface BusinessSettingsRecord {
  id: string;
  business_id: string;
  default_currency: string;
  default_tax_rate: number;
  document_prefix: string;
  default_payment_terms: string;
  default_expiry_days: number;
  brand_color?: string;
}

export interface ActiveBusinessContext {
  role: BusinessMemberRole;
  business: BusinessRecord;
  settings: BusinessSettingsRecord | null;
  industryName: string | null;
}

/**
 * Returns the currently signed-in user from Supabase cookies, or null.
 */
export async function getCurrentAuthUser(): Promise<AuthenticatedUser | null> {
  const insforge = await createInsForgeServerClient();
  const { data, error } = await insforge.auth.getUser();
  if (error || !data?.user) {
    return null;
  }

  const email = data.user.email ?? "";
  const metadata = (data.user.user_metadata ?? {}) as Record<string, unknown>;
  const rawName =
    typeof metadata.full_name === "string" && metadata.full_name.trim().length > 0
      ? metadata.full_name.trim()
      : typeof metadata.name === "string" && metadata.name.trim().length > 0
        ? metadata.name.trim()
        : email.split("@")[0] ?? "User";
  const avatarUrl =
    typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;

  return {
    id: data.user.id,
    email,
    name: rawName,
    avatarUrl,
  };
}

/**
 * Requires an authenticated user or redirects to /login.
 */
export async function requireAuthUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentAuthUser();
  if (!user) {
    redirect("/login");
  }

  const insforge = await createInsForgeServerClient();
  const { data: profile } = await insforge.database
    .from("profiles")
    .select("is_suspended")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_suspended) {
    redirect("/login?error=account_suspended");
  }

  return user;
}

/**
 * Ensures the user has a row in public.profiles.
 */
export async function ensureUserProfile(user: AuthenticatedUser): Promise<void> {
  const insforge = await createInsForgeServerClient();
  const { data: existing } = await insforge.database
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    await insforge.database.from("profiles").insert([
      {
        id: user.id,
        full_name: user.name,
        email: user.email,
        avatar_url: user.avatarUrl,
      },
    ]);
  }
}

/**
 * Loads the active business workspace for the given user, or null if not yet onboarded.
 */
export async function getActiveBusinessContext(
  userId: string
): Promise<ActiveBusinessContext | null> {
  const insforge = await createInsForgeServerClient();

  const { data: memberships, error: memberErr } = await insforge.database
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (memberErr || !memberships || memberships.length === 0) {
    return null;
  }

  const membership = memberships[0] as {
    business_id: string;
    role: BusinessMemberRole;
  };

  const { data: business, error: bizErr } = await insforge.database
    .from("businesses")
    .select(
      "id, owner_id, name, slug, industry_id, description, email, phone, website, address, city, region, country, postal_code, currency, logo_url, logo_key, tax_registration_number"
    )
    .eq("id", membership.business_id)
    .maybeSingle();

  if (bizErr || !business) {
    return null;
  }

  const biz = business as BusinessRecord;

  const [{ data: settings }, { data: industry }] = await Promise.all([
    insforge.database
      .from("business_settings")
      .select(
        "id, business_id, default_currency, default_tax_rate, document_prefix, default_payment_terms, default_expiry_days, brand_color"
      )
      .eq("business_id", biz.id)
      .maybeSingle(),
    biz.industry_id
      ? insforge.database
          .from("industries")
          .select("name")
          .eq("id", biz.industry_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    role: membership.role,
    business: biz,
    settings: (settings as BusinessSettingsRecord | null) ?? null,
    industryName:
      industry && typeof (industry as { name?: string }).name === "string"
        ? (industry as { name: string }).name
        : null,
  };
}

