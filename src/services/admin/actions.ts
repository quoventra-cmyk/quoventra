"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createInsForgeServerClient } from "@/lib/database/server";
import {
  recordAdminAuditLog,
  requirePlatformAdmin,
} from "@/lib/permissions/admin";

const planUpdateSchema = z.object({
  priceMonthlyCents: z.coerce.number().int().min(0),
  monthlyEstimateLimit: z.coerce.number().int().min(1),
  monthlyAiLimit: z.coerce.number().int().min(0),
  customerLimit: z.coerce.number().int().min(1),
  teamMemberLimit: z.coerce.number().int().min(1),
});

const industrySchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(300).optional(),
});

const adSchema = z.object({
  title: z.string().trim().min(2).max(120),
  placement: z.enum([
    "dashboard_free_banner",
    "public_resources",
    "public_tools",
  ]),
  provider: z.enum(["direct_sponsor", "adsense"]).default("direct_sponsor"),
  headline: z.string().trim().min(2).max(200),
  body: z.string().trim().max(400).optional(),
  ctaLabel: z.string().trim().min(1).max(40).default("Learn More"),
  targetUrl: z.string().trim().url("Enter a valid URL starting with https://"),
});

export async function toggleUserSuspensionAction(
  targetUserId: string,
  suspend: boolean
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePlatformAdmin();
  if (targetUserId === admin.user.id) {
    return { ok: false, error: "You cannot suspend your own admin account." };
  }

  const insforge = await createInsForgeServerClient();
  const { error } = await insforge.database
    .from("profiles")
    .update({ is_suspended: suspend })
    .eq("id", targetUserId);

  if (error) return { ok: false, error: error.message };

  await recordAdminAuditLog({
    actorUserId: admin.user.id,
    action: suspend ? "user_suspended" : "user_reactivated",
    targetType: "profile",
    targetId: targetUserId,
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function updateSubscriptionPlanAction(
  planId: string,
  input: z.infer<typeof planUpdateSchema>
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePlatformAdmin();
  const parsed = planUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid plan." };
  }

  const insforge = await createInsForgeServerClient();
  const { error } = await insforge.database
    .from("subscription_plans")
    .update({
      price_monthly_cents: parsed.data.priceMonthlyCents,
      monthly_estimate_limit: parsed.data.monthlyEstimateLimit,
      monthly_ai_limit: parsed.data.monthlyAiLimit,
      customer_limit: parsed.data.customerLimit,
      team_member_limit: parsed.data.teamMemberLimit,
    })
    .eq("id", planId);

  if (error) return { ok: false, error: error.message };

  await recordAdminAuditLog({
    actorUserId: admin.user.id,
    action: "subscription_plan_updated",
    targetType: "subscription_plan",
    targetId: planId,
    metadata: parsed.data,
  });

  revalidatePath("/admin/subscriptions");
  return { ok: true };
}

export async function createIndustryAction(
  input: z.infer<typeof industrySchema>
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePlatformAdmin();
  const parsed = industrySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid industry." };
  }

  const slug = parsed.data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const insforge = await createInsForgeServerClient();
  const { data, error } = await insforge.database
    .from("industries")
    .insert([
      {
        name: parsed.data.name,
        slug,
        description: parsed.data.description || null,
        is_active: true,
      },
    ])
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await recordAdminAuditLog({
    actorUserId: admin.user.id,
    action: "industry_created",
    targetType: "industry",
    targetId: data?.id ?? null,
    metadata: { name: parsed.data.name, slug },
  });

  revalidatePath("/admin/industries");
  return { ok: true };
}

export async function toggleIndustryActiveAction(
  industryId: string,
  isActive: boolean
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePlatformAdmin();
  const insforge = await createInsForgeServerClient();
  const { error } = await insforge.database
    .from("industries")
    .update({ is_active: isActive })
    .eq("id", industryId);

  if (error) return { ok: false, error: error.message };

  await recordAdminAuditLog({
    actorUserId: admin.user.id,
    action: isActive ? "industry_enabled" : "industry_disabled",
    targetType: "industry",
    targetId: industryId,
  });

  revalidatePath("/admin/industries");
  return { ok: true };
}

export async function updateAdsConfigAction(input: {
  adsEnabled: boolean;
  requireConsent: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePlatformAdmin();
  const insforge = await createInsForgeServerClient();

  const { error } = await insforge.database
    .from("platform_settings")
    .update({
      value: {
        ads_enabled: input.adsEnabled,
        require_consent: input.requireConsent,
      },
    })
    .eq("key", "ads_config");

  if (error) return { ok: false, error: error.message };

  await recordAdminAuditLog({
    actorUserId: admin.user.id,
    action: "ads_config_updated",
    targetType: "platform_settings",
    targetId: "ads_config",
    metadata: input,
  });

  revalidatePath("/admin/ads");
  return { ok: true };
}

export async function createAdvertisementAction(
  input: z.infer<typeof adSchema>
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePlatformAdmin();
  const parsed = adSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid ad." };
  }

  const insforge = await createInsForgeServerClient();
  const { data, error } = await insforge.database
    .from("advertisements")
    .insert([
      {
        title: parsed.data.title,
        placement: parsed.data.placement,
        provider: parsed.data.provider,
        headline: parsed.data.headline,
        body: parsed.data.body || null,
        cta_label: parsed.data.ctaLabel,
        target_url: parsed.data.targetUrl,
        free_tier_only: true,
        is_active: true,
      },
    ])
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await recordAdminAuditLog({
    actorUserId: admin.user.id,
    action: "advertisement_created",
    targetType: "advertisement",
    targetId: data?.id ?? null,
    metadata: { title: parsed.data.title, placement: parsed.data.placement },
  });

  revalidatePath("/admin/ads");
  return { ok: true };
}

export async function toggleAdvertisementAction(
  adId: string,
  isActive: boolean
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requirePlatformAdmin();
  const insforge = await createInsForgeServerClient();
  const { error } = await insforge.database
    .from("advertisements")
    .update({ is_active: isActive })
    .eq("id", adId);

  if (error) return { ok: false, error: error.message };

  await recordAdminAuditLog({
    actorUserId: admin.user.id,
    action: isActive ? "advertisement_enabled" : "advertisement_disabled",
    targetType: "advertisement",
    targetId: adId,
  });

  revalidatePath("/admin/ads");
  return { ok: true };
}

