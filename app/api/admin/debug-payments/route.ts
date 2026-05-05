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
    const [pi, sessions] = await Promise.all([
      stripe.paymentIntents.retrieve(piId, { expand: ["latest_charge"] }),
      stripe.checkout.sessions.list({ payment_intent: piId, limit: 5, expand: ["data.line_items"] }),
    ]);
    const charge = typeof pi.latest_charge === "object" ? pi.latest_charge as Stripe.Charge : null;
    const session = sessions.data[0] ?? null;
    const lineItem = session?.line_items?.data[0] ?? null;
    return NextResponse.json({
      pi_id: pi.id,
      pi_description: pi.description,
      pi_metadata: pi.metadata,
      charge_description: charge?.description ?? null,
      charge_metadata: charge?.metadata ?? null,
      checkout_session_id: session?.id ?? null,
      checkout_line_item_description: lineItem?.description ?? null,
      checkout_line_item_name: (lineItem as unknown as Record<string, unknown> | null)?.name ?? null,
      currency: pi.currency,
      amount: pi.amount,
      status: pi.status,
      created: new Date(pi.created * 1000).toISOString(),
    });
  }

  // List last 20 payment intents + their checkout sessions
  const { data: pis } = await stripe.paymentIntents.list({
    limit: 20,
    expand: ["data.latest_charge"],
  });

  // Fetch checkout sessions for all these PIs in parallel
  const sessionMaps = await Promise.all(
    pis.map((pi) =>
      stripe.checkout.sessions
        .list({ payment_intent: pi.id, limit: 1, expand: ["data.line_items"] })
        .then((r) => ({ piId: pi.id, session: r.data[0] ?? null }))
        .catch(() => ({ piId: pi.id, session: null }))
    )
  );
  const sessionByPi = new Map(sessionMaps.map((s) => [s.piId, s.session]));

  const results = pis.map((pi) => {
    const charge = typeof pi.latest_charge === "object" ? pi.latest_charge as Stripe.Charge : null;
    const session = sessionByPi.get(pi.id) ?? null;
    const lineItem = session?.line_items?.data[0] ?? null;
    return {
      pi_id: pi.id,
      pi_description: pi.description,
      charge_description: charge?.description ?? null,
      checkout_product_name: lineItem?.description ?? null,
      currency: pi.currency,
      amount: pi.amount,
      status: pi.status,
      created: new Date(pi.created * 1000).toISOString(),
    };
  });

  return NextResponse.json(results);
}
