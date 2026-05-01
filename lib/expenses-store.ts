import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { put } from "@vercel/blob";
import type { ExpenseCategory } from "./expense-categories";

export type { ExpenseCategory } from "./expense-categories";
export { EXPENSE_CATEGORIES } from "./expense-categories";

export interface Expense {
  id: string;
  clubSlug: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amountCents: number;
  currency: string;
  notes: string;
  receiptUrl?: string;
  createdAt: string;
}

const BLOB_PATH = "data/expenses.json";
const TMP_FILE = "/tmp/expenses.json";
const SEED_FILE = path.join(process.cwd(), "data", "expenses.json");

function getBlobUrl(): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  const storeId = token.split("_")[3];
  if (!storeId) return null;
  return `https://${storeId}.public.blob.vercel-storage.com/${BLOB_PATH}`;
}

async function readStore(): Promise<Expense[]> {
  const blobUrl = getBlobUrl();
  if (blobUrl) {
    try {
      const res = await fetch(blobUrl, { cache: "no-store" });
      if (res.status === 404) return [];
      if (!res.ok) { console.error("[expenses-store] blob fetch failed:", res.status, blobUrl); return []; }
      const data = await res.json();
      return Array.isArray(data) ? (data as Expense[]) : [];
    } catch (err) {
      console.error("[expenses-store] readStore error:", err);
      return [];
    }
  }
  for (const file of [TMP_FILE, SEED_FILE]) {
    try {
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as Expense[];
      }
    } catch {
      // try next
    }
  }
  return [];
}

async function writeStore(entries: Expense[]): Promise<void> {
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
      console.error("[expenses-store] writeStore error:", err);
      throw err;
    }
    return;
  }
  fs.writeFileSync(TMP_FILE, json);
  try { fs.writeFileSync(SEED_FILE, json); } catch { /* read-only on some deployments */ }
}

function filterByDate(entries: Expense[], from?: string, to?: string): Expense[] {
  return entries.filter((e) => {
    if (from && e.date < from) return false;
    if (to && e.date > to) return false;
    return true;
  });
}

export async function getAllExpenses(from?: string, to?: string): Promise<Expense[]> {
  return filterByDate(await readStore(), from, to);
}

export async function getExpensesForClub(slug: string, from?: string, to?: string): Promise<Expense[]> {
  return filterByDate((await readStore()).filter((e) => e.clubSlug === slug), from, to);
}

export async function addExpense(data: Omit<Expense, "id" | "createdAt">): Promise<Expense> {
  const entries = await readStore();
  const expense: Expense = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  entries.push(expense);
  await writeStore(entries);
  return expense;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const entries = await readStore();
  const next = entries.filter((e) => e.id !== id);
  if (next.length === entries.length) return false;
  await writeStore(next);
  return true;
}

export async function getExpenseTotalsPerClub(from?: string, to?: string): Promise<Record<string, number>> {
  const totals: Record<string, number> = {};
  for (const e of await getAllExpenses(from, to)) {
    totals[e.clubSlug] = (totals[e.clubSlug] ?? 0) + e.amountCents;
  }
  return totals;
}
