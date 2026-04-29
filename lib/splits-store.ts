import fs from "fs";
import path from "path";

export interface SplitRecipient {
  name: string;
  pct: number;
  email?: string;
}

export interface ClubSplit {
  clubSlug: string;
  recipients: SplitRecipient[];
}

const TMP_FILE = "/tmp/splits.json";
const SEED_FILE = path.join(process.cwd(), "data", "splits.json");

// Migrate old { ownerPct, adminPct } format to new recipients format
function migrate(raw: unknown[]): ClubSplit[] {
  return raw.map((item) => {
    const r = item as Record<string, unknown>;
    if (r.recipients) return r as unknown as ClubSplit;
    const recipients: SplitRecipient[] = [{ name: "Global", pct: Number(r.ownerPct ?? 100) }];
    if (Number(r.adminPct) > 0) recipients.push({ name: "Admin", pct: Number(r.adminPct) });
    return { clubSlug: r.clubSlug as string, recipients };
  });
}

function readStore(): ClubSplit[] {
  for (const file of [TMP_FILE, SEED_FILE]) {
    try {
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return migrate(parsed);
      }
    } catch { /* try next */ }
  }
  return [];
}

function writeStore(splits: ClubSplit[]): void {
  const json = JSON.stringify(splits, null, 2);
  fs.writeFileSync(TMP_FILE, json);
  try { fs.writeFileSync(SEED_FILE, json); } catch { /* read-only on some deployments */ }
}

export function getAllSplits(): ClubSplit[] {
  return readStore();
}

export function getSplitForClub(slug: string): ClubSplit | undefined {
  return readStore().find((s) => s.clubSlug === slug);
}

export function upsertSplit(clubSlug: string, recipients: SplitRecipient[]): ClubSplit {
  const total = recipients.reduce((s, r) => s + r.pct, 0);
  if (Math.round(total) !== 100) throw new Error("Recipient percentages must add up to 100");
  const splits = readStore();
  const entry: ClubSplit = { clubSlug, recipients };
  const idx = splits.findIndex((s) => s.clubSlug === clubSlug);
  if (idx >= 0) splits[idx] = entry; else splits.push(entry);
  writeStore(splits);
  return entry;
}
