import fs from "fs";
import path from "path";

export interface VenueMapping {
  keyword: string;  // uppercase, matched as substring of description
  clubSlug: string;
}

const TMP_FILE = "/tmp/venues.json";
const SEED_FILE = path.join(process.cwd(), "data", "venues.json");

function readStore(): VenueMapping[] {
  for (const file of [TMP_FILE, SEED_FILE]) {
    try {
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as VenueMapping[];
      }
    } catch {
      // try next
    }
  }
  return [];
}

function writeStore(venues: VenueMapping[]): void {
  const json = JSON.stringify(venues, null, 2);
  fs.writeFileSync(TMP_FILE, json);
  try { fs.writeFileSync(SEED_FILE, json); } catch { /* read-only on some deployments */ }
}

export function getVenueMappings(): VenueMapping[] {
  return readStore();
}

export function createVenueMapping(keyword: string, clubSlug: string): VenueMapping {
  const venues = readStore();
  const clean = keyword.trim().toUpperCase();
  if (venues.some((v) => v.keyword === clean && v.clubSlug === clubSlug)) {
    throw new Error(`Venue keyword "${clean}" already mapped to ${clubSlug}`);
  }
  const entry: VenueMapping = { keyword: clean, clubSlug };
  venues.push(entry);
  writeStore(venues);
  return entry;
}

export function deleteVenueMapping(keyword: string, clubSlug: string): boolean {
  const venues = readStore();
  const next = venues.filter((v) => !(v.keyword === keyword.toUpperCase() && v.clubSlug === clubSlug));
  if (next.length === venues.length) return false;
  writeStore(next);
  return true;
}
