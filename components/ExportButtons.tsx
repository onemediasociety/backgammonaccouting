"use client";

import { type Period } from "@/components/DateFilter";

interface Props {
  clubSlug: string;
  clubName: string;
  currency: string;
  from: string | null;
  to: string | null;
  period: Period;
}

export default function ExportButtons({ clubSlug, from, to }: Props) {
  function buildUrl(base: string, extra: Record<string, string> = {}) {
    const p = new URLSearchParams({ ...extra });
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return `${base}?${p.toString()}`;
  }

  function openPrint() {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const qs = p.toString();
    window.open(`/clubs/${clubSlug}/print${qs ? `?${qs}` : ""}`, "_blank");
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <a
        href={buildUrl("/api/export", { club: clubSlug })}
        download
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        ↓ CSV
      </a>
      <a
        href={buildUrl("/api/export/qbo", { club: clubSlug, format: "quickbooks" })}
        download
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        ↓ QuickBooks
      </a>
      <a
        href={buildUrl("/api/export/qbo", { club: clubSlug, format: "xero" })}
        download
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        ↓ Xero
      </a>
      <button
        onClick={openPrint}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        🖨 Print / PDF
      </button>
    </div>
  );
}
