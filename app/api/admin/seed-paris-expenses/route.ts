import { NextResponse } from "next/server";
import { addExpense } from "@/lib/expenses-store";

export const dynamic = "force-dynamic";

// Expenses from Paris accounting spreadsheet
// Stripe fees are excluded — already tracked automatically by the site
const EXPENSES = [
  // 29/4/2026 – Bambou
  { date: "2026-04-29", category: "Marketing" as const,   description: "Ads",         amountCents:  5000, paidBy: "Hugo Partouche", notes: "Bambou" },
  { date: "2026-04-29", category: "Marketing" as const,   description: "Marketing",   amountCents:  8000, paidBy: "Hugo Partouche", notes: "Bambou" },
  { date: "2026-04-29", category: "Venue"     as const,   description: "Terrain",     amountCents: 30000, paidBy: "Tina",           notes: "Bambou" },
  { date: "2026-04-29", category: "Staff"     as const,   description: "Charges AE",  amountCents: 14000, paidBy: "Michael",        notes: "Bambou" },

  // 21/5/2026 – Buddah Bar
  { date: "2026-05-21", category: "Equipment" as const,   description: "Boards",      amountCents: 17400, paidBy: "Michael",        notes: "Buddah Bar" },
  { date: "2026-05-21", category: "Marketing" as const,   description: "Ads",         amountCents:  4000, paidBy: "Hugo Partouche", notes: "Buddah Bar" },
  { date: "2026-05-21", category: "Marketing" as const,   description: "Marketing",   amountCents:  8000, paidBy: "Hugo Partouche", notes: "Buddah Bar" },
  { date: "2026-05-21", category: "Staff"     as const,   description: "Charges AE",  amountCents: 11000, paidBy: "Michael",        notes: "Buddah Bar" },
];

export async function GET() {
  const added: string[] = [];
  for (const e of EXPENSES) {
    await addExpense({ clubSlug: "paris", currency: "eur", receiptUrl: undefined, ...e });
    added.push(`${e.date} | ${e.paidBy} | ${e.description} | ${e.notes} | €${(e.amountCents / 100).toFixed(2)}`);
  }
  return NextResponse.json({ added: added.length, entries: added });
}
