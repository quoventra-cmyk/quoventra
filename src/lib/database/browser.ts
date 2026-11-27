"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

interface BrowserClientAdapter {
  database: SupabaseClient;
  auth: SupabaseClient["auth"];
  storage: SupabaseClient["storage"];
  raw: SupabaseClient;
}

let browserClient: BrowserClientAdapter | null = null;

/**
 * Returns a singleton Supabase browser client for Client Components.
 */
export function getSupabaseBrowserClient(): BrowserClientAdapter {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
    const anonKey =
      (
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
      )?.trim() ?? "";

    const client = createBrowserClient(url, anonKey);
    browserClient = {
      database: client,
      auth: client.auth,
      storage: client.storage,
      raw: client,
    };
  }
  return browserClient;
}

export const getInsForgeBrowserClient = getSupabaseBrowserClient;
