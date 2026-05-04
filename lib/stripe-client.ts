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
  fee: number;           // in presentment currency (same as amount)
  feeUsd: number;        // raw fee in USD (Stripe settlement currency)
  receiptUrl: string | null;
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
  { slug: "dc",        keywords: ["WASHINGTON", "D.C.", "DC", "VERA"] },
  { slug: "nyc",       keywords: ["NYC", "NEW YORK"] },
  { slug: "miami",     keywords: ["MIAMI"] },
  { slug: "geneva",    keywords: ["GENEVA"] },
  { slug: "montreal",  keywords: ["MONTREAL"] },
  { slug: "paris",     keywords: ["PARIS"] },
  { slug: "lisbon",    keywords: ["LISBON"] },
  { slug: "hollywood", keywords: ["HOLLYWOOD"] },
  { slug: "morocco",   keywords: ["MOROCCO", "CASABLANCA", "MARRAKECH", "MAROC"] },
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

// Parse PAYMENT_LINK_CLUBS env var: comma-separated "plinkId:clubSlug" pairs
// e.g. PAYMENT_LINK_CLUBS=plink_abc123:dc,plink_def456:miami
function getPaymentLinkMap(): Record<string, string> {
  const raw = process.env.PAYMENT_LINK_CLUBS ?? "";
  const map: Record<string, string> = {};
  for (const pair of raw.split(",")) {
    const [id, slug] = pair.trim().split(":");
    if (id && slug) map[id.trim()] = slug.trim().toLowerCase();
  }
  return map;
}

function slugFromMetadata(metadata: Record<string, string> | null | undefined): string | null {
  if (!metadata) return null;
  const val = metadata.club ?? metadata.clubSlug ?? metadata.club_slug ?? null;
  return val ? val.toLowerCase() : null;
}

function getClubSlug(
  amount: number,
  currency: string,
  description: string | null,
  metadata?: Record<string, string> | null,
  paymentLinkId?: string | null,
): string {
  if (paymentLinkId) {
    const mapped = getPaymentLinkMap()[paymentLinkId];
    if (mapped) return mapped;
  }
  return slugFromMetadata(metadata) ?? classifyByDescription(description) ?? classifyPayment(amount, currency).slug;
}

// ─── Single Stripe fetch: payments + fees in one paginated call ───────────────
// Expands latest_charge.balance_transaction so we get fee data without
// a second charges.list call — halves the number of Stripe API requests.

async function _fetchAllPaymentsRaw(
  fromTs: number | null,
  toTs: number | null,
  maxRecords: number
): Promise<PaymentRecord[]> {
  const stripe = getStripe();
  const params: Stripe.PaymentIntentListParams = {
    limit: 100,
    expand: ["data.latest_charge", "data.latest_charge.balance_transaction"],
  };
  if (fromTs !== null || toTs !== null) {
    params.created = {};
    if (fromTs !== null) (params.created as Stripe.RangeQueryParam).gte = fromTs;
    if (toTs !== null)   (params.created as Stripe.RangeQueryParam).lte = toTs;
  }
  const results: PaymentRecord[] = [];
  for await (const pi of stripe.paymentIntents.list(params)) {
    const charge = pi.latest_charge as Stripe.Charge | null;
    const bt = charge?.balance_transaction as Stripe.BalanceTransaction | null;
    const description = charge?.description ?? pi.description;

    // bt.fee is in the settlement currency (e.g. USD for a US Stripe account).
    // Convert back to the presentment currency using bt.exchange_rate so the
    // fee is directly comparable to the revenue amount on each club page.
    const exchangeRate = bt?.exchange_rate ?? null;
    const feeInPresentment = bt
      ? exchangeRate ? Math.round(bt.fee / exchangeRate) : bt.fee
      : 0;

    results.push({
      id: pi.id,
      amount: pi.amount,
      currency: pi.currency,
      status: pi.status,
      created: pi.created,
      description,
      clubSlug: getClubSlug(
        pi.amount, pi.currency, description,
        pi.metadata as Record<string, string> | null,
        // Stripe auto-sets payment_link on the charge metadata for payment link purchases
        (charge?.metadata?.payment_link as string | undefined)
          ?? ((pi as unknown as Record<string, unknown>).payment_link as string | null)
          ?? null
      ),
      customerName: charge?.billing_details?.name ?? null,
      customerEmail: charge?.billing_details?.email ?? null,
      fee: feeInPresentment,
      feeUsd: bt?.fee ?? 0,
      receiptUrl: charge?.receipt_url ?? null,
    });
    if (results.length >= maxRecords) break;
  }
  return results;
}

// ─── Cached wrapper — 30-minute TTL, tag-revalidatable ───────────────────────

const _cachedPayments = unstable_cache(
  _fetchAllPaymentsRaw,
  ["stripe-payments"],
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
): Promise<PaymentRecord[]> {
  const all = await _cachedPayments(fromTs ?? null, toTs ?? null, 1000);
  return all.filter((p) => p.clubSlug === slug);
}

// Derives fees from the already-cached payments — no second Stripe call needed.
export async function fetchFeesByClub(
  fromTs?: number,
  toTs?: number,
): Promise<Record<string, number>> {
  const payments = await _cachedPayments(fromTs ?? null, toTs ?? null, 1000);
  const fees: Record<string, number> = {};
  for (const p of payments) {
    if (p.status !== "succeeded") continue;
    fees[p.clubSlug] = (fees[p.clubSlug] ?? 0) + p.fee;
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
