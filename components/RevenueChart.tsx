import { formatAmount } from "@/lib/clubs";

interface MonthBar {
  label: string;
  stripe: number;
  cash: number;
}

interface Props {
  months: MonthBar[];
  currency: string;
}

const BAR_H = 140;
const BAR_W = 36;
const GAP = 18;
const LABEL_H = 22;
const SVG_H = BAR_H + LABEL_H + 12;

export default function RevenueChart({ months, currency }: Props) {
  if (months.length === 0) return null;

  const maxVal = Math.max(...months.map((m) => m.stripe + m.cash), 1);
  const totalW = months.length * (BAR_W + GAP) - GAP;

  return (
    <div className="bs-card" style={{ padding: "20px 24px", marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <p className="bs-label">Monthly Revenue · Last 6 Months</p>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--brass)" }} />
            <span className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Stripe</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--bs-green, #1f4d3a)" }} />
            <span className="bs-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>Cash</span>
          </div>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <svg
          width={totalW}
          height={SVG_H}
          style={{ display: "block", minWidth: "100%" }}
          aria-label="Monthly revenue bar chart"
        >
          {months.map((m, i) => {
            const x = i * (BAR_W + GAP);
            const total = m.stripe + m.cash;
            const totalH = Math.round((total / maxVal) * BAR_H);
            const stripeH = Math.round((m.stripe / maxVal) * BAR_H);
            const cashH = totalH - stripeH;

            return (
              <g key={m.label} transform={`translate(${x}, 0)`}>
                {/* Cash portion (top) */}
                {cashH > 0 && (
                  <rect
                    x={0}
                    y={BAR_H - totalH}
                    width={BAR_W}
                    height={cashH}
                    rx={totalH > 4 ? 3 : 0}
                    fill="#1f4d3a"
                    fillOpacity={0.75}
                  />
                )}
                {/* Stripe portion (bottom) */}
                {stripeH > 0 && (
                  <rect
                    x={0}
                    y={BAR_H - stripeH}
                    width={BAR_W}
                    height={stripeH}
                    rx={stripeH > 4 ? 3 : 0}
                    fill="#b89042"
                    fillOpacity={0.85}
                  />
                )}
                {/* Empty placeholder */}
                {total === 0 && (
                  <rect x={0} y={BAR_H - 2} width={BAR_W} height={2} rx={1} fill="var(--rule)" />
                )}
                {/* Amount label above */}
                {total > 0 && (
                  <text
                    x={BAR_W / 2}
                    y={BAR_H - totalH - 5}
                    textAnchor="middle"
                    fontSize={9}
                    fontFamily="var(--font-dm-mono, monospace)"
                    fill="var(--ink-3)"
                  >
                    {formatAmount(total, currency)}
                  </text>
                )}
                {/* Month label */}
                <text
                  x={BAR_W / 2}
                  y={BAR_H + LABEL_H}
                  textAnchor="middle"
                  fontSize={11}
                  fontFamily="var(--font-dm-mono, monospace)"
                  fill="var(--ink-3)"
                >
                  {m.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
