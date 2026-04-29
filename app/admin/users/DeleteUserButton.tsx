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
      className="text-xs text-red-400 hover:text-red-600"
    >
      Delete
    </button>
  );
}
