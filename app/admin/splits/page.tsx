"use client";

import Link from "next/link";
import SplitsEditor from "@/components/SplitsEditor";

export default function SplitsPage() {
  return (
    <div style={{ maxWidth: 680 }}>
      <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
        <Link href="/admin" style={{ color: "inherit", textDecoration: "none" }}>Settings</Link>
        {" / "}Revenue Splits
      </p>
      <div style={{ marginBottom: 24 }}>
        <h1 className="bs-heading" style={{ fontSize: 26, marginBottom: 4 }}>Revenue Splits</h1>
        <p style={{ fontSize: 12, color: "var(--ink-3)" }}>
          Configure how each club&apos;s net profit is divided. Names are used on payout statements. Percentages must total 100.
        </p>
      </div>
      <SplitsEditor />
    </div>
  );
}
