import { PaymentRecord } from "./stripe-client";
import { CashEntry } from "./cash-store";

interface MonthBar {
  label: string;
  stripe: number;
  cash: number;
}

function monthKey(ts: number): string {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString("en-US", { month: "short" });
}

export function buildMonthlyRevenue(
  stripePayments: PaymentRecord[],
  cashEntries: CashEntry[],
  monthsBack = 6
): MonthBar[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(Math.floor(d.getTime() / 1000)));
  }

  const stripeByMonth: Record<string, number> = {};
  for (const p of stripePayments) {
    if (p.status !== "succeeded") continue;
    const key = monthKey(p.created);
    stripeByMonth[key] = (stripeByMonth[key] ?? 0) + p.amount;
  }

  const cashByMonth: Record<string, number> = {};
  for (const e of cashEntries) {
    const key = e.date.slice(0, 7); // "YYYY-MM"
    cashByMonth[key] = (cashByMonth[key] ?? 0) + e.totalAmount;
  }

  return keys.map((key) => ({
    label: monthLabel(key),
    stripe: stripeByMonth[key] ?? 0,
    cash: cashByMonth[key] ?? 0,
  }));
}
