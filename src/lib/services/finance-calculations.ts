import type { LedgerEntry } from "@/domain/schema/finance";
import type { SalaryPaymentStatus } from "@/domain/schema/teacher";

/**
 * Pure, side-effect-free financial math — no Firestore, no dates.now().
 * Every number the dashboard/reports show must be derivable from these
 * functions applied to the ledger, never hand-maintained. See
 * docs/BUSINESS_RULES.md for the reasoning behind each formula.
 */

function activeEntries(entries: LedgerEntry[]): LedgerEntry[] {
  return entries.filter((e) => !e.isVoid);
}

function sumByDirection(entries: LedgerEntry[], direction: "credit" | "debit"): number {
  return entries.filter((e) => e.direction === direction).reduce((sum, e) => sum + e.amount, 0);
}

/** Available Balance = Total Income Received − Total Expenses Paid (spec §5), extended to all ledger movement. */
export function computeBalance(entries: LedgerEntry[]): number {
  const active = activeEntries(entries);
  return sumByDirection(active, "credit") - sumByDirection(active, "debit");
}

export function computeTotalReceived(entries: LedgerEntry[]): number {
  return sumByDirection(activeEntries(entries), "credit");
}

export function computeTotalSpent(entries: LedgerEntry[]): number {
  return sumByDirection(
    activeEntries(entries).filter((e) => e.type === "expense" || e.type === "salary_payment"),
    "debit",
  );
}

export function computeOutstandingLoansTotal(entries: LedgerEntry[]): number {
  const active = activeEntries(entries);
  const disbursed = active.filter((e) => e.type === "loan_disbursement").reduce((s, e) => s + e.amount, 0);
  const repaid = active.filter((e) => e.type === "loan_repayment").reduce((s, e) => s + e.amount, 0);
  return Math.max(0, disbursed - repaid);
}

export function sumEntriesInRange(entries: LedgerEntry[], fromISO: string, toISO: string): LedgerEntry[] {
  return activeEntries(entries).filter((e) => e.date >= fromISO && e.date <= toISO);
}

export function computeExpensesByCategory(entries: LedgerEntry[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const e of activeEntries(entries)) {
    if (e.direction !== "debit" || !e.expenseCategoryId) continue;
    result[e.expenseCategoryId] = (result[e.expenseCategoryId] ?? 0) + e.amount;
  }
  return result;
}

/** Remaining Budget = Allocated Budget − Actual Expenses (spec §12). */
export function computeBudgetUsage(allocatedAmount: number, spentAmount: number) {
  const remaining = allocatedAmount - spentAmount;
  const percentUsed = allocatedAmount > 0 ? (spentAmount / allocatedAmount) * 100 : spentAmount > 0 ? 100 : 0;
  return {
    allocatedAmount,
    spentAmount,
    remaining,
    percentUsed,
    isOverBudget: spentAmount > allocatedAmount,
    isNearLimit: percentUsed >= 80 && percentUsed < 100,
  };
}

export function computeSalaryStatus(expectedAmount: number, paidAmount: number): SalaryPaymentStatus {
  if (paidAmount <= 0) return "pending";
  if (paidAmount >= expectedAmount) return "paid";
  return "partial";
}

export function computeSalaryRemaining(expectedAmount: number, paidAmount: number): number {
  return Math.max(0, expectedAmount - paidAmount);
}

export function computeLoanOutstanding(amount: number, totalRepaid: number): number {
  return Math.max(0, amount - totalRepaid);
}

export function computeAttendancePercentage(presentOrLateCount: number, totalMarked: number): number {
  if (totalMarked === 0) return 0;
  return (presentOrLateCount / totalMarked) * 100;
}
