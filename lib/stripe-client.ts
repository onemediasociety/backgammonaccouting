import Stripe from "stripe";
import { classifyPayment, CLUBS, type Club } from "./clubs";

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    stripeInstance = new Stripe(key);
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

export interface ChargeRecord {
  id: string;
  amount: number;
  fee: number;
  net: number;
  currency: string;
  status: string;
  created: number;
  description: string | null;
  receiptUrl: string | null;
  clubSlug: string;
  refunded: boolean;
  amountRefunded: number;
}

export interface PayoutRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrivalDate: number;
  created: number;
  description: string | null;
}

export interface CustomerRecord {
  id: string;
  name: string | null;
  email: string | null;
  created: number;
  totalSpend: number;
  currency: string;
}

export async function fetchChargesWithFees(
  limit = 100,
  fromTs?: number,
  toTs?: number
): Promise<ChargeRecord[]> {
  const stripe = getStripe();
  const params: Stripe.ChargeListParams = {
    limit,
    expand: ["data.balance_transaction"],
  };
  if (fromTs || toTs) {
    params.created = {};
    if (fromTs) (params.created as Stripe.RangeQueryParam).gte = fromTs;
    if (toTs) (params.created as Stripe.RangeQueryParam).lte = toTs;
  }
  const charges = await stripe.charges.list(params);
  return charges.data.map((c) => {
    const bt = c.balance_transaction as Stripe.BalanceTransaction | null;
    return {
      id: c.id,
      amount: c.amount,
      fee: bt?.fee ?? 0,
      net: bt?.net ?? c.amount,
      currency: c.currency,
      status: c.status,
      created: c.created,
      description: c.description,
      receiptUrl: c.receipt_url ?? null,
      clubSlug: classifyPayment(c.amount, c.currency).slug,
      refunded: c.refunded,
      amountRefunded: c.amount_refunded,
    };
  });
}

export async function fetchPayouts(limit = 50): Promise<PayoutRecord[]> {
  const stripe = getStripe();
  const payouts = await stripe.payouts.list({ limit });
  return payouts.data.map((p) => ({
    id: p.id,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    arrivalDate: p.arrival_date,
    created: p.created,
    description: p.description ?? null,
  }));
}

export async function fetchCustomers(limit = 100): Promise<CustomerRecord[]> {
  const stripe = getStripe();
  const customers = await stripe.customers.list({ limit, expand: [] });
  return customers.data.map((c) => ({
    id: c.id,
    name: c.name ?? null,
    email: c.email ?? null,
    created: c.created,
    totalSpend: 0,
    currency: "usd",
  }));
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
