import { NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

function getBlobUrl(blobPath: string): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  const storeId = token.split("_")[3];
  if (!storeId) return null;
  return `https://${storeId}.public.blob.vercel-storage.com/${blobPath}`;
}

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (auth instanceof NextResponse) return auth;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const storeId = token?.split("_")[3] ?? null;
  const result: Record<string, unknown> = {
    hasBlobToken: !!token,
    storeId,
    cashBlobUrl: getBlobUrl("data/cash-buyins.json"),
    expenseBlobUrl: getBlobUrl("data/expenses.json"),
  };

  // Read cash blob — report what's there, no test write
  const cashUrl = getBlobUrl("data/cash-buyins.json");
  if (cashUrl) {
    try {
      const res = await fetch(cashUrl, { cache: "no-store" });
      result.cashBlobStatus = res.status;
      if (res.ok) {
        const data = await res.json();
        result.cashEntryCount = Array.isArray(data) ? data.length : "not an array";
        result.cashEntries = Array.isArray(data) ? data : null;
      }
    } catch (err) {
      result.cashFetchError = String(err);
    }
  }

  return NextResponse.json(result, null, 2);
}
