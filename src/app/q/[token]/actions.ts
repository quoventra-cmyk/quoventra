"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { requireInsForgeClient } from "@/lib/database/insforge";
import { checkRateLimit } from "@/lib/validation/rate-limit";

const responseSchema = z.object({
  token: z.string().trim().min(10),
  decision: z.enum(["approved", "rejected", "changes_requested"]),
  customerName: z.string().trim().min(2, "Please enter your full name."),
  customerEmail: z.string().trim().email("Please enter a valid email address."),
  comment: z.string().trim().max(1500).optional(),
});

export async function submitPublicQuotationResponseAction(
  input: z.infer<typeof responseSchema>
): Promise<{ ok: boolean; error?: string; status?: string }> {
  const parsed = responseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check your details.",
    };
  }

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    null;
  const userAgent = hdrs.get("user-agent") ?? null;

  const rl = checkRateLimit(
    `qresp:${ip ?? "anon"}:${parsed.data.token}`,
    10,
    60_000
  );
  if (!rl.allowed) {
    return {
      ok: false,
      error: `Too many attempts. Try again in ${rl.retryAfterSeconds}s.`,
    };
  }

  const insforge = requireInsForgeClient();
  const { data, error } = await insforge.database.rpc(
    "submit_quotation_response",
    {
      p_token: parsed.data.token,
      p_decision: parsed.data.decision,
      p_customer_name: parsed.data.customerName,
      p_customer_email: parsed.data.customerEmail,
      p_comment: parsed.data.comment ?? null,
      p_ip: ip,
      p_user_agent: userAgent,
    }
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  const result = data as { ok?: boolean; error?: string; status?: string } | null;
  if (!result?.ok) {
    return {
      ok: false,
      error: result?.error ?? "Could not submit your response.",
    };
  }

  revalidatePath(`/q/${parsed.data.token}`);
  return { ok: true, status: result.status };
}

