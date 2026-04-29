import Stripe from "stripe";
import { classifyPayment, CLUBS, type Club } from "./clubs";

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    stripeInstance = new Stripe(key, { apiVersion: "2024-06-20" });
  }
  return stripeInstance;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  description: string | null;
  clubSlug: string;
}

export interface ClubSummary {
  club: Club;
  payments: PaymentRecord[];
  totalCents: number;
  successCount: number;
}

export async function fetchAllPayments(
  limit = 100,
  fromTs?: number,
  toTs?: number
): Promise<PaymentRecord[]> {
  const stripe = getStripe();
  const params: Stripe.PaymentIntentListParams = { limit };
  if (fromTs || toTs) {
    params.created = {};
    if (fromTs) (params.created as Stripe.RangeQueryParam).gte = fromTs;
    if (toTs) (params.created as Stripe.RangeQueryParam).lte = toTs;
  }
  const intents = await stripe.paymentIntents.list(params);
  return intents.data.map((pi) => ({
    id: pi.id,
    amount: pi.amount,
    currency: pi.currency,
    status: pi.status,
    created: pi.created,
    description: pi.description,
    clubSlug: classifyPayment(pi.amount, pi.currency).slug,
  }));
}

export async function fetchPaymentsForClub(
  slug: string,
  limit = 100,
  fromTs?: number,
  toTs?: number
): Promise<PaymentRecord[]> {
  const all = await fetchAllPayments(limit, fromTs, toTs);
  return all.filter((p) => p.clubSlug === slug);
}

export async function fetchBalance(): Promise<Stripe.Balance> {
  return getStripe().balance.retrieve();
}

export async function buildClubSummaries(
  fromTs?: number,
  toTs?: number
): Promise<ClubSummary[]> {
  const payments = await fetchAllPayments(100, fromTs, toTs);
  return CLUBS.map((club) => {
    const clubPayments = payments.filter(
      (p) => p.clubSlug === club.slug && p.status === "succeeded"
    );
    return {
      club,
      payments: clubPayments,
      totalCents: clubPayments.reduce((sum, p) => sum + p.amount, 0),
      successCount: clubPayments.length,
    };
  });
}
