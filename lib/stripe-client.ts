import { unstable_cache } from "next/cache";
import Stripe from "stripe";
import { classifyPayment, CLUBS, type Club } from "./clubs";
import { getVenueMappings } from "./venues-store";

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
  customerName: string | null;
  customerEmail: string | null;
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

// Keywords to match against the Stripe charge description (case-insensitive).
const DESCRIPTION_KEYWORDS: Array<{ slug: string; keywords: string[] }> = [
  { slug: "nyc",      keywords: ["NYC", "NEW YORK"] },
  { slug: "miami",    keywords: ["MIAMI"] },
  { slug: "geneva",   keywords: ["GENEVA"] },
  { slug: "montreal", keywords: ["MONTREAL"] },
  { slug: "paris",    keywords: ["PARIS"] },
  { slug: "lisbon",   keywords: ["LISBON"] },
  { slug: "dc",       keywords: ["WASHINGTON", "D.C.", " DC", "VERA"] },
  { slug: "hollywood", keywords: ["HOLLYWOOD"] },
];

function classifyByDescription(description: string | null): string | null {
  if (!description) return null;
  const upper = description.toUpperCase();
  for (const { keywords, slug } of DESCRIPTION_KEYWORDS) {
    if (keywords.some((k) => upper.includes(k))) return slug;
  }
  const venues = getVenueMappings();
  for (const { keyword, clubSlug } of venues) {
    if (upper.includes(keyword)) return clubSlug;
  }
  return null;
}

function getClubSlug(
  amount: number,
  currency: string,
  description: string | null
): string {
  return classifyByDescription(description) ?? classifyPayment(amount, currency).slug;
}

// ─── Raw Stripe fetchers (never called directly outside this file) ───────────

async function _fetchAllPaymentsRaw(
  fromTs: number | null,
  toTs: number | null,
  maxRecords: number
): Promise<PaymentRecord[]> {
  const stripe = getStripe();
  const params: Stripe.PaymentIntentListParams = {
    limit: 100,
    expand: ["data.latest_charge"],
  };
  if (fromTs !== null || toTs !== null) {
    params.created = {};
    if (fromTs !== null) (params.created as Stripe.RangeQueryParam).gte = fromTs;
    if (toTs !== null) (params.created as Stripe.RangeQueryParam).lte = toTs;
  }
  const results: PaymentRecord[] = [];
  for await (const pi of stripe.paymentIntents.list(params)) {
    const charge = pi.latest_charge as Stripe.Charge | null;
    const description = charge?.description ?? pi.description;
    results.push({
      id: pi.id,
      amount: pi.amount,
      currency: pi.currency,
      status: pi.status,
      created: pi.created,
      description,
      clubSlug: getClubSlug(pi.amount, pi.currency, description),
      customerName: charge?.billing_details?.name ?? null,
      customerEmail: charge?.billing_details?.email ?? null,
    });
    if (results.length >= maxRecords) break;
  }
  return results;
}

async function _fetchChargesRaw(
  fromTs: number | null,
  toTs: number | null,
  maxRecords: number
): Promise<ChargeRecord[]> {
  const stripe = getStripe();
  const params: Stripe.ChargeListParams = {
    limit: 100,
    expand: ["data.balance_transaction"],
  };
  if (fromTs !== null || toTs !== null) {
    params.created = {};
    if (fromTs !== null) (params.created as Stripe.RangeQueryParam).gte = fromTs;
    if (toTs !== null) (params.created as Stripe.RangeQueryParam).lte = toTs;
  }
  const results: ChargeRecord[] = [];
  for await (const c of stripe.charges.list(params)) {
    const bt = c.balance_transaction as Stripe.BalanceTransaction | null;
    // bt.fee is in the settlement currency (e.g. USD for a US Stripe account).
    // For cross-currency charges (CHF, EUR, CAD), we convert back to the
    // presentment currency using bt.exchange_rate so the fee is comparable
    // to the revenue figure shown on each club page.
    // exchange_rate: 1 presentment unit = exchange_rate settlement units
    // fee_in_presentment = fee_in_settlement / exchange_rate
    const exchangeRate = bt?.exchange_rate ?? null;
    const feeInPresentment = bt
      ? exchangeRate
        ? Math.round(bt.fee / exchangeRate)
        : bt.fee   // same currency — no conversion needed
      : 0;
    results.push({
      id: c.id,
      amount: c.amount,
      fee: feeInPresentment,
      net: bt?.net ?? c.amount,
      currency: c.currency,
      status: c.status,
      created: c.created,
      description: c.description,
      receiptUrl: c.receipt_url ?? null,
      clubSlug: getClubSlug(c.amount, c.currency, c.description),
      refunded: c.refunded,
      amountRefunded: c.amount_refunded,
    });
    if (results.length >= maxRecords) break;
  }
  return results;
}

// ─── Cached wrappers — 2-minute TTL, tag-revalidatable ───────────────────────

// unstable_cache requires serialisable (non-undefined) args, so we normalise
// undefined → null before caching.

const _cachedPayments = unstable_cache(
  _fetchAllPaymentsRaw,
  ["stripe-payments"],
  { revalidate: 1800, tags: ["stripe-data"] }
);

const _cachedCharges = unstable_cache(
  _fetchChargesRaw,
  ["stripe-charges"],
  { revalidate: 1800, tags: ["stripe-data"] }
);

// ─── Public API ──────────────────────────────────────────────────────────────

export async function fetchAllPayments(
  fromTs?: number,
  toTs?: number,
  maxRecords = 1000
): Promise<PaymentRecord[]> {
  return _cachedPayments(fromTs ?? null, toTs ?? null, maxRecords);
}

export async function fetchPaymentsForClub(
  slug: string,
  fromTs?: number,
  toTs?: number,
  // maxRecords ignored — we filter from the shared cached fetch
): Promise<PaymentRecord[]> {
  const all = await _cachedPayments(fromTs ?? null, toTs ?? null, 1000);
  return all.filter((p) => p.clubSlug === slug);
}

export async function fetchChargesWithFees(
  fromTs?: number,
  toTs?: number,
  maxRecords = 500
): Promise<ChargeRecord[]> {
  return _cachedCharges(fromTs ?? null, toTs ?? null, maxRecords);
}

export async function fetchFeesByClub(
  fromTs?: number,
  toTs?: number,
  maxRecords = 500
): Promise<Record<string, number>> {
  const charges = await fetchChargesWithFees(fromTs, toTs, maxRecords);
  const fees: Record<string, number> = {};
  for (const c of charges) {
    if (c.status !== "succeeded") continue;
    fees[c.clubSlug] = (fees[c.clubSlug] ?? 0) + c.fee;
  }
  return fees;
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

export async function fetchBalance(): Promise<Stripe.Balance> {
  return getStripe().balance.retrieve();
}

export async function buildClubSummaries(
  fromTs?: number,
  toTs?: number
): Promise<ClubSummary[]> {
  const payments = await fetchAllPayments(fromTs, toTs);
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
