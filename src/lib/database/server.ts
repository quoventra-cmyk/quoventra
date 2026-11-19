import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";

/**
 * Creates a request-scoped InsForge client for Server Components,
 * Server Actions, and Route Handlers using Next.js cookies.
 */
export async function createInsForgeServerClient() {
  return createServerClient({
    cookies: await cookies(),
  });
}

