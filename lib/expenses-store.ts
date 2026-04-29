import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
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
  createdAt: string;
}

const TMP_FILE = "/tmp/expenses.json";
const SEED_FILE = path.join(process.cwd(), "data", "expenses.json");

function readStore(): Expense[] {
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

function writeStore(entries: Expense[]): void {
  fs.writeFileSync(TMP_FILE, JSON.stringify(entries, null, 2));
}

function filterByDate(entries: Expense[], from?: string, to?: string): Expense[] {
  return entries.filter((e) => {
    if (from && e.date < from) return false;
    if (to && e.date > to) return false;
    return true;
  });
}

export function getAllExpenses(from?: string, to?: string): Expense[] {
  return filterByDate(readStore(), from, to);
}

export function getExpensesForClub(slug: string, from?: string, to?: string): Expense[] {
  return filterByDate(readStore().filter((e) => e.clubSlug === slug), from, to);
}

export function addExpense(
  data: Omit<Expense, "id" | "createdAt">
): Expense {
  const entries = readStore();
  const expense: Expense = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  entries.push(expense);
  writeStore(entries);
  return expense;
}

export function deleteExpense(id: string): boolean {
  const entries = readStore();
  const next = entries.filter((e) => e.id !== id);
  if (next.length === entries.length) return false;
  writeStore(next);
  return true;
}

export function getExpenseTotalsPerClub(from?: string, to?: string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const e of getAllExpenses(from, to)) {
    totals[e.clubSlug] = (totals[e.clubSlug] ?? 0) + e.amountCents;
  }
  return totals;
}
