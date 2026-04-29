export interface Club {
  slug: string;
  name: string;
  city: string;
  country: string;
  currency: string;
  flag: string;
  color: string;
  accentBg: string;
  accentText: string;
  matchFn: (amount: number, currency: string) => boolean;
}

export const CLUBS: Club[] = [
  {
    slug: "nyc",
    name: "NYC Backgammon Society",
    city: "New York City",
    country: "US",
    currency: "usd",
    flag: "🗽",
    color: "blue",
    accentBg: "bg-blue-50",
    accentText: "text-blue-700",
    // $26 = base price; $27 = $26 + Stripe automatic tax (~3.85%)
    // Both map to NYC — the only $26 Stripe product (prod_TgUTQ67JBNXER8).
    // DC will need its own Stripe product before online payments can be split.
    matchFn: (amount, currency) =>
      currency === "usd" && (amount === 2600 || amount === 2700),
  },
  {
    slug: "dc",
    name: "DC Backgammon Club",
    city: "Washington, DC",
    country: "US",
    currency: "usd",
    flag: "🏛️",
    color: "indigo",
    accentBg: "bg-indigo-50",
    accentText: "text-indigo-700",
    // No Stripe product exists yet for DC — cash buy-ins only until one is created.
    matchFn: () => false,
  },
  {
    slug: "miami",
    name: "Backgammon Club Miami",
    city: "Miami",
    country: "US",
    currency: "usd",
    flag: "🌴",
    color: "green",
    accentBg: "bg-emerald-50",
    accentText: "text-emerald-700",
    // Miami price is $25.00
    matchFn: (amount, currency) => currency === "usd" && amount === 2500,
  },
  {
    slug: "geneva",
    name: "Geneva Backgammon Club",
    city: "Geneva",
    country: "CH",
    currency: "chf",
    flag: "🇨🇭",
    color: "red",
    accentBg: "bg-red-50",
    accentText: "text-red-700",
    matchFn: (_amount, currency) => currency === "chf",
  },
  {
    slug: "montreal",
    name: "Montreal Backgammon Club",
    city: "Montreal",
    country: "CA",
    currency: "cad",
    flag: "🍁",
    color: "purple",
    accentBg: "bg-purple-50",
    accentText: "text-purple-700",
    matchFn: (_amount, currency) => currency === "cad",
  },
  {
    slug: "paris",
    name: "Paris Backgammon Club",
    city: "Paris",
    country: "FR",
    currency: "eur",
    flag: "🗼",
    color: "amber",
    accentBg: "bg-amber-50",
    accentText: "text-amber-700",
    matchFn: (_amount, currency) => currency === "eur",
  },
  {
    slug: "special",
    name: "Special Events",
    city: "Various",
    country: "US",
    currency: "usd",
    flag: "⭐",
    color: "yellow",
    accentBg: "bg-yellow-50",
    accentText: "text-yellow-700",
    // $40+ USD or small test payments
    matchFn: (amount, currency) =>
      currency === "usd" && (amount >= 4000 || amount === 100),
  },
];

export function classifyPayment(amount: number, currency: string): Club {
  const club = CLUBS.find((c) => c.matchFn(amount, currency));
  return (
    club ?? {
      slug: "other",
      name: "Other",
      city: "Unknown",
      country: "",
      currency,
      flag: "❓",
      color: "gray",
      accentBg: "bg-gray-50",
      accentText: "text-gray-700",
      matchFn: () => true,
    }
  );
}

export function getClub(slug: string): Club | undefined {
  return CLUBS.find((c) => c.slug === slug);
}

export function formatAmount(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amountCents / 100);
}
