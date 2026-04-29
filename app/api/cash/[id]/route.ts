import { NextRequest, NextResponse } from "next/server";
import { deleteCashEntry } from "@/lib/cash-store";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const deleted = deleteCashEntry(params.id);
  if (!deleted) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
