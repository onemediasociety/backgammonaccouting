import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { put, list, del } from "@vercel/blob";
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
  paidBy?: string;
  receiptUrl?: string;
  createdAt: string;
}

const BLOB_PREFIX = "expense-entries/";
const TMP_FILE = "/tmp/expenses.json";
const SEED_FILE = path.join(process.cwd(), "data", "expenses.json");

function hasBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

async function blobReadAll(): Promise<Expense[]> {
  try {
    const { blobs } = await list({ prefix: BLOB_PREFIX, limit: 1000 });
    if (blobs.length === 0) return [];
    const results = await Promise.all(
      blobs.map(async (b) => {
        try {
          const res = await fetch(b.url, { cache: "no-store" });
          return res.ok ? (await res.json() as Expense) : null;
        } catch {
          return null;
        }
      })
    );
    return results.filter((e): e is Expense => e !== null);
  } catch (err) {
    console.error("[expenses-store] blobReadAll error:", err);
    return [];
  }
}

async function blobWriteEntry(expense: Expense): Promise<void> {
  await put(`${BLOB_PREFIX}${expense.id}.json`, JSON.stringify(expense), {
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

function fileReadAll(): Expense[] {
  for (const file of [TMP_FILE, SEED_FILE]) {
    try {
      if (fs.existsSync(file)) {
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as Expense[];
      }
    } catch { /* try next */ }
  }
  return [];
}

function fileWriteAll(entries: Expense[]): void {
  const json = JSON.stringify(entries, null, 2);
  fs.writeFileSync(TMP_FILE, json);
  try { fs.writeFileSync(SEED_FILE, json); } catch { /* read-only on Vercel */ }
}

function filterByDate(entries: Expense[], from?: string, to?: string): Expense[] {
  return entries.filter((e) => {
    if (from && e.date < from) return false;
    if (to && e.date > to) return false;
    return true;
  });
}

export async function getAllExpenses(from?: string, to?: string): Promise<Expense[]> {
  const all = hasBlob() ? await blobReadAll() : fileReadAll();
  return filterByDate(all, from, to);
}

export async function getExpensesForClub(slug: string, from?: string, to?: string): Promise<Expense[]> {
  const all = hasBlob() ? await blobReadAll() : fileReadAll();
  return filterByDate(all.filter((e) => e.clubSlug === slug), from, to);
}

export async function addExpense(data: Omit<Expense, "id" | "createdAt">): Promise<Expense> {
  const expense: Expense = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  if (hasBlob()) {
    await blobWriteEntry(expense);
  } else {
    const all = fileReadAll();
    all.push(expense);
    fileWriteAll(all);
  }
  return expense;
}

export async function deleteExpense(id: string): Promise<boolean> {
  if (hasBlob()) {
    return blobDeleteEntry(id);
  }
  const all = fileReadAll();
  const next = all.filter((e) => e.id !== id);
  if (next.length === all.length) return false;
  fileWriteAll(next);
  return true;
}

export async function getExpenseTotalsPerClub(from?: string, to?: string): Promise<Record<string, number>> {
  const totals: Record<string, number> = {};
  for (const e of await getAllExpenses(from, to)) {
    totals[e.clubSlug] = (totals[e.clubSlug] ?? 0) + e.amountCents;
  }
  return totals;
}
