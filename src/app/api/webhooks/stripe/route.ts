import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getServerEnv } from "@/config/env";
import { getInsForgeAdminClient, getStripeClient } from "@/lib/payments/stripe";

async function upsertBusinessSubscription(
  admin: NonNullable<ReturnType<typeof getInsForgeAdminClient>>,
  input: {
    businessId: string;
    planId: string;
    tier: string;
    status: string;
    stripeSubscriptionId: string | null;
    periodStart?: string | null;
    periodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
  }
) {
  const { data: existing } = await admin.database
    .from("subscriptions")
    .select("id")
    .eq("business_id", input.businessId)
    .maybeSingle();

  const payload = {
    plan_id: input.planId,
    tier: input.tier,
    status: input.status,
    stripe_subscription_id: input.stripeSubscriptionId,
    current_period_start: input.periodStart ?? null,
    current_period_end: input.periodEnd ?? null,
    cancel_at_period_end: Boolean(input.cancelAtPeriodEnd),
  };

  if (existing?.id) {
    await admin.database
      .from("subscriptions")
      .update(payload)
      .eq("business_id", input.businessId);
  } else {
    await admin.database.from("subscriptions").insert([
      {
        business_id: input.businessId,
        ...payload,
      },
    ]);
  }
}

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  const env = getServerEnv();
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim();
  const admin = getInsForgeAdminClient();

  if (!stripe || !webhookSecret || !admin) {
    return NextResponse.json(
      { error: "Stripe webhook handler is not fully configured." },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Webhook signature verification failed: ${err.message}`
            : "Invalid signature",
      },
      { status: 400 }
    );
  }

  // Idempotency check: skip duplicate events safely
  const { data: existingEvent } = await admin.database
    .from("stripe_webhook_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existingEvent) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  await admin.database.from("stripe_webhook_events").insert([
    {
      stripe_event_id: event.id,
      event_type: event.type,
    },
  ]);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const businessId = session.metadata?.business_id;
    const tier = session.metadata?.tier;
    const planId = session.metadata?.plan_id;
    const stripeSubId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;

    if (businessId && tier && planId) {
      await upsertBusinessSubscription(admin, {
        businessId,
        planId,
        tier,
        status: "active",
        stripeSubscriptionId: stripeSubId,
      });
    }
  } else if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    const businessId = sub.metadata?.business_id;
    const tier = sub.metadata?.tier;
    const planId = sub.metadata?.plan_id;

    if (businessId && tier && planId) {
      const mappedStatus =
        event.type === "customer.subscription.deleted"
          ? "canceled"
          : sub.status === "trialing"
            ? "trialing"
            : sub.status === "past_due"
              ? "past_due"
              : sub.status === "canceled"
                ? "canceled"
                : sub.status === "active"
                  ? "active"
                  : "incomplete";

      const firstItem = sub.items?.data?.[0];
      const periodStart = firstItem?.current_period_start
        ? new Date(firstItem.current_period_start * 1000).toISOString()
        : null;
      const periodEnd = firstItem?.current_period_end
        ? new Date(firstItem.current_period_end * 1000).toISOString()
        : null;

      await upsertBusinessSubscription(admin, {
        businessId,
        planId,
        tier,
        status: mappedStatus,
        stripeSubscriptionId: sub.id,
        periodStart,
        periodEnd,
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      });
    }
  } else if (event.type === "invoice.payment_failed") {
    const inv = event.data.object as Stripe.Invoice;
    const customerId =
      typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
    if (customerId) {
      const { data: sc } = await admin.database
        .from("stripe_customers")
        .select("business_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (sc?.business_id) {
        await admin.database
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("business_id", sc.business_id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
