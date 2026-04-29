export type Period =
  | "week"
  | "lastweek"
  | "month"
  | "lastmonth"
  | "3months"
  | "ytd"
  | "all"
  | "custom";

export interface DateRange {
  from: string | null;
  to: string | null;
  period: Period;
}

export function getDateRange(period: Period, from?: string, to?: string): DateRange {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  function fmt(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  switch (period) {
    case "week": {
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((day + 6) % 7));
      return { from: fmt(monday), to: today, period };
    }
    case "lastweek": {
      const day = now.getDay();
      const lastMonday = new Date(now);
      lastMonday.setDate(now.getDate() - ((day + 6) % 7) - 7);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      return { from: fmt(lastMonday), to: fmt(lastSunday), period };
    }
    case "month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: fmt(first), to: today, period };
    }
    case "lastmonth": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: fmt(first), to: fmt(last), period };
    }
    case "3months": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return { from: fmt(d), to: today, period };
    }
    case "ytd":
      return { from: `${now.getFullYear()}-01-01`, to: today, period };
    case "custom":
      return { from: from ?? null, to: to ?? null, period };
    default:
      return { from: null, to: null, period: "all" };
  }
}

export function parseDateRange(searchParams: {
  get: (k: string) => string | null;
}): DateRange {
  const period = (searchParams.get("period") as Period) ?? "ytd";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  return getDateRange(period, from, to);
}
