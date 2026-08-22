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
