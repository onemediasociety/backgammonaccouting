import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { put, head } from "@vercel/blob";
import { unstable_cache, revalidateTag } from "next/cache";
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

const BLOB_KEY = "expenses/all.json";
const SEED_FILE = path.join(process.cwd(), "data", "expenses.json");

function hasBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

function readSeed(): Expense[] {
  try {
    if (fs.existsSync(SEED_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));
      if (Array.isArray(parsed)) return parsed as Expense[];
    }
  } catch { /* ignore */ }
  return [];
}

async function blobRead(): Promise<Expense[]> {
  try {
    const info = await head(BLOB_KEY);
    const res = await fetch(info.url, { cache: "no-store" });
    if (!res.ok) return readSeed();
    const data = await res.json();
    return Array.isArray(data) ? (data as Expense[]) : readSeed();
  } catch {
    return readSeed();
  }
}

async function blobWrite(expenses: Expense[]): Promise<void> {
  await put(BLOB_KEY, JSON.stringify(expenses), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  revalidateTag("expenses", { expire: 0 } as Parameters<typeof revalidateTag>[1]);
}

const getCachedExpenses = unstable_cache(blobRead, ["expenses-blob"], {
  revalidate: 60,
  tags: ["expenses"],
});

function filterByDate(entries: Expense[], from?: string, to?: string): Expense[] {
  return entries.filter((e) => {
    if (from && e.date < from) return false;
    if (to && e.date > to) return false;
    return true;
  });
}

async function readStore(): Promise<Expense[]> {
  if (!hasBlob()) return readSeed();
  return getCachedExpenses();
}

export async function getAllExpenses(from?: string, to?: string): Promise<Expense[]> {
  return filterByDate(await readStore(), from, to);
}

export async function getExpensesForClub(slug: string, from?: string, to?: string): Promise<Expense[]> {
  const all = await readStore();
  return filterByDate(all.filter((e) => e.clubSlug === slug), from, to);
}

export async function addExpense(data: Omit<Expense, "id" | "createdAt">): Promise<Expense> {
  const expense: Expense = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  const all = hasBlob() ? await blobRead() : readSeed();
  all.push(expense);
  if (hasBlob()) await blobWrite(all);
  return expense;
}

export async function updateExpense(id: string, data: Partial<Omit<Expense, "id" | "createdAt" | "clubSlug">>): Promise<Expense | null> {
  const all = hasBlob() ? await blobRead() : readSeed();
  const idx = all.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  all[idx] = { ...all[idx], ...data };
  if (hasBlob()) await blobWrite(all);
  return all[idx];
}

export async function deleteExpense(id: string): Promise<boolean> {
  const all = hasBlob() ? await blobRead() : readSeed();
  const next = all.filter((e) => e.id !== id);
  if (next.length === all.length) return false;
  if (hasBlob()) await blobWrite(next);
  return true;
}

export async function getExpenseTotalsPerClub(from?: string, to?: string): Promise<Record<string, number>> {
  const totals: Record<string, number> = {};
  for (const e of await getAllExpenses(from, to)) {
    totals[e.clubSlug] = (totals[e.clubSlug] ?? 0) + e.amountCents;
  }
  return totals;
}
