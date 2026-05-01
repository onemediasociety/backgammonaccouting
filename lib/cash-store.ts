import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { put } from "@vercel/blob";

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

// Derive the public blob URL directly from the token so we can fetch without
// a list() round-trip. Token format: vercel_blob_rw_{storeId}_{key}
function getBlobUrl(): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  const storeId = token.split("_")[3];
  if (!storeId) return null;
  return `https://${storeId}.public.blob.vercel-storage.com/${BLOB_PATH}`;
}

async function readStore(): Promise<CashEntry[]> {
  const blobUrl = getBlobUrl();
  if (blobUrl) {
    try {
      const res = await fetch(blobUrl, { cache: "no-store" });
      if (res.status === 404) return []; // blob doesn't exist yet
      if (!res.ok) { console.error("[cash-store] blob fetch failed:", res.status, blobUrl); return []; }
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
  if (getBlobUrl()) {
    try {
      await put(BLOB_PATH, json, {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
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
