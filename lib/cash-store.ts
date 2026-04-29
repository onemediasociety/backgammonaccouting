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

const DATA_FILE = path.join(process.cwd(), "data", "cash-buyins.json");

function readStore(): CashEntry[] {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as CashEntry[];
  } catch {
    return [];
  }
}

function writeStore(entries: CashEntry[]): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2));
}

export function getAllCashEntries(): CashEntry[] {
  return readStore();
}

export function getCashEntriesForClub(slug: string): CashEntry[] {
  return readStore().filter((e) => e.clubSlug === slug);
}

export function addCashEntry(
  data: Omit<CashEntry, "id" | "totalAmount" | "createdAt">
): CashEntry {
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

export function getCashTotalsPerClub(): Record<string, number> {
  const entries = readStore();
  const totals: Record<string, number> = {};
  for (const e of entries) {
    totals[e.clubSlug] = (totals[e.clubSlug] ?? 0) + e.totalAmount;
  }
  return totals;
}
