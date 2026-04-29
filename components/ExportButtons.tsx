"use client";

import { type Period } from "@/components/DateFilter";

interface Props {
  clubSlug?: string;
  clubName?: string;
  currency?: string;
  from: string | null;
  to: string | null;
  period: Period;
  mode?: "club" | "overview" | "pnl";
}

const btnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 8,
  border: "1px solid var(--rule)", background: "var(--paper)",
  color: "var(--ink-2)", cursor: "pointer", textDecoration: "none",
  fontFamily: "var(--font-dm-mono, monospace)", fontSize: 11,
  fontWeight: 500, letterSpacing: "0.05em",
  transition: "background 120ms",
  whiteSpace: "nowrap" as const,
};

function hover(e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, enter: boolean) {
  (e.currentTarget as HTMLElement).style.background = enter ? "var(--paper-2)" : "var(--paper)";
}

export default function ExportButtons({ clubSlug, from, to, mode = "club" }: Props) {
  function qs(extra: Record<string, string> = {}) {
    const p = new URLSearchParams(extra);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const s = p.toString();
    return s ? `?${s}` : "";
  }

  if (mode === "overview") {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <a href={`/api/export/overview${qs()}`} download style={btnStyle}
          onMouseEnter={(e) => hover(e, true)} onMouseLeave={(e) => hover(e, false)}>
          ↓ All Clubs CSV
        </a>
        <a href={`/api/export/qbo${qs({ format: "quickbooks" })}`} download style={btnStyle}
          onMouseEnter={(e) => hover(e, true)} onMouseLeave={(e) => hover(e, false)}>
          ↓ QuickBooks
        </a>
        <a href={`/api/export/qbo${qs({ format: "xero" })}`} download style={btnStyle}
          onMouseEnter={(e) => hover(e, true)} onMouseLeave={(e) => hover(e, false)}>
          ↓ Xero
        </a>
      </div>
    );
  }

  if (mode === "pnl") {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <a href={`/api/export/pnl${qs()}`} download style={btnStyle}
          onMouseEnter={(e) => hover(e, true)} onMouseLeave={(e) => hover(e, false)}>
          ↓ Download P&amp;L (CSV)
        </a>
        <a href={`/api/export/qbo${qs({ format: "quickbooks" })}`} download style={btnStyle}
          onMouseEnter={(e) => hover(e, true)} onMouseLeave={(e) => hover(e, false)}>
          ↓ QuickBooks
        </a>
        <a href={`/api/export/qbo${qs({ format: "xero" })}`} download style={btnStyle}
          onMouseEnter={(e) => hover(e, true)} onMouseLeave={(e) => hover(e, false)}>
          ↓ Xero
        </a>
      </div>
    );
  }

  // mode === "club"
  if (!clubSlug) return null;

  function openPrint() {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const s = p.toString();
    window.open(`/clubs/${clubSlug}/print${s ? `?${s}` : ""}`, "_blank");
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <a href={`/api/export${qs({ club: clubSlug })}`} download style={btnStyle}
        onMouseEnter={(e) => hover(e, true)} onMouseLeave={(e) => hover(e, false)}>
        ↓ CSV
      </a>
      <a href={`/api/export/qbo${qs({ club: clubSlug, format: "quickbooks" })}`} download style={btnStyle}
        onMouseEnter={(e) => hover(e, true)} onMouseLeave={(e) => hover(e, false)}>
        ↓ QuickBooks
      </a>
      <a href={`/api/export/qbo${qs({ club: clubSlug, format: "xero" })}`} download style={btnStyle}
        onMouseEnter={(e) => hover(e, true)} onMouseLeave={(e) => hover(e, false)}>
        ↓ Xero
      </a>
      <button onClick={openPrint} style={btnStyle}
        onMouseEnter={(e) => hover(e, true)} onMouseLeave={(e) => hover(e, false)}>
        🖨 Print / PDF
      </button>
    </div>
  );
}
