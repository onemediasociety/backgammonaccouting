import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { put, list } from "@vercel/blob";

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

const BLOB_PATH = "data/cash-buyins.json";
const TMP_FILE = "/tmp/cash-buyins.json";
const SEED_FILE = path.join(process.cwd(), "data", "cash-buyins.json");
const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

async function readStore(): Promise<CashEntry[]> {
  if (USE_BLOB) {
    try {
      const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 });
      if (blobs.length === 0) return [];
      const res = await fetch(blobs[0].url, { cache: "no-store" });
      if (!res.ok) { console.error("[cash-store] blob fetch failed:", res.status); return []; }
      const data = await res.json();
      return Array.isArray(data) ? (data as CashEntry[]) : [];
    } catch (err) {
      console.error("[cash-store] readStore error:", err);
      return [];
    }
  }
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

async function writeStore(entries: CashEntry[]): Promise<void> {
  const json = JSON.stringify(entries, null, 2);
  if (USE_BLOB) {
    try {
      await put(BLOB_PATH, json, {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
      });
    } catch (err) {
      console.error("[cash-store] writeStore error:", err);
      throw err;
    }
    return;
  }
  fs.writeFileSync(TMP_FILE, json);
  try { fs.writeFileSync(SEED_FILE, json); } catch { /* read-only on some deployments */ }
}

function filterByDate(entries: CashEntry[], from?: string, to?: string): CashEntry[] {
  return entries.filter((e) => {
    if (from && e.date < from) return false;
    if (to && e.date > to) return false;
    return true;
  });
}

export async function getAllCashEntries(from?: string, to?: string): Promise<CashEntry[]> {
  return filterByDate(await readStore(), from, to);
}

export async function getCashEntriesForClub(slug: string, from?: string, to?: string): Promise<CashEntry[]> {
  return filterByDate((await readStore()).filter((e) => e.clubSlug === slug), from, to);
}

export async function addCashEntry(data: Omit<CashEntry, "id" | "totalAmount" | "createdAt">): Promise<CashEntry> {
  const entries = await readStore();
  const entry: CashEntry = {
    ...data,
    id: uuidv4(),
    totalAmount: data.playerCount * data.buyInAmount,
    createdAt: new Date().toISOString(),
  };
  entries.push(entry);
  await writeStore(entries);
  return entry;
}

export async function deleteCashEntry(id: string): Promise<boolean> {
  const entries = await readStore();
  const next = entries.filter((e) => e.id !== id);
  if (next.length === entries.length) return false;
  await writeStore(next);
  return true;
}

export async function getCashTotalsPerClub(from?: string, to?: string): Promise<Record<string, number>> {
  const totals: Record<string, number> = {};
  for (const e of await getAllCashEntries(from, to)) {
    totals[e.clubSlug] = (totals[e.clubSlug] ?? 0) + e.totalAmount;
  }
  return totals;
}
