import { NextRequest, NextResponse } from "next/server";
import { addExpense, getAllExpenses } from "@/lib/expenses-store";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const from = sp.get("from") ?? undefined;
  const to = sp.get("to") ?? undefined;
  return NextResponse.json(getAllExpenses(from, to));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { clubSlug, date, category, description, amountCents, currency, notes } = body;

  if (!clubSlug || !date || !category || !description || amountCents == null || !currency) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const expense = addExpense({ clubSlug, date, category, description, amountCents, currency, notes: notes ?? "" });
  return NextResponse.json(expense, { status: 201 });
}
