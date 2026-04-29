import fs from "fs";
import path from "path";

export interface DynamicClub {
  slug: string;
  name: string;
  city: string;
  country: string;
  currency: string;
  flag: string;
}

const TMP_FILE = "/tmp/clubs-extra.json";
const SEED_FILE = path.join(process.cwd(), "data", "clubs-extra.json");

function readStore(): DynamicClub[] {
  for (const file of [TMP_FILE, SEED_FILE]) {
    try {
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as DynamicClub[];
      }
    } catch {
      // try next
    }
  }
  return [];
}

function writeStore(clubs: DynamicClub[]): void {
  fs.writeFileSync(TMP_FILE, JSON.stringify(clubs, null, 2));
}

export function getExtraClubs(): DynamicClub[] {
  return readStore();
}

export function createExtraClub(data: DynamicClub): DynamicClub {
  const clubs = readStore();
  if (clubs.some((c) => c.slug === data.slug)) {
    throw new Error(`Club slug "${data.slug}" already exists`);
  }
  clubs.push(data);
  writeStore(clubs);
  return data;
}

export function updateExtraClub(slug: string, data: Partial<Omit<DynamicClub, "slug">>): DynamicClub {
  const clubs = readStore();
  const idx = clubs.findIndex((c) => c.slug === slug);
  if (idx < 0) throw new Error("Club not found");
  clubs[idx] = { ...clubs[idx], ...data };
  writeStore(clubs);
  return clubs[idx];
}

export function deleteExtraClub(slug: string): boolean {
  const clubs = readStore();
  const next = clubs.filter((c) => c.slug !== slug);
  if (next.length === clubs.length) return false;
  writeStore(next);
  return true;
}
