import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export interface PayoutEntry {
  clubSlug: string;
  clubCity: string;
  currency: string;
  recipientName: string;
  recipientEmail?: string;
  pct: number;
  netCents: number;
  amountCents: number;
  transferredAt?: string;
  transferNote?: string;
}

export interface ProcessedPayout {
  id: string;
  period: string;       // "2025-04"  (YYYY-MM)
  periodLabel: string;  // "April 2025"
  processedAt: string;  // ISO timestamp
  processedBy: string;  // username
  entries: PayoutEntry[];
}

const TMP_FILE = "/tmp/payouts.json";
const SEED_FILE = path.join(process.cwd(), "data", "processed-payouts.json");

function readStore(): ProcessedPayout[] {
  for (const file of [TMP_FILE, SEED_FILE]) {
    try {
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as ProcessedPayout[];
      }
    } catch { /* try next */ }
  }
  return [];
}

function writeStore(payouts: ProcessedPayout[]): void {
  const json = JSON.stringify(payouts, null, 2);
  fs.writeFileSync(TMP_FILE, json);
  try { fs.writeFileSync(SEED_FILE, json); } catch { /* read-only on some deployments */ }
}

export function getAllPayouts(): ProcessedPayout[] {
  return readStore().sort((a, b) => b.processedAt.localeCompare(a.processedAt));
}

export function getPayoutById(id: string): ProcessedPayout | undefined {
  return readStore().find((p) => p.id === id);
}

export function recordPayout(
  period: string,
  periodLabel: string,
  processedBy: string,
  entries: PayoutEntry[]
): ProcessedPayout {
  const payout: ProcessedPayout = {
    id: uuidv4(),
    period,
    periodLabel,
    processedAt: new Date().toISOString(),
    processedBy,
    entries,
  };
  const all = readStore();
  all.push(payout);
  writeStore(all);
  return payout;
}

// Marks all entries for a recipient in a payout as transferred
export function markTransferred(payoutId: string, recipientName: string, note?: string): ProcessedPayout | null {
  const all = readStore();
  const idx = all.findIndex((p) => p.id === payoutId);
  if (idx < 0) return null;
  const now = new Date().toISOString();
  all[idx].entries = all[idx].entries.map((e) =>
    e.recipientName === recipientName ? { ...e, transferredAt: now, transferNote: note ?? "" } : e
  );
  writeStore(all);
  return all[idx];
}

// Returns YTD total paid to a recipient (by name) across all payouts in a given year
export function getYtdForRecipient(name: string, year: number): Record<string, number> {
  const prefix = String(year);
  const totals: Record<string, number> = {};
  for (const p of readStore()) {
    if (!p.period.startsWith(prefix)) continue;
    for (const e of p.entries) {
      if (e.recipientName !== name) continue;
      totals[e.currency] = (totals[e.currency] ?? 0) + e.amountCents;
    }
  }
  return totals;
}
