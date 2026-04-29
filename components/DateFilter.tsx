"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

export type Period =
  | "week"
  | "lastweek"
  | "month"
  | "lastmonth"
  | "3months"
  | "ytd"
  | "all"
  | "custom";

export interface DateRange {
  from: string | null; // YYYY-MM-DD
  to: string | null;   // YYYY-MM-DD
  period: Period;
}

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

export function getDateRange(period: Period, from?: string, to?: string): DateRange {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  function fmt(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  switch (period) {
    case "week": {
      const day = now.getDay(); // 0=Sun
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((day + 6) % 7));
      return { from: fmt(monday), to: today, period };
    }
    case "lastweek": {
      const day = now.getDay();
      const lastMonday = new Date(now);
      lastMonday.setDate(now.getDate() - ((day + 6) % 7) - 7);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      return { from: fmt(lastMonday), to: fmt(lastSunday), period };
    }
    case "month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: fmt(first), to: today, period };
    }
    case "lastmonth": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: fmt(first), to: fmt(last), period };
    }
    case "3months": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return { from: fmt(d), to: today, period };
    }
    case "ytd": {
      return {
        from: `${now.getFullYear()}-01-01`,
        to: today,
        period,
      };
    }
    case "custom":
      return { from: from ?? null, to: to ?? null, period };
    default:
      return { from: null, to: null, period: "all" };
  }
}

export function parseDateRange(searchParams: {
  get: (k: string) => string | null;
}): DateRange {
  const period = (searchParams.get("period") as Period) ?? "all";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  return getDateRange(period, from, to);
}

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
