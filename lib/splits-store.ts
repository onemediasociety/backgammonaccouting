import fs from "fs";
import path from "path";
import { put, list, del } from "@vercel/blob";

export interface SplitRecipient {
  name: string;
  pct: number;
  email?: string;
}

export interface ClubSplit {
  clubSlug: string;
  recipients: SplitRecipient[];
}

const BLOB_PREFIX = "splits/";
const TMP_FILE = "/tmp/splits.json";
const SEED_FILE = path.join(process.cwd(), "data", "splits.json");

function hasBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// ── Blob helpers ──────────────────────────────────────────────────────────────

async function blobReadAll(): Promise<ClubSplit[]> {
  try {
    const { blobs } = await list({ prefix: BLOB_PREFIX, limit: 200 });
    if (blobs.length === 0) return [];
    const results = await Promise.all(
      blobs.map(async (b) => {
        try {
          const res = await fetch(b.url, { cache: "no-store" });
          return res.ok ? (await res.json() as ClubSplit) : null;
        } catch { return null; }
      })
    );
    return results.filter((s): s is ClubSplit => s !== null);
  } catch (err) {
    console.error("[splits-store] blobReadAll error:", err);
    return [];
  }
}

async function blobWrite(split: ClubSplit): Promise<void> {
  await put(`${BLOB_PREFIX}${split.clubSlug}.json`, JSON.stringify(split), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

// ── File fallback ─────────────────────────────────────────────────────────────

function migrate(raw: unknown[]): ClubSplit[] {
  return raw.map((item) => {
    const r = item as Record<string, unknown>;
    if (r.recipients) return r as unknown as ClubSplit;
    const recipients: SplitRecipient[] = [{ name: "Global", pct: Number(r.ownerPct ?? 100) }];
    if (Number(r.adminPct) > 0) recipients.push({ name: "Admin", pct: Number(r.adminPct) });
    return { clubSlug: r.clubSlug as string, recipients };
  });
}

function fileReadAll(): ClubSplit[] {
  for (const file of [TMP_FILE, SEED_FILE]) {
    try {
      if (fs.existsSync(file)) {
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        if (Array.isArray(parsed) && parsed.length > 0) return migrate(parsed);
      }
    } catch { /* try next */ }
  }
  return [];
}

function fileWriteAll(splits: ClubSplit[]): void {
  const json = JSON.stringify(splits, null, 2);
  fs.writeFileSync(TMP_FILE, json);
  try { fs.writeFileSync(SEED_FILE, json); } catch { /* read-only on Vercel */ }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getAllSplits(): Promise<ClubSplit[]> {
  if (!hasBlob()) return fileReadAll();
  const blobs = await blobReadAll();
  if (blobs.length > 0) return blobs;
  // Blob is empty — auto-migrate from seed file
  const fromFile = fileReadAll();
  if (fromFile.length > 0) {
    await Promise.all(fromFile.map((s) => blobWrite(s)));
    return fromFile;
  }
  return [];
}

export async function getSplitForClub(slug: string): Promise<ClubSplit | undefined> {
  const all = await getAllSplits();
  return all.find((s) => s.clubSlug === slug);
}

// Force-write all splits from the seed file to Blob, overwriting any stale data.
export async function syncSplitsFromSeed(): Promise<ClubSplit[]> {
  const fromFile = fileReadAll();
  if (hasBlob()) {
    await Promise.all(fromFile.map((s) => blobWrite(s)));
  } else {
    fileWriteAll(fromFile);
  }
  return fromFile;
}

export async function upsertSplit(clubSlug: string, recipients: SplitRecipient[]): Promise<ClubSplit> {
  const total = recipients.reduce((s, r) => s + r.pct, 0);
  if (Math.round(total) !== 100) throw new Error("Recipient percentages must add up to 100");
  const entry: ClubSplit = { clubSlug, recipients };
  if (hasBlob()) {
    await blobWrite(entry);
  } else {
    const all = fileReadAll();
    const idx = all.findIndex((s) => s.clubSlug === clubSlug);
    if (idx >= 0) all[idx] = entry; else all.push(entry);
    fileWriteAll(all);
  }
  return entry;
}
