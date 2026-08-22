import { describe, expect, it } from "vitest";
import type { LedgerEntry } from "@/domain/schema/finance";
import {
  computeAttendancePercentage,
  computeBalance,
  computeBudgetUsage,
  computeExpensesByCategory,
  computeLoanOutstanding,
  computeOutstandingLoansTotal,
  computeSalaryRemaining,
  computeSalaryStatus,
  computeTotalReceived,
  computeTotalSpent,
  sumEntriesInRange,
} from "./finance-calculations";

function entry(overrides: Partial<LedgerEntry>): LedgerEntry {
  return {
    id: overrides.id ?? Math.random().toString(36),
    type: "income",
    direction: "credit",
    amount: 1000,
    date: "2026-01-01",
    description: "test",
    sourceCollection: "incomes",
    sourceDocId: "x",
    isVoid: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    createdBy: "tester",
    ...overrides,
  };
}

describe("computeBalance", () => {
  it("is zero with no transactions", () => {
    expect(computeBalance([])).toBe(0);
  });

  it("equals total income minus total expenses paid (spec formula)", () => {
    const entries: LedgerEntry[] = [
      entry({ type: "income", direction: "credit", amount: 50000 }),
      entry({ type: "expense", direction: "debit", amount: 12000 }),
      entry({ type: "salary_payment", direction: "debit", amount: 8000 }),
    ];
    expect(computeBalance(entries)).toBe(30000);
  });

  it("ignores voided entries entirely", () => {
    const entries: LedgerEntry[] = [
      entry({ type: "income", direction: "credit", amount: 50000 }),
      entry({ type: "income", direction: "credit", amount: 99999, isVoid: true }),
    ];
    expect(computeBalance(entries)).toBe(50000);
  });

  it("nets loan disbursement and repayment through the same balance", () => {
    const entries: LedgerEntry[] = [
      entry({ type: "income", direction: "credit", amount: 100000 }),
      entry({ type: "loan_disbursement", direction: "debit", amount: 20000 }),
      entry({ type: "loan_repayment", direction: "credit", amount: 5000 }),
    ];
    expect(computeBalance(entries)).toBe(85000);
  });
});

describe("computeTotalReceived / computeTotalSpent", () => {
  it("total spent only counts expense + salary_payment, not loans", () => {
    const entries: LedgerEntry[] = [
      entry({ type: "income", direction: "credit", amount: 100000 }),
      entry({ type: "expense", direction: "debit", amount: 10000 }),
      entry({ type: "salary_payment", direction: "debit", amount: 15000 }),
      entry({ type: "loan_disbursement", direction: "debit", amount: 20000 }),
    ];
    expect(computeTotalReceived(entries)).toBe(100000);
    expect(computeTotalSpent(entries)).toBe(25000);
  });
});

describe("computeOutstandingLoansTotal", () => {
  it("nets disbursed minus repaid and never goes negative", () => {
    const entries: LedgerEntry[] = [
      entry({ type: "loan_disbursement", direction: "debit", amount: 10000 }),
      entry({ type: "loan_repayment", direction: "credit", amount: 15000 }),
    ];
    expect(computeOutstandingLoansTotal(entries)).toBe(0);
  });

  it("reflects partial repayment", () => {
    const entries: LedgerEntry[] = [
      entry({ type: "loan_disbursement", direction: "debit", amount: 10000 }),
      entry({ type: "loan_repayment", direction: "credit", amount: 4000 }),
    ];
    expect(computeOutstandingLoansTotal(entries)).toBe(6000);
  });
});

describe("computeExpensesByCategory", () => {
  it("groups debit expense entries by category, ignoring income and loans", () => {
    const entries: LedgerEntry[] = [
      entry({ type: "expense", direction: "debit", amount: 3000, expenseCategoryId: "kitchen" }),
      entry({ type: "expense", direction: "debit", amount: 2000, expenseCategoryId: "kitchen" }),
      entry({ type: "expense", direction: "debit", amount: 1500, expenseCategoryId: "utilities" }),
      entry({ type: "income", direction: "credit", amount: 5000 }),
    ];
    expect(computeExpensesByCategory(entries)).toEqual({ kitchen: 5000, utilities: 1500 });
  });
});

describe("sumEntriesInRange", () => {
  it("filters by inclusive date bounds and excludes void entries", () => {
    const entries: LedgerEntry[] = [
      entry({ date: "2026-01-05" }),
      entry({ date: "2026-01-15" }),
      entry({ date: "2026-02-01" }),
      entry({ date: "2026-01-10", isVoid: true }),
    ];
    const result = sumEntriesInRange(entries, "2026-01-01", "2026-01-31");
    expect(result).toHaveLength(2);
  });
});

describe("computeBudgetUsage", () => {
  it("computes remaining = allocated - spent (spec formula)", () => {
    const usage = computeBudgetUsage(100000, 65000);
    expect(usage.remaining).toBe(35000);
    expect(usage.percentUsed).toBe(65);
    expect(usage.isOverBudget).toBe(false);
    expect(usage.isNearLimit).toBe(false);
  });

  it("flags near-limit at 80%+ and over-budget when spent exceeds allocated", () => {
    expect(computeBudgetUsage(10000, 8500).isNearLimit).toBe(true);
    const over = computeBudgetUsage(10000, 12000);
    expect(over.isOverBudget).toBe(true);
    expect(over.remaining).toBe(-2000);
  });

  it("does not divide by zero when nothing is allocated yet", () => {
    expect(computeBudgetUsage(0, 0).percentUsed).toBe(0);
    expect(computeBudgetUsage(0, 500).percentUsed).toBe(100);
  });
});

describe("salary payment status", () => {
  it("is pending, partial, then paid across incremental payments", () => {
    expect(computeSalaryStatus(30000, 0)).toBe("pending");
    expect(computeSalaryStatus(30000, 15000)).toBe("partial");
    expect(computeSalaryStatus(30000, 30000)).toBe("paid");
    expect(computeSalaryStatus(30000, 35000)).toBe("paid");
  });

  it("computes remaining without going negative on overpayment", () => {
    expect(computeSalaryRemaining(30000, 15000)).toBe(15000);
    expect(computeSalaryRemaining(30000, 40000)).toBe(0);
  });
});

describe("computeLoanOutstanding", () => {
  it("subtracts repayments and floors at zero", () => {
    expect(computeLoanOutstanding(5000, 2000)).toBe(3000);
    expect(computeLoanOutstanding(5000, 9000)).toBe(0);
  });
});

describe("computeAttendancePercentage", () => {
  it("is 0 when nothing was marked, to avoid NaN in the UI", () => {
    expect(computeAttendancePercentage(0, 0)).toBe(0);
  });

  it("counts present+late over total marked", () => {
    expect(computeAttendancePercentage(18, 20)).toBe(90);
  });
});
