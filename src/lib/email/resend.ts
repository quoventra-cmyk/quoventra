import { getServerEnv } from "@/config/env";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  configured: boolean;
  messageId?: string;
  error?: string;
}

export function isResendConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.RESEND_API_KEY?.trim());
}

/**
 * Sends a transactional email via Resend REST API (server-side only).
 */
export async function sendEmailViaResend(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const env = getServerEnv();
  const apiKey = env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    return {
      ok: false,
      configured: false,
      error:
        "Resend email provider is not configured. Set RESEND_API_KEY and EMAIL_FROM in .env.local.",
    };
  }

  const from = env.EMAIL_FROM?.trim() || "Quoventra <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo,
      }),
    });

    const body = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };

    if (!res.ok) {
      return {
        ok: false,
        configured: true,
        error: body.message ?? `Resend API error (${res.status})`,
      };
    }

    return {
      ok: true,
      configured: true,
      messageId: body.id,
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      error:
        err instanceof Error ? err.message : "Failed to connect to Resend API.",
    };
  }
}

