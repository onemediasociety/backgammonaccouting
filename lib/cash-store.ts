import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { put, head } from "@vercel/blob";
import { unstable_cache, revalidateTag } from "next/cache";

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

const BLOB_KEY = "cash/all.json";
const SEED_FILE = path.join(process.cwd(), "data", "cash-buyins.json");

function hasBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

function readSeed(): CashEntry[] {
  try {
    if (fs.existsSync(SEED_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));
      if (Array.isArray(parsed)) return parsed as CashEntry[];
    }
  } catch { /* ignore */ }
  return [];
}

async function blobRead(): Promise<CashEntry[]> {
  try {
    const info = await head(BLOB_KEY);
    const res = await fetch(info.url, { cache: "no-store" });
    if (!res.ok) return readSeed();
    const data = await res.json();
    return Array.isArray(data) ? (data as CashEntry[]) : readSeed();
  } catch {
    return readSeed();
  }
}

async function blobWrite(entries: CashEntry[]): Promise<void> {
  await put(BLOB_KEY, JSON.stringify(entries), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  revalidateTag("cash", { expire: 0 } as Parameters<typeof revalidateTag>[1]);
}

const getCachedCash = unstable_cache(blobRead, ["cash-blob"], {
  revalidate: 60,
  tags: ["cash"],
});

function filterByDate(entries: CashEntry[], from?: string, to?: string): CashEntry[] {
  return entries.filter((e) => {
    if (from && e.date < from) return false;
    if (to && e.date > to) return false;
    return true;
  });
}

async function readStore(): Promise<CashEntry[]> {
  if (!hasBlob()) return readSeed();
  return getCachedCash();
}

export async function getAllCashEntries(from?: string, to?: string): Promise<CashEntry[]> {
  return filterByDate(await readStore(), from, to);
}

export async function getCashEntriesForClub(slug: string, from?: string, to?: string): Promise<CashEntry[]> {
  const all = await readStore();
  return filterByDate(all.filter((e) => e.clubSlug === slug), from, to);
}

export async function addCashEntry(data: Omit<CashEntry, "id" | "totalAmount" | "createdAt">): Promise<CashEntry> {
  const entry: CashEntry = {
    ...data,
    id: uuidv4(),
    totalAmount: data.playerCount * data.buyInAmount,
    createdAt: new Date().toISOString(),
  };
  const all = hasBlob() ? await blobRead() : readSeed();
  all.push(entry);
  if (hasBlob()) await blobWrite(all);
  return entry;
}

export async function deleteCashEntry(id: string): Promise<boolean> {
  const all = hasBlob() ? await blobRead() : readSeed();
  const next = all.filter((e) => e.id !== id);
  if (next.length === all.length) return false;
  if (hasBlob()) await blobWrite(next);
  return true;
}

export async function getCashTotalsPerClub(from?: string, to?: string): Promise<Record<string, number>> {
  const totals: Record<string, number> = {};
  for (const e of await getAllCashEntries(from, to)) {
    totals[e.clubSlug] = (totals[e.clubSlug] ?? 0) + e.totalAmount;
  }
  return totals;
}
