"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CLUBS } from "@/lib/clubs";

export default function NewUserPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    password: "",
    clubSlugs: [] as string[],
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function toggleClub(slug: string) {
    setForm((prev) => ({
      ...prev,
      clubSlugs: prev.clubSlugs.includes(slug)
        ? prev.clubSlugs.filter((s) => s !== slug)
        : [...prev.clubSlugs, slug],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.clubSlugs.length === 0) {
      setError("Assign at least one club.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create user.");
        return;
      }
      router.push("/admin/users");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-900">Dashboard</Link>
        <span>/</span>
        <Link href="/admin/users" className="hover:text-gray-900">Admin</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">New User</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Club Admin</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <Field label="Username">
          <input
            type="text"
            required
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            className={inputCls}
            placeholder="alice"
            autoFocus
          />
        </Field>

        <Field label="Password">
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            className={inputCls}
            placeholder="••••••••"
          />
        </Field>

        <Field label="Assigned Clubs">
          <div className="space-y-2 mt-1">
            {CLUBS.map((club) => (
              <label
                key={club.slug}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={form.clubSlugs.includes(club.slug)}
                  onChange={() => toggleClub(club.slug)}
                  className="rounded"
                />
                <span className="text-xl">{club.flag}</span>
                <div>
                  <div className="text-sm font-medium text-gray-800">{club.name}</div>
                  <div className="text-xs text-gray-400">{club.city}</div>
                </div>
              </label>
            ))}
          </div>
        </Field>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create User"}
          </button>
          <Link
            href="/admin/users"
            className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 inline-flex items-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
