"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ApproveButton({ userId, clubSlugs }: { userId: string; clubSlugs: string[] }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function approve() {
    setLoading(true);
    await fetch(`/api/admin/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active", clubSlugs }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={approve}
      disabled={loading}
      style={{
        fontSize: 11, fontFamily: "var(--font-dm-mono, monospace)",
        padding: "3px 10px", borderRadius: 6, border: "none",
        background: "var(--bs-green, #1f4d3a)", color: "#fff",
        cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? "…" : "Approve"}
    </button>
  );
}
