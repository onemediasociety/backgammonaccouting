import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const piId = url.searchParams.get("id");

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  if (piId) {
    // Fetch a single PI with full charge expansion
    const pi = await stripe.paymentIntents.retrieve(piId, {
      expand: ["latest_charge"],
    });
    const charge = typeof pi.latest_charge === "object" ? pi.latest_charge as Stripe.Charge : null;
    const raw = pi as unknown as Record<string, unknown>;
    return NextResponse.json({
      pi_id: pi.id,
      pi_description: pi.description,
      pi_payment_link: raw.payment_link ?? null,
      pi_metadata: pi.metadata,
      charge_id: charge?.id ?? null,
      charge_description: charge?.description ?? null,
      charge_metadata: charge?.metadata ?? null,
      charge_payment_link: (charge as unknown as Record<string, unknown> | null)?.payment_link ?? null,
      billing_name: charge?.billing_details?.name ?? null,
      billing_email: charge?.billing_details?.email ?? null,
      billing_state: charge?.billing_details?.address?.state ?? null,
      billing_city: charge?.billing_details?.address?.city ?? null,
      billing_country: charge?.billing_details?.address?.country ?? null,
      statement_descriptor: charge?.statement_descriptor ?? null,
      statement_descriptor_suffix: charge?.statement_descriptor_suffix ?? null,
      currency: pi.currency,
      amount: pi.amount,
      status: pi.status,
      created: new Date(pi.created * 1000).toISOString(),
    });
  }

  const { data } = await stripe.paymentIntents.list({
    limit: 20,
    expand: ["data.latest_charge"],
  });

  const results = data.map((pi) => {
    const charge = typeof pi.latest_charge === "object" ? pi.latest_charge as Stripe.Charge : null;
    const raw = pi as unknown as Record<string, unknown>;
    return {
      pi_id: pi.id,
      pi_description: pi.description,
      pi_payment_link: raw.payment_link ?? null,
      pi_metadata: pi.metadata,
      charge_id: charge?.id ?? null,
      charge_description: charge?.description ?? null,
      charge_metadata: charge?.metadata ?? null,
      charge_payment_link: (charge as unknown as Record<string, unknown> | null)?.payment_link ?? null,
      billing_name: charge?.billing_details?.name ?? null,
      billing_email: charge?.billing_details?.email ?? null,
      billing_state: charge?.billing_details?.address?.state ?? null,
      billing_city: charge?.billing_details?.address?.city ?? null,
      statement_descriptor: charge?.statement_descriptor ?? null,
      statement_descriptor_suffix: charge?.statement_descriptor_suffix ?? null,
      currency: pi.currency,
      amount: pi.amount,
      status: pi.status,
      created: new Date(pi.created * 1000).toISOString(),
    };
  });

  return NextResponse.json(results);
}
