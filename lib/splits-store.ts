import fs from "fs";
import path from "path";

export interface ClubSplit {
  clubSlug: string;
  ownerPct: number; // global owner percentage (e.g. 100, 50, 70)
  adminPct: number; // club admin percentage (e.g. 0, 50, 30)
}

const TMP_FILE = "/tmp/splits.json";
const SEED_FILE = path.join(process.cwd(), "data", "splits.json");

function readStore(): ClubSplit[] {
  for (const file of [TMP_FILE, SEED_FILE]) {
    try {
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as ClubSplit[];
      }
    } catch {
      // try next
    }
  }
  return [];
}

function writeStore(splits: ClubSplit[]): void {
  fs.writeFileSync(TMP_FILE, JSON.stringify(splits, null, 2));
}

export function getAllSplits(): ClubSplit[] {
  return readStore();
}

export function getSplitForClub(slug: string): ClubSplit | undefined {
  return readStore().find((s) => s.clubSlug === slug);
}

export function upsertSplit(
  clubSlug: string,
  ownerPct: number,
  adminPct: number
): ClubSplit {
  if (Math.round(ownerPct + adminPct) !== 100) {
    throw new Error("ownerPct + adminPct must equal 100");
  }
  const splits = readStore();
  const existing = splits.findIndex((s) => s.clubSlug === clubSlug);
  const entry: ClubSplit = { clubSlug, ownerPct, adminPct };
  if (existing >= 0) {
    splits[existing] = entry;
  } else {
    splits.push(entry);
  }
  writeStore(splits);
  return entry;
}
