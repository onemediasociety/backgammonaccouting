import { NextRequest, NextResponse } from "next/server";
import { addExpense, getAllExpenses, getExpensesForClub } from "@/lib/expenses-store";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const from = sp.get("from") ?? undefined;
  const to = sp.get("to") ?? undefined;
  const club = sp.get("club") ?? undefined;
  const data = club
    ? await getExpensesForClub(club, from, to)
    : await getAllExpenses(from, to);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { clubSlug, date, category, description, amountCents, currency, notes, paidBy, receiptUrl } = body;

  if (!clubSlug || !date || !category || !description || amountCents == null || !currency) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const expense = await addExpense({ clubSlug, date, category, description, amountCents, currency, notes: notes ?? "", paidBy: paidBy ?? "", receiptUrl });
  return NextResponse.json(expense, { status: 201 });
}
