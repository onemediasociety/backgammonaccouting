"use client";

import { useRouter } from "next/navigation";

export default function DeleteUserButton({ id, username }: { id: string; username: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else alert("Failed to delete user.");
  }

  return (
    <button
      onClick={handleDelete}
      style={{
        fontSize: 11, fontFamily: "var(--font-dm-mono, monospace)",
        color: "var(--burgundy)", background: "none", border: "1px solid rgba(139,26,26,0.2)",
        borderRadius: 6, padding: "3px 8px", cursor: "pointer",
      }}
    >
      Delete
    </button>
  );
}
