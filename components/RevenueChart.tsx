import { formatAmount } from "@/lib/clubs";

interface MonthBar {
  label: string;   // "Jan", "Feb", …
  stripe: number;  // cents
  cash: number;    // cents
}

interface Props {
  months: MonthBar[];
  currency: string;
}

const BAR_H = 160;
const BAR_W = 32;
const GAP = 16;
const LABEL_H = 20;
const SVG_H = BAR_H + LABEL_H + 8;

export default function RevenueChart({ months, currency }: Props) {
  if (months.length === 0) return null;

  const maxVal = Math.max(...months.map((m) => m.stripe + m.cash), 1);

  const totalW = months.length * (BAR_W + GAP) - GAP;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
        Monthly Revenue
      </h2>
      <div className="overflow-x-auto">
        <svg
          width={totalW}
          height={SVG_H}
          className="block min-w-full"
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
                {/* Stripe portion (bottom) */}
                {stripeH > 0 && (
                  <rect
                    x={0}
                    y={BAR_H - stripeH}
                    width={BAR_W}
                    height={stripeH}
                    rx={3}
                    fill="#3b82f6"
                  />
                )}
                {/* Cash portion (top of stripe) */}
                {cashH > 0 && (
                  <rect
                    x={0}
                    y={BAR_H - totalH}
                    width={BAR_W}
                    height={cashH}
                    rx={3}
                    fill="#10b981"
                  />
                )}
                {/* Empty bar placeholder */}
                {total === 0 && (
                  <rect
                    x={0}
                    y={BAR_H - 2}
                    width={BAR_W}
                    height={2}
                    rx={1}
                    fill="#e5e7eb"
                  />
                )}
                {/* Total label above bar */}
                {total > 0 && (
                  <text
                    x={BAR_W / 2}
                    y={BAR_H - totalH - 4}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#6b7280"
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
                  fill="#9ca3af"
                >
                  {m.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-500" />
          <span className="text-xs text-gray-500">Stripe</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span className="text-xs text-gray-500">Cash</span>
        </div>
      </div>
    </div>
  );
}
