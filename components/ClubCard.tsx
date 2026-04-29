import Link from "next/link";
import { type Club, formatAmount } from "@/lib/clubs";

interface Props {
  club: Club;
  stripeTotal: number;
  stripeCount: number;
  stripeFees: number;
  cashTotal: number;
  hasError: boolean;
  periodQuery?: string;
}

export default function ClubCard({
  club,
  stripeTotal,
  stripeCount,
  stripeFees,
  cashTotal,
  hasError,
  periodQuery = "",
}: Props) {
  const stripeNet = stripeTotal - stripeFees;
  const combined = stripeTotal + cashTotal;
  const href = `/clubs/${club.slug}${periodQuery ? `?${periodQuery}` : ""}`;

  return (
    <Link href={href}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 h-full">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-3xl">{club.flag}</span>
            <h3 className="mt-2 font-semibold text-gray-900 leading-tight">
              {club.name}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{club.city}</p>
          </div>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${club.accentBg} ${club.accentText}`}
          >
            {club.currency.toUpperCase()}
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <Row
            label="Stripe gross"
            value={hasError ? "—" : `${formatAmount(stripeTotal, club.currency)} (${stripeCount})`}
          />
          {!hasError && stripeFees > 0 && (
            <Row
              label="Stripe fees"
              value={`(${formatAmount(stripeFees, club.currency)})`}
              dimRed
            />
          )}
          {!hasError && stripeFees > 0 && (
            <Row
              label="Stripe net"
              value={formatAmount(stripeNet, club.currency)}
            />
          )}
          <Row
            label="Cash buy-ins"
            value={formatAmount(cashTotal, club.currency)}
          />
          <div className="pt-2 border-t border-gray-100">
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
  bold = false,
  dimRed = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
  dimRed?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span
        className={
          bold
            ? "font-bold text-gray-900"
            : dimRed
            ? "text-red-400 text-xs self-center"
            : "text-gray-700"
        }
      >
        {value}
      </span>
    </div>
  );
}
