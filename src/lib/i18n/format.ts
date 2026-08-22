import { format, parseISO, isValid } from "date-fns";

/**
 * Numbers and currency intentionally stay in Latin digits (per product spec)
 * so figures remain unambiguous for accountants regardless of UI language.
 */
export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount);
  return `Rs. ${rounded.toLocaleString("en-US")}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatDate(value: string | Date | null | undefined, pattern = "dd MMM yyyy"): string {
  if (!value) return "—";
  const date = typeof value === "string" ? parseISO(value) : value;
  if (!isValid(date)) return "—";
  return format(date, pattern);
}

export function formatMonth(period: string): string {
  const date = parseISO(`${period}-01`);
  if (!isValid(date)) return period;
  return format(date, "MMMM yyyy");
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Oldest-to-newest list of the last `count` periods (including the current one), e.g. ["2026-03", ..., "2026-08"]. */
export function recentMonths(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}
