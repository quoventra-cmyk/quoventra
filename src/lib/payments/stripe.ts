import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getPublicEnv, getServerEnv } from "@/config/env";

let stripeInstance: Stripe | null = null;

export function isStripeConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.STRIPE_SECRET_KEY?.trim());
}

export function getStripeClient(): Stripe | null {
  const env = getServerEnv();
  const key = env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;

  if (!stripeInstance) {
    stripeInstance = new Stripe(key);
  }
  return stripeInstance;
}

/**
 * Returns a privileged Supabase service-role client for server-side webhooks
 * and admin workflows that bypass RLS.
 */
export function getSupabaseAdminClient() {
  const pub = getPublicEnv();
  const srv = getServerEnv();
  const serviceKey = srv.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const baseUrl = pub.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!baseUrl || !serviceKey) {
    return null;
  }

  const client = createClient(baseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return {
    database: client,
    auth: client.auth,
    storage: client.storage,
    raw: client,
  };
}

export const getInsForgeAdminClient = getSupabaseAdminClient;
