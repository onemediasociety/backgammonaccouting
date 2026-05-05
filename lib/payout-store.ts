import { v4 as uuidv4 } from "uuid";
import { put, head } from "@vercel/blob";
import { unstable_cache, revalidateTag } from "next/cache";
import fs from "fs";
import path from "path";

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

const BLOB_KEY = "payouts/all.json";
const SEED_FILE = path.join(process.cwd(), "data", "processed-payouts.json");

function hasBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

function readSeed(): ProcessedPayout[] {
  try {
    if (fs.existsSync(SEED_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));
      if (Array.isArray(parsed)) return parsed as ProcessedPayout[];
    }
  } catch { /* ignore */ }
  return [];
}

async function blobRead(): Promise<ProcessedPayout[]> {
  try {
    const info = await head(BLOB_KEY);
    const res = await fetch(info.url, { cache: "no-store" });
    if (!res.ok) return readSeed();
    const data = await res.json();
    return Array.isArray(data) ? (data as ProcessedPayout[]) : readSeed();
  } catch {
    return readSeed();
  }
}

async function blobWrite(payouts: ProcessedPayout[]): Promise<void> {
  await put(BLOB_KEY, JSON.stringify(payouts), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  revalidateTag("payouts", { expire: 0 } as Parameters<typeof revalidateTag>[1]);
}

const getCachedPayouts = unstable_cache(blobRead, ["payouts-blob"], {
  revalidate: 60,
  tags: ["payouts"],
});

async function readStore(): Promise<ProcessedPayout[]> {
  if (!hasBlob()) return readSeed();
  return getCachedPayouts();
}

export async function getAllPayouts(): Promise<ProcessedPayout[]> {
  const all = await readStore();
  return all.sort((a, b) => b.processedAt.localeCompare(a.processedAt));
}

export async function getPayoutById(id: string): Promise<ProcessedPayout | undefined> {
  const all = await readStore();
  return all.find((p) => p.id === id);
}

export async function recordPayout(
  period: string,
  periodLabel: string,
  processedBy: string,
  entries: PayoutEntry[]
): Promise<ProcessedPayout> {
  const payout: ProcessedPayout = {
    id: uuidv4(),
    period,
    periodLabel,
    processedAt: new Date().toISOString(),
    processedBy,
    entries,
  };
  const all = hasBlob() ? await blobRead() : readSeed();
  all.push(payout);
  if (hasBlob()) await blobWrite(all);
  return payout;
}

export async function markTransferred(payoutId: string, recipientName: string, note?: string): Promise<ProcessedPayout | null> {
  const all = hasBlob() ? await blobRead() : readSeed();
  const idx = all.findIndex((p) => p.id === payoutId);
  if (idx < 0) return null;
  const now = new Date().toISOString();
  all[idx].entries = all[idx].entries.map((e) =>
    e.recipientName === recipientName ? { ...e, transferredAt: now, transferNote: note ?? "" } : e
  );
  if (hasBlob()) await blobWrite(all);
  return all[idx];
}

export async function getYtdForRecipient(name: string, year: number): Promise<Record<string, number>> {
  const all = await readStore();
  const prefix = String(year);
  const totals: Record<string, number> = {};
  for (const p of all) {
    if (!p.period.startsWith(prefix)) continue;
    for (const e of p.entries) {
      if (e.recipientName !== name) continue;
      totals[e.currency] = (totals[e.currency] ?? 0) + e.amountCents;
    }
  }
  return totals;
}
