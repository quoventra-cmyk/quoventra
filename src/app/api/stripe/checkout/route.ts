import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getPublicEnv } from "@/config/env";
import { getActiveBusinessContext, getCurrentAuthUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";
import { getInsForgeAdminClient, getStripeClient } from "@/lib/payments/stripe";

const bodySchema = z.object({
  tier: z.enum(["starter", "professional", "business"]),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getActiveBusinessContext(user.id);
  if (!context || !["owner", "admin"].includes(context.role)) {
    return NextResponse.json(
      { error: "Only business owners or admins can manage billing." },
      { status: 403 }
    );
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured. Set STRIPE_SECRET_KEY in .env.local to enable subscription checkout.",
      },
      { status: 503 }
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan tier." }, { status: 400 });
  }

  const insforge = await createInsForgeServerClient();
  const { data: plan } = await insforge.database
    .from("subscription_plans")
    .select("id, tier, name, price_monthly_cents, stripe_price_id")
    .eq("tier", parsed.data.tier)
    .eq("is_active", true)
    .maybeSingle();

  if (!plan) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  // Reuse or create Stripe Customer
  const { data: existingCustomer } = await insforge.database
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("business_id", context.business.id)
    .maybeSingle();

  let stripeCustomerId = existingCustomer?.stripe_customer_id ?? null;
  if (!stripeCustomerId) {
    const created = await stripe.customers.create({
      email: context.business.email ?? user.email,
      name: context.business.name,
      metadata: { business_id: context.business.id },
    });
    stripeCustomerId = created.id;

    const admin = getInsForgeAdminClient();
    if (admin) {
      await admin.database.from("stripe_customers").insert([
        {
          business_id: context.business.id,
          stripe_customer_id: stripeCustomerId,
        },
      ]);
    }
  }

  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;

  const lineItem = plan.stripe_price_id
    ? { price: plan.stripe_price_id, quantity: 1 }
    : {
        price_data: {
          currency: "usd",
          unit_amount: plan.price_monthly_cents,
          recurring: { interval: "month" as const },
          product_data: { name: `Quoventra ${plan.name} Plan` },
        },
        quantity: 1,
      };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [lineItem],
    success_url: `${appUrl}/dashboard/subscription?checkout=success`,
    cancel_url: `${appUrl}/dashboard/subscription?checkout=cancelled`,
    metadata: {
      business_id: context.business.id,
      tier: plan.tier,
      plan_id: plan.id,
    },
    subscription_data: {
      metadata: {
        business_id: context.business.id,
        tier: plan.tier,
        plan_id: plan.id,
      },
    },
  });

  return NextResponse.json({ url: session.url });
}

