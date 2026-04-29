import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export interface CashEntry {
  id: string;
  clubSlug: string;
  date: string;
  event: string;
  playerCount: number;
  buyInAmount: number;
  currency: string;
  totalAmount: number;
  notes: string;
  createdAt: string;
}

// On Vercel the project root is read-only; use /tmp for writes.
// Reads fall back to the bundled seed file in /data.
const TMP_FILE = "/tmp/cash-buyins.json";
const SEED_FILE = path.join(process.cwd(), "data", "cash-buyins.json");

function readStore(): CashEntry[] {
  // Prefer /tmp (has any entries added at runtime)
  for (const file of [TMP_FILE, SEED_FILE]) {
    try {
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as CashEntry[];
      }
    } catch {
      // try next file
    }
  }
  return [];
}

function writeStore(entries: CashEntry[]): void {
  fs.writeFileSync(TMP_FILE, JSON.stringify(entries, null, 2));
}

export function getAllCashEntries(from?: string, to?: string): CashEntry[] {
  return filterByDate(readStore(), from, to);
}

export function getCashEntriesForClub(slug: string, from?: string, to?: string): CashEntry[] {
  return filterByDate(readStore().filter((e) => e.clubSlug === slug), from, to);
}

function filterByDate(entries: CashEntry[], from?: string, to?: string): CashEntry[] {
  return entries.filter((e) => {
    if (from && e.date < from) return false;
    if (to && e.date > to) return false;
    return true;
  });
}

export function addCashEntry(data: Omit<CashEntry, "id" | "totalAmount" | "createdAt">): CashEntry {
  const entries = readStore();
  const entry: CashEntry = {
    ...data,
    id: uuidv4(),
    totalAmount: data.playerCount * data.buyInAmount,
    createdAt: new Date().toISOString(),
  };
  entries.push(entry);
  writeStore(entries);
  return entry;
}

export function deleteCashEntry(id: string): boolean {
  const entries = readStore();
  const next = entries.filter((e) => e.id !== id);
  if (next.length === entries.length) return false;
  writeStore(next);
  return true;
}

export function getCashTotalsPerClub(from?: string, to?: string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const e of getAllCashEntries(from, to)) {
    totals[e.clubSlug] = (totals[e.clubSlug] ?? 0) + e.totalAmount;
  }
  return totals;
}
