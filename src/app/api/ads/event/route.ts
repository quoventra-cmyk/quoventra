import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getActiveBusinessContext, getCurrentAuthUser } from "@/lib/auth/session";
import { getInsForgeClient } from "@/lib/database/insforge";
import { checkRateLimit } from "@/lib/validation/rate-limit";

const eventSchema = z.object({
  advertisementId: z.string().uuid(),
  eventType: z.enum(["impression", "click"]),
  surface: z.string().trim().min(1).max(80),
  consentGranted: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`ads:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  const parsed = eventSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid ad event." }, { status: 400 });
  }

  const insforge = getInsForgeClient();
  if (!insforge) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const { data: settingsRow } = await insforge.database
    .from("platform_settings")
    .select("value")
    .eq("key", "ads_config")
    .maybeSingle();

  const cfg = (settingsRow?.value ?? {}) as {
    ads_enabled?: boolean;
    require_consent?: boolean;
  };

  if (!cfg.ads_enabled) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  if ((cfg.require_consent ?? true) && !parsed.data.consentGranted) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const user = await getCurrentAuthUser().catch(() => null);
  const context = user
    ? await getActiveBusinessContext(user.id).catch(() => null)
    : null;

  await insforge.database.from("advertisement_events").insert([
    {
      advertisement_id: parsed.data.advertisementId,
      business_id: context?.business.id ?? null,
      event_type: parsed.data.eventType,
      surface: parsed.data.surface,
    },
  ]);

  return NextResponse.json({ ok: true });
}

