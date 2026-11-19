import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("Quoventra"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_INSFORGE_URL: z.string().optional(),
  NEXT_PUBLIC_INSFORGE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
});

const serverEnvSchema = publicEnvSchema.extend({
  INSFORGE_SERVICE_ROLE_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(["openrouter", "openai", "anthropic"]).default("openrouter"),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("openai/gpt-4o-mini"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-3-5-sonnet-latest"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

/**
 * Public environment variables safe for client and server use.
 */
export function getPublicEnv() {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_INSFORGE_URL:
      process.env.NEXT_PUBLIC_INSFORGE_URL ??
      process.env.NEXT_PUBLIC_INSFORGE_BASE_URL,
    NEXT_PUBLIC_INSFORGE_ANON_KEY: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  });
}

/**
 * Server-only environment variables. Never import or call in client components.
 */
export function getServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() must only be called on the server.");
  }

  return serverEnvSchema.parse(process.env);
}

/**
 * Reports whether required InsForge connection credentials are configured.
 */
export function isInsForgeConfigured(): boolean {
  const baseUrl = (
    process.env.NEXT_PUBLIC_INSFORGE_URL ??
    process.env.NEXT_PUBLIC_INSFORGE_BASE_URL
  )?.trim();
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY?.trim();
  return Boolean(baseUrl && anonKey);
}

