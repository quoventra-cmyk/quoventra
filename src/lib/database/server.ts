import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getPublicEnv } from "@/config/env";

/**
 * Creates a request-scoped Supabase client for Server Components,
 * Server Actions, and Route Handlers using Next.js cookies.
 *
 * Exposes `{ database, auth, storage }` so all existing domain queries
 * (`client.database.from(...)` / `client.database.rpc(...)`) work seamlessly.
 */
export async function createSupabaseServerClient() {
  // Always read cookies() first so Next.js marks calling routes as dynamic
  // and does not attempt static prerendering of authenticated pages.
  const cookieStore = await cookies();

  const env = getPublicEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
    );
  }

  const client = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — proxy.ts refreshes session cookies.
        }
      },
    },
  });

  return {
    database: client,
    auth: client.auth,
    storage: client.storage,
    raw: client,
  };
}

/**
 * Backward-compatible alias so all existing pages and services work unchanged.
 */
export const createInsForgeServerClient = createSupabaseServerClient;
