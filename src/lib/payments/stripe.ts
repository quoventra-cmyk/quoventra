import { createAdminClient } from "@insforge/sdk";
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

export function getInsForgeAdminClient() {
  const pub = getPublicEnv();
  const srv = getServerEnv();
  const apiKey = srv.INSFORGE_SERVICE_ROLE_KEY?.trim();
  const baseUrl = pub.NEXT_PUBLIC_INSFORGE_URL?.trim();

  if (!baseUrl || !apiKey) {
    return null;
  }

  return createAdminClient({ baseUrl, apiKey });
}

