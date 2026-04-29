import Link from "next/link";
import { type Club, formatAmount } from "@/lib/clubs";

interface Props {
  club: Club;
  stripeTotal: number;
  stripeCount: number;
  stripeFees: number;
  feesAvailable: boolean;
  cashTotal: number;
  hasError: boolean;
  periodQuery?: string;
}

export default function ClubCard({
  club,
  stripeTotal,
  stripeCount,
  stripeFees,
  feesAvailable,
  cashTotal,
  hasError,
  periodQuery = "",
}: Props) {
  const stripeNet = stripeTotal - stripeFees;
  const combined = stripeTotal + cashTotal;
  const href = `/clubs/${club.slug}${periodQuery ? `?${periodQuery}` : ""}`;

  return (
    <Link href={href} className="bs-card-link">
      <div className="bs-card" style={{ padding: "20px", height: "100%", cursor: "pointer" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: 28, lineHeight: 1 }}>{club.flag}</span>
            <h3
              className="bs-heading"
              style={{ fontSize: 17, marginTop: 6, marginBottom: 2, lineHeight: 1.2 }}
            >
              {club.name}
            </h3>
            <p className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.06em" }}>
              {club.city}
            </p>
          </div>
          <span
            className="bs-mono"
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.08em",
              padding: "3px 8px",
              borderRadius: 20,
              background: "var(--paper-2)",
              border: "1px solid var(--rule)",
              color: "var(--ink-3)",
            }}
          >
            {club.currency.toUpperCase()}
          </span>
        </div>

        {/* Rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Row
            label="Stripe gross"
            value={hasError ? "—" : `${formatAmount(stripeTotal, club.currency)}`}
            sub={hasError ? "" : `${stripeCount} txn`}
          />
          <Row
            label="Stripe fees"
            value={
              hasError ? "—" : !feesAvailable ? "—" : `(${formatAmount(stripeFees, club.currency)})`
            }
            negative={feesAvailable && !hasError}
          />
          <Row
            label="Stripe net"
            value={hasError ? "—" : !feesAvailable ? "—" : formatAmount(stripeNet, club.currency)}
          />
          <Row
            label="Cash buy-ins"
            value={formatAmount(cashTotal, club.currency)}
          />
          <div style={{ paddingTop: 10, borderTop: "1px solid var(--rule)", marginTop: 2 }}>
            <Row
              label="Combined total"
              value={hasError ? "—" : formatAmount(combined, club.currency)}
              bold
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

function Row({
  label,
  value,
  sub,
  bold = false,
  negative = false,
}: {
  label: string;
  value: string;
  sub?: string;
  bold?: boolean;
  negative?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        {sub && (
          <span className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{sub}</span>
        )}
        <span
          className="bs-mono"
          style={{
            fontSize: bold ? 14 : 12,
            fontWeight: bold ? 700 : 500,
            color: negative ? "var(--burgundy)" : bold ? "var(--ink)" : "var(--ink-2)",
          }}
        >
          {value}
        </span>
      </span>
    </div>
  );
}
