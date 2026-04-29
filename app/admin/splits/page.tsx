"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CLUBS } from "@/lib/clubs";
import type { ClubSplit } from "@/lib/splits-store";

interface SplitRow {
  clubSlug: string;
  ownerPct: number;
  adminPct: number;
  saving: boolean;
  saved: boolean;
  error: string;
}

export default function SplitsPage() {
  const [rows, setRows] = useState<SplitRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/splits")
      .then((r) => r.json())
      .then((splits: ClubSplit[]) => {
        const splitMap = Object.fromEntries(splits.map((s) => [s.clubSlug, s]));
        setRows(
          CLUBS.map((club) => ({
            clubSlug: club.slug,
            ownerPct: splitMap[club.slug]?.ownerPct ?? 100,
            adminPct: splitMap[club.slug]?.adminPct ?? 0,
            saving: false,
            saved: false,
            error: "",
          }))
        );
      })
      .finally(() => setLoading(false));
  }, []);

  function updateRow(slug: string, field: "ownerPct" | "adminPct", value: number) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.clubSlug !== slug) return r;
        if (field === "ownerPct") {
          return { ...r, ownerPct: value, adminPct: 100 - value, saved: false, error: "" };
        }
        return { ...r, adminPct: value, ownerPct: 100 - value, saved: false, error: "" };
      })
    );
  }

  async function saveRow(slug: string) {
    const row = rows.find((r) => r.clubSlug === slug);
    if (!row) return;

    setRows((prev) =>
      prev.map((r) => (r.clubSlug === slug ? { ...r, saving: true, error: "" } : r))
    );

    const res = await fetch("/api/admin/splits", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clubSlug: slug,
        ownerPct: row.ownerPct,
        adminPct: row.adminPct,
      }),
    });

    const data = await res.json();
    setRows((prev) =>
      prev.map((r) =>
        r.clubSlug === slug
          ? {
              ...r,
              saving: false,
              saved: res.ok,
              error: res.ok ? "" : (data.error ?? "Failed to save"),
            }
          : r
      )
    );
  }

  if (loading) {
    return <div className="text-gray-400 text-sm p-8">Loading…</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-900">Dashboard</Link>
        <span>/</span>
        <Link href="/admin/users" className="hover:text-gray-900">Admin</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Revenue Splits</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Revenue Splits</h1>
        <p className="text-gray-500 mt-1">
          Configure how each club&apos;s revenue is shared between the global owner and the club admin.
          Percentages must add up to 100.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Club
              </th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Global Owner %
              </th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Club Admin %
              </th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Sum
              </th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const club = CLUBS.find((c) => c.slug === row.clubSlug);
              const sum = row.ownerPct + row.adminPct;
              const valid = sum === 100;
              return (
                <tr key={row.clubSlug} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{club?.flag}</span>
                      <div>
                        <div className="font-medium text-gray-800">{club?.name}</div>
                        <div className="text-xs text-gray-400">{club?.city}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={row.ownerPct}
                        onChange={(e) =>
                          updateRow(row.clubSlug, "ownerPct", Number(e.target.value))
                        }
                        className="w-20 text-center rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-gray-400">%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={row.adminPct}
                        onChange={(e) =>
                          updateRow(row.clubSlug, "adminPct", Number(e.target.value))
                        }
                        className="w-20 text-center rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-gray-400">%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        valid
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {sum}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {row.error && (
                        <span className="text-xs text-red-500">{row.error}</span>
                      )}
                      {row.saved && (
                        <span className="text-xs text-green-600">Saved ✓</span>
                      )}
                      <button
                        onClick={() => saveRow(row.clubSlug)}
                        disabled={!valid || row.saving}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
                      >
                        {row.saving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
