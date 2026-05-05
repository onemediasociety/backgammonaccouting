import fs from "fs";
import path from "path";
import { put, head } from "@vercel/blob";
import { unstable_cache, revalidateTag } from "next/cache";

export interface VenueMapping {
  keyword: string;  // uppercase, matched as substring of description
  clubSlug: string;
}

const BLOB_KEY = "venues/mappings.json";
const SEED_FILE = path.join(process.cwd(), "data", "venues.json");

function hasBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// ── Seed data (always present as fallback) ────────────────────────────────────

function readSeed(): VenueMapping[] {
  try {
    if (fs.existsSync(SEED_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));
      if (Array.isArray(parsed)) return parsed as VenueMapping[];
    }
  } catch { /* ignore */ }
  return [];
}

// ── Blob helpers ──────────────────────────────────────────────────────────────

async function blobRead(): Promise<VenueMapping[]> {
  try {
    const info = await head(BLOB_KEY);
    const res = await fetch(info.url, { cache: "no-store" });
    if (!res.ok) return readSeed();
    const data = await res.json();
    return Array.isArray(data) ? (data as VenueMapping[]) : readSeed();
  } catch {
    return readSeed();
  }
}

async function blobWrite(venues: VenueMapping[]): Promise<void> {
  await put(BLOB_KEY, JSON.stringify(venues), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

// ── Cached read ───────────────────────────────────────────────────────────────

const getCachedVenues = unstable_cache(blobRead, ["venues-blob"], {
  revalidate: 60,
  tags: ["venues"],
});

// ── Public API ────────────────────────────────────────────────────────────────

export async function getVenueMappings(): Promise<VenueMapping[]> {
  if (!hasBlob()) return readSeed();
  return getCachedVenues();
}

export async function createVenueMapping(keyword: string, clubSlug: string): Promise<VenueMapping> {
  const venues = hasBlob() ? await blobRead() : readSeed();
  const clean = keyword.trim().toUpperCase();
  if (venues.some((v) => v.keyword === clean && v.clubSlug === clubSlug)) {
    throw new Error(`Venue keyword "${clean}" already mapped to ${clubSlug}`);
  }
  const entry: VenueMapping = { keyword: clean, clubSlug };
  const next = [...venues, entry];
  if (hasBlob()) {
    await blobWrite(next);
    revalidateTag("venues", { expire: 0 } as Parameters<typeof revalidateTag>[1]);
  }
  return entry;
}

export async function deleteVenueMapping(keyword: string, clubSlug: string): Promise<boolean> {
  const venues = hasBlob() ? await blobRead() : readSeed();
  const next = venues.filter((v) => !(v.keyword === keyword.toUpperCase() && v.clubSlug === clubSlug));
  if (next.length === venues.length) return false;
  if (hasBlob()) {
    await blobWrite(next);
    revalidateTag("venues", { expire: 0 } as Parameters<typeof revalidateTag>[1]);
  }
  return true;
}
