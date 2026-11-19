import { createClient } from "@insforge/sdk";
import { getPublicEnv, isInsForgeConfigured } from "@/config/env";

export type InsForgeClient = ReturnType<typeof createClient>;

let cachedClient: InsForgeClient | null = null;

/**
 * Returns a configured InsForge client instance when credentials are present,
 * or null if InsForge environment variables have not been configured yet.
 */
export function getInsForgeClient(): InsForgeClient | null {
  if (!isInsForgeConfigured()) {
    return null;
  }

  if (!cachedClient) {
    const env = getPublicEnv();
    cachedClient = createClient({
      baseUrl: env.NEXT_PUBLIC_INSFORGE_URL!,
      anonKey: env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    });
  }

  return cachedClient;
}

/**
 * Returns a configured InsForge client or throws a clear configuration error.
 * Use in server routes and services that require an active backend connection.
 */
export function requireInsForgeClient(): InsForgeClient {
  const client = getInsForgeClient();
  if (!client) {
    throw new Error(
      "InsForge is not configured. Set NEXT_PUBLIC_INSFORGE_URL and NEXT_PUBLIC_INSFORGE_ANON_KEY in .env.local."
    );
  }
  return client;
}

