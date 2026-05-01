import { NextResponse } from "next/server";
import { list } from "@vercel/blob";
import { requireSuperAdminApi } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
  const result: Record<string, unknown> = { hasBlobToken };

  if (hasBlobToken) {
    try {
      const cashBlobs = await list({ prefix: "cash-entries/", limit: 100 });
      result.cashEntryCount = cashBlobs.blobs.length;
      result.cashEntries = cashBlobs.blobs.map((b) => ({ url: b.url, pathname: b.pathname, size: b.size }));
    } catch (err) {
      result.cashBlobError = String(err);
    }
    try {
      const expenseBlobs = await list({ prefix: "expense-entries/", limit: 100 });
      result.expenseEntryCount = expenseBlobs.blobs.length;
    } catch (err) {
      result.expenseBlobError = String(err);
    }
  }

  return NextResponse.json(result);
}
