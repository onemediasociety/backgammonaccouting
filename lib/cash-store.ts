import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { put, list, del } from "@vercel/blob";
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

// Each entry stored as its own blob: cash-entries/{id}.json
// Avoids CDN cache staleness from overwriting a single shared blob.
const BLOB_PREFIX = "cash-entries/";
const TMP_FILE = "/tmp/cash-buyins.json";
const SEED_FILE = path.join(process.cwd(), "data", "cash-buyins.json");

function hasBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// ── Blob helpers ──────────────────────────────────────────────────────────────

async function blobReadAll(): Promise<CashEntry[]> {
  try {
    const { blobs } = await list({ prefix: BLOB_PREFIX, limit: 1000 });
    if (blobs.length === 0) return [];
    const results = await Promise.all(
      blobs.map(async (b) => {
        try {
          const res = await fetch(b.url, { cache: "no-store" });
          return res.ok ? (await res.json() as CashEntry) : null;
        } catch {
          return null;
        }
      })
    );
    return results.filter((e): e is CashEntry => e !== null);
  } catch (err) {
    console.error("[cash-store] blobReadAll error:", err);
    return [];
  }
}

async function blobWriteEntry(entry: CashEntry): Promise<void> {
  await put(`${BLOB_PREFIX}${entry.id}.json`, JSON.stringify(entry), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

async function blobDeleteEntry(id: string): Promise<boolean> {
  const { blobs } = await list({ prefix: `${BLOB_PREFIX}${id}.json`, limit: 1 });
  if (blobs.length === 0) return false;
  await del(blobs[0].url);
  return true;
}

// ── File fallback (local dev, no token) ──────────────────────────────────────

function fileReadAll(): CashEntry[] {
  for (const file of [TMP_FILE, SEED_FILE]) {
    try {
      if (fs.existsSync(file)) {
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as CashEntry[];
      }
    } catch { /* try next */ }
  }
  return [];
}

function fileWriteAll(entries: CashEntry[]): void {
  const json = JSON.stringify(entries, null, 2);
  fs.writeFileSync(TMP_FILE, json);
  try { fs.writeFileSync(SEED_FILE, json); } catch { /* read-only on Vercel */ }
}

// ── Filtering ─────────────────────────────────────────────────────────────────

function filterByDate(entries: CashEntry[], from?: string, to?: string): CashEntry[] {
  return entries.filter((e) => {
    if (from && e.date < from) return false;
    if (to && e.date > to) return false;
    return true;
  });
}

// ── Cached read ───────────────────────────────────────────────────────────────

const getCachedCash = unstable_cache(blobReadAll, ["cash-blob"], {
  revalidate: 60,
  tags: ["cash"],
});

// ── Public API ────────────────────────────────────────────────────────────────

export async function getAllCashEntries(from?: string, to?: string): Promise<CashEntry[]> {
  const all = hasBlob() ? await getCachedCash() : fileReadAll();
  return filterByDate(all, from, to);
}

export async function getCashEntriesForClub(slug: string, from?: string, to?: string): Promise<CashEntry[]> {
  const all = hasBlob() ? await getCachedCash() : fileReadAll();
  return filterByDate(all.filter((e) => e.clubSlug === slug), from, to);
}

export async function addCashEntry(data: Omit<CashEntry, "id" | "totalAmount" | "createdAt">): Promise<CashEntry> {
  const entry: CashEntry = {
    ...data,
    id: uuidv4(),
    totalAmount: data.playerCount * data.buyInAmount,
    createdAt: new Date().toISOString(),
  };
  if (hasBlob()) {
    await blobWriteEntry(entry);
  } else {
    const all = fileReadAll();
    all.push(entry);
    fileWriteAll(all);
  }
  revalidateTag("cash", { expire: 0 });
  return entry;
}

export async function deleteCashEntry(id: string): Promise<boolean> {
  let deleted: boolean;
  if (hasBlob()) {
    deleted = await blobDeleteEntry(id);
  } else {
    const all = fileReadAll();
    const next = all.filter((e) => e.id !== id);
    if (next.length === all.length) return false;
    fileWriteAll(next);
    deleted = true;
  }
  if (deleted) revalidateTag("cash", { expire: 0 });
  return deleted;
}

export async function getCashTotalsPerClub(from?: string, to?: string): Promise<Record<string, number>> {
  const totals: Record<string, number> = {};
  for (const e of await getAllCashEntries(from, to)) {
    totals[e.clubSlug] = (totals[e.clubSlug] ?? 0) + e.totalAmount;
  }
  return totals;
}
