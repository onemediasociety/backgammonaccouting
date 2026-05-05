// Approximate mid-market rates as of May 2025.
// These are used only for informational display of preferred-currency equivalents.
// Actual transfer rates will differ; update periodically if drift is significant.

// How many USD does 1 unit of this currency buy?
const USD_PER_UNIT: Record<string, number> = {
  usd: 1.000,
  eur: 1.087,
  gbp: 1.270,
  cad: 0.730,
  chf: 1.110,
  mad: 0.100,
  aud: 0.640,
  mxn: 0.052,
  brl: 0.183,
};

export const SUPPORTED_CURRENCIES = ["usd", "eur", "gbp", "cad", "chf", "mad", "aud", "mxn", "brl"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function convertCents(amountCents: number, from: string, to: string): number {
  if (from === to) return amountCents;
  const fromRate = USD_PER_UNIT[from.toLowerCase()] ?? 1;
  const toRate = USD_PER_UNIT[to.toLowerCase()] ?? 1;
  return Math.round(amountCents * fromRate / toRate);
}

export function fxLabel(from: string, to: string): string {
  if (from === to) return "";
  const fromRate = USD_PER_UNIT[from.toLowerCase()] ?? 1;
  const toRate = USD_PER_UNIT[to.toLowerCase()] ?? 1;
  const rate = fromRate / toRate;
  return `1 ${from.toUpperCase()} ≈ ${rate.toFixed(3)} ${to.toUpperCase()} (indicative)`;
}
