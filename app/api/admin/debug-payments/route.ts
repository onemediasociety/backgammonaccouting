import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const { data } = await stripe.paymentIntents.list({
    limit: 20,
    expand: ["data.latest_charge"],
  });

  const results = data.map((pi) => {
    const charge = typeof pi.latest_charge === "object" ? pi.latest_charge as Stripe.Charge : null;
    return {
      pi_id: pi.id,
      pi_description: pi.description,
      charge_id: charge?.id ?? null,
      charge_description: charge?.description ?? null,
      currency: pi.currency,
      amount: pi.amount,
      status: pi.status,
      created: new Date(pi.created * 1000).toISOString(),
      charge_metadata: charge?.metadata ?? null,
      pi_metadata: pi.metadata,
    };
  });

  return NextResponse.json(results);
}
