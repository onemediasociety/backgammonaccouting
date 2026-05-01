import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
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

  // Try to read cash blob directly
  const cashUrl = getBlobUrl("data/cash-buyins.json");
  if (cashUrl) {
    try {
      const res = await fetch(cashUrl, { cache: "no-store" });
      result.cashBlobStatus = res.status;
      if (res.ok) {
        const data = await res.json();
        result.cashEntryCount = Array.isArray(data) ? data.length : "not an array";
        result.cashFirstEntry = Array.isArray(data) ? data[0] : null;
      }
    } catch (err) {
      result.cashFetchError = String(err);
    }

    // Test write
    try {
      await put("data/cash-buyins.json", JSON.stringify([{ _test: true, ts: Date.now() }]), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      result.testWriteOk = true;

      // Read back immediately
      const res2 = await fetch(cashUrl, { cache: "no-store" });
      result.testReadBackStatus = res2.status;
      result.testReadBackOk = res2.ok;
    } catch (err) {
      result.testWriteError = String(err);
    }
  }

  return NextResponse.json(result);
}
