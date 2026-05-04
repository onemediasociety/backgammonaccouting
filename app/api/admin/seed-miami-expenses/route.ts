import { NextResponse } from "next/server";
import { addExpense } from "@/lib/expenses-store";

export const dynamic = "force-dynamic";

const EXPENSES = [
  // 22/4/2026 – Queen
  { date: "2026-04-22", category: "Marketing" as const, description: "Ads", amountCents: 5000, notes: "Queen" },
  { date: "2026-04-22", category: "Marketing" as const, description: "Marketing – Leehe", amountCents: 30000, notes: "Queen" },
  { date: "2026-04-22", category: "Other" as const, description: "Trademark fees", amountCents: 165000, notes: "Queen" },

  // 29/4/2026 – Joia Beach
  { date: "2026-04-29", category: "Marketing" as const, description: "Ads", amountCents: 5000, notes: "Joia Beach" },
  { date: "2026-04-29", category: "Marketing" as const, description: "Marketing – Leehe", amountCents: 10000, notes: "Joia Beach" },
  { date: "2026-04-29", category: "Staff" as const, description: "Jordan Benisti management", amountCents: 25000, notes: "Joia Beach" },

  // 6/5/2026 – The Moon
  { date: "2026-05-06", category: "Marketing" as const, description: "Ads", amountCents: 5000, notes: "The Moon" },
  { date: "2026-05-06", category: "Marketing" as const, description: "Marketing – Leehe", amountCents: 10000, notes: "The Moon" },
  { date: "2026-05-06", category: "Staff" as const, description: "Jordan Benisti management", amountCents: 25000, notes: "The Moon" },

  // 13/5/2026 – Ava Coconut Grove
  { date: "2026-05-13", category: "Marketing" as const, description: "Ads", amountCents: 5000, notes: "Ava Coconut Grove" },
  { date: "2026-05-13", category: "Marketing" as const, description: "Marketing – Leehe", amountCents: 10000, notes: "Ava Coconut Grove" },

  // 20/5/2026 – Soho Beach House
  { date: "2026-05-20", category: "Marketing" as const, description: "Ads", amountCents: 5000, notes: "Soho Beach House" },
  { date: "2026-05-20", category: "Marketing" as const, description: "Marketing – Leehe", amountCents: 10000, notes: "Soho Beach House" },

  // 27/5/2026 – Jajaja
  { date: "2026-05-27", category: "Marketing" as const, description: "Ads", amountCents: 5000, notes: "Jajaja" },
  { date: "2026-05-27", category: "Marketing" as const, description: "Marketing – Leehe", amountCents: 10000, notes: "Jajaja" },

  // 20/5/2026 – Soho House
  { date: "2026-05-20", category: "Marketing" as const, description: "Ads", amountCents: 5000, notes: "Soho House" },
  { date: "2026-05-20", category: "Marketing" as const, description: "Marketing – Leehe", amountCents: 10000, notes: "Soho House" },
];

export async function GET() {

  const added: string[] = [];
  for (const e of EXPENSES) {
    await addExpense({ clubSlug: "miami", currency: "usd", receiptUrl: undefined, ...e });
    added.push(`${e.date} | ${e.description} | ${e.notes} | $${(e.amountCents / 100).toFixed(2)}`);
  }

  return NextResponse.json({ added: added.length, entries: added });
}
