import { NextResponse } from "next/server";
import { getPublicEnv } from "@/config/env";
import { getActiveBusinessContext, getCurrentAuthUser } from "@/lib/auth/session";
import { createInsForgeServerClient } from "@/lib/database/server";
import { getStripeClient } from "@/lib/payments/stripe";

export async function POST() {
  const user = await getCurrentAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getActiveBusinessContext(user.id);
  if (!context || !["owner", "admin"].includes(context.role)) {
    return NextResponse.json(
      { error: "Only business owners or admins can access the billing portal." },
      { status: 403 }
    );
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured. Set STRIPE_SECRET_KEY in .env.local.",
      },
      { status: 503 }
    );
  }

  const insforge = await createInsForgeServerClient();
  const { data: customer } = await insforge.database
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("business_id", context.business.id)
    .maybeSingle();

  if (!customer?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No active Stripe customer found for this business yet." },
      { status: 400 }
    );
  }

  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
  const portal = await stripe.billingPortal.sessions.create({
    customer: customer.stripe_customer_id,
    return_url: `${appUrl}/dashboard/subscription`,
  });

  return NextResponse.json({ url: portal.url });
}

