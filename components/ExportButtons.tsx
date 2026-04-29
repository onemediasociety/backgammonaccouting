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
  function buildCSVUrl() {
    const p = new URLSearchParams({ club: clubSlug });
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return `/api/export?${p.toString()}`;
  }

  function openPrint() {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const qs = p.toString();
    window.open(`/clubs/${clubSlug}/print${qs ? `?${qs}` : ""}`, "_blank");
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <a
        href={buildCSVUrl()}
        download
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        ↓ CSV
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
