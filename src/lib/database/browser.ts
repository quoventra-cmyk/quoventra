"use client";

import { createBrowserClient } from "@insforge/sdk/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Returns a singleton InsForge browser client for Client Components.
 * Reads insforge_access_token and refreshes via /api/auth/refresh.
 */
export function getInsForgeBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient();
  }
  return browserClient;
}

