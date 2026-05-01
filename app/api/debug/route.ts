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
      const cashBlobs = await list({ prefix: "data/cash-buyins.json", limit: 5 });
      result.cashBlobs = cashBlobs.blobs.map((b) => ({ url: b.url, pathname: b.pathname, size: b.size, uploadedAt: b.uploadedAt }));
    } catch (err) {
      result.cashBlobError = String(err);
    }
    try {
      const expenseBlobs = await list({ prefix: "data/expenses.json", limit: 5 });
      result.expenseBlobs = expenseBlobs.blobs.map((b) => ({ url: b.url, pathname: b.pathname, size: b.size }));
    } catch (err) {
      result.expenseBlobError = String(err);
    }
  }

  return NextResponse.json(result);
}
