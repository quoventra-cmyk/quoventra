import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv, isSupabaseConfigured } from "@/config/env";

export interface DatabaseClientAdapter {
  database: SupabaseClient;
  auth: SupabaseClient["auth"];
  storage: SupabaseClient["storage"];
  raw: SupabaseClient;
}

export type InsForgeClient = DatabaseClientAdapter;

let cachedClient: DatabaseClientAdapter | null = null;

/**
 * Returns a configured stateless Supabase client when credentials are present,
 * or null if Supabase environment variables have not been configured yet.
 */
export function getSupabaseClient(): DatabaseClientAdapter | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!cachedClient) {
    const env = getPublicEnv();
    const client = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
    );
    cachedClient = {
      database: client,
      auth: client.auth,
      storage: client.storage,
      raw: client,
    };
  }

  return cachedClient;
}

/**
 * Returns a configured Supabase client or throws a clear configuration error.
 */
export function requireSupabaseClient(): DatabaseClientAdapter {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
    );
  }
  return client;
}

export const getInsForgeClient = getSupabaseClient;
export const requireInsForgeClient = requireSupabaseClient;
