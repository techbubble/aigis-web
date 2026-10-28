// Calendar periods for the time scrubber: the map shows every event inside
// the period that contains the cursor.
export type Period = "hour" | "day" | "week" | "month" | "year" | "decade";
export const PERIODS: Period[] = ["hour", "day", "week", "month", "year", "decade"];

const HOUR = 3600000,
  DAY = 86400000;
export const PERIOD_MS: Record<Period, number> = { hour: HOUR, day: DAY, week: 7 * DAY, month: 30.4375 * DAY, year: 365.25 * DAY, decade: 3652.5 * DAY };

export function periodStart(t: number, p: Period): number {
  const d = new Date(t);
  switch (p) {
    case "hour":
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours());
    case "day":
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    case "week": {
      const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      const dow = (new Date(day).getUTCDay() + 6) % 7; // Monday = 0
      return day - dow * DAY;
    }
    case "month":
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    case "year":
      return Date.UTC(d.getUTCFullYear(), 0, 1);
    case "decade":
      return Date.UTC(Math.floor(d.getUTCFullYear() / 10) * 10, 0, 1);
  }
}

export function periodNext(start: number, p: Period): number {
  const d = new Date(start);
  switch (p) {
    case "hour":
      return start + HOUR;
    case "day":
      return start + DAY;
    case "week":
      return start + 7 * DAY;
    case "month":
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    case "year":
      return Date.UTC(d.getUTCFullYear() + 1, 0, 1);
    case "decade":
      return Date.UTC(d.getUTCFullYear() + 10, 0, 1);
  }
}

export function periodBounds(t: number, p: Period): [number, number] {
  const s = periodStart(t, p);
  return [s, periodNext(s, p)];
}

export function periodLabel(t: number, p: Period): string {
  const d = new Date(periodStart(t, p));
  const y = d.getUTCFullYear();
  const mon = d.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  const monS = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  switch (p) {
    case "hour":
      return `${monS} ${d.getUTCDate()}, ${y} ${String(d.getUTCHours()).padStart(2, "0")}:00`;
    case "day":
      return `${d.toLocaleString("en-US", { weekday: "short", timeZone: "UTC" })} ${monS} ${d.getUTCDate()}, ${y}`;
    case "week":
      return `Week of ${monS} ${d.getUTCDate()}, ${y}`;
    case "month":
      return `${mon} ${y}`;
    case "year":
      return String(y);
    case "decade":
      return `${y}s`;
  }
}

// Smallest period that averages at least `min` events per period.
export function defaultPeriod(span: number, n: number, min = 3): Period {
  for (const p of PERIODS) {
    const periods = Math.max(1, span / PERIOD_MS[p]);
    if (n / periods >= min && PERIOD_MS[p] <= span) return p;
  }
  // Fall back to the largest period not exceeding the span.
  const fits = PERIODS.filter((p) => PERIOD_MS[p] <= span * 1.01);
  return fits[fits.length - 1] ?? "day";
}

export function periodsInSpan(span: number): Period[] {
  return PERIODS.filter((p) => PERIOD_MS[p] <= span * 1.01 && span / PERIOD_MS[p] <= 5000);
}
