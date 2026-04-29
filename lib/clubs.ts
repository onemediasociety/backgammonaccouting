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
  ticketCents?: number;
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
    ticketCents: 2600,
    // Match any multiple of the $26 ticket price; description keyword used first.
    // $27 single-ticket (with Stripe tax) is still caught by description matching.
    matchFn: (amount, currency) =>
      currency === "usd" && amount > 0 && amount % 2600 === 0,
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
    ticketCents: 2500,
    matchFn: (amount, currency) => currency === "usd" && amount > 0 && amount % 2500 === 0,
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
    ticketCents: 4000,
    matchFn: (amount, currency) => currency === "eur" && amount > 0 && amount % 4000 === 0,
  },
  {
    slug: "lisbon",
    name: "Lisbon Backgammon Club",
    city: "Lisbon",
    country: "PT",
    currency: "eur",
    flag: "🇵🇹",
    color: "green",
    accentBg: "bg-green-50",
    accentText: "text-green-700",
    ticketCents: 2300,
    matchFn: (amount, currency) => currency === "eur" && amount > 0 && amount % 2300 === 0,
  },
  {
    slug: "hollywood",
    name: "Hollywood Backgammon Club",
    city: "Hollywood",
    country: "US",
    currency: "usd",
    flag: "🏖️",
    color: "orange",
    accentBg: "bg-orange-50",
    accentText: "text-orange-700",
    ticketCents: 2700,
    // $27 same as NYC — description keyword matching takes priority; amount fallback won't fire
    // because NYC ($26 multiples) comes first in the array and $27 isn't a multiple of $26.
    matchFn: (amount, currency) => currency === "usd" && amount > 0 && amount % 2700 === 0,
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
