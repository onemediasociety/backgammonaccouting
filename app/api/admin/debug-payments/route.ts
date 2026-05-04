import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const results: object[] = [];

  for await (const pi of stripe.paymentIntents.list({
    limit: 50,
    expand: ["data.latest_charge"],
  })) {
    const charge = pi.latest_charge as Stripe.Charge | null;
    if (!charge || typeof charge === "string") continue;

    results.push({
      pi_id: pi.id,
      pi_description: pi.description,
      charge_id: charge.id,
      charge_description: charge.description,
      currency: pi.currency,
      amount: pi.amount,
      status: pi.status,
      created: new Date(pi.created * 1000).toISOString(),
      charge_metadata: charge.metadata,
      pi_metadata: pi.metadata,
    });
  }

  return NextResponse.json(results);
}
