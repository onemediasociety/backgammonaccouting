"use client";

import { useSearchParams, usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activePeriod = (searchParams.get("period") as Period) ?? "week";
  const customFrom = searchParams.get("from") ?? "";
  const customTo = searchParams.get("to") ?? "";

  const navigate = useCallback(
    (params: Record<string, string>) => {
      const next = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([k, v]) => {
        if (v) next.set(k, v);
        else next.delete(k);
      });
      window.location.href = `${pathname}?${next.toString()}`;
    },
    [pathname, searchParams]
  );

  function selectPreset(period: Period) {
    if (period === "custom") {
      navigate({ period: "custom", from: customFrom, to: customTo });
    } else {
      navigate({ period, from: "", to: "" });
    }
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      {PRESETS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => selectPreset(key)}
          className={`bs-period-pill${activePeriod === key ? " active" : ""}`}
        >
          {label}
        </button>
      ))}

      {activePeriod === "custom" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, width: "100%" }}>
          <input
            type="date"
            value={customFrom}
            onChange={(e) =>
              navigate({ period: "custom", from: e.target.value, to: customTo })
            }
            style={{
              borderRadius: 8, border: "1px solid var(--rule)", padding: "5px 10px",
              fontSize: 12, fontFamily: "var(--font-dm-mono, monospace)",
              background: "var(--paper-2)", color: "var(--ink)",
              outline: "none",
            }}
          />
          <span style={{ fontSize: 11, color: "var(--ink-3)" }}>to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) =>
              navigate({ period: "custom", from: customFrom, to: e.target.value })
            }
            style={{
              borderRadius: 8, border: "1px solid var(--rule)", padding: "5px 10px",
              fontSize: 12, fontFamily: "var(--font-dm-mono, monospace)",
              background: "var(--paper-2)", color: "var(--ink)",
              outline: "none",
            }}
          />
        </div>
      )}
    </div>
  );
}
