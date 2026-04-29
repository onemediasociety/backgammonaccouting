"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import type { Period } from "@/lib/date-range";

export type { Period } from "@/lib/date-range";
export { parseDateRange, getDateRange } from "@/lib/date-range";

const PRESETS: { key: Period; label: string }[] = [
  { key: "week", label: "This Week" },
  { key: "lastweek", label: "Last Week" },
  { key: "month", label: "This Month" },
  { key: "lastmonth", label: "Last Month" },
  { key: "3months", label: "Last 3 Months" },
  { key: "ytd", label: "YTD" },
  { key: "all", label: "All Time" },
  { key: "custom", label: "Custom" },
];

export default function DateFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activePeriod = (searchParams.get("period") as Period) ?? "all";
  const customFrom = searchParams.get("from") ?? "";
  const customTo = searchParams.get("to") ?? "";

  const setParams = useCallback(
    (params: Record<string, string>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([k, v]) => {
        if (v) next.set(k, v);
        else next.delete(k);
      });
      router.push(`${pathname}?${next.toString()}`);
    },
    [router, pathname, searchParams]
  );

  function selectPreset(period: Period) {
    if (period === "custom") {
      setParams({ period: "custom", from: customFrom, to: customTo });
    } else {
      setParams({ period, from: "", to: "" });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => selectPreset(key)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activePeriod === key
              ? "bg-brand-500 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {label}
        </button>
      ))}

      {activePeriod === "custom" && (
        <div className="flex items-center gap-2 mt-1 w-full sm:w-auto sm:mt-0">
          <input
            type="date"
            value={customFrom}
            onChange={(e) =>
              setParams({ period: "custom", from: e.target.value, to: customTo })
            }
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) =>
              setParams({ period: "custom", from: customFrom, to: e.target.value })
            }
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      )}
    </div>
  );
}
