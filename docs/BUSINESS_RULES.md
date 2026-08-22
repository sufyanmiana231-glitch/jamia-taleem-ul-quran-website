# Business rules

The formulas and invariants the app is built to guarantee. Every formula
below is implemented as a pure function in
`src/lib/services/finance-calculations.ts` and covered by a Vitest test
of the same name in `finance-calculations.test.ts` — if a number on
screen disagrees with this document, the test file is the first place to
check.

## Financial invariants

1. **No hand-edited totals.** Every balance, "total spent," "total
   received," and budget "spent" figure is *derived* from
   `ledgerEntries` (or, for budgets, from ledger entries filtered by
   category+period) at read time. There is no field anywhere in the
   schema called `currentBalance` that a form writes to directly.

2. **A ledger entry is never edited or deleted once written.**
   `ledgerRepository` exposes only `subscribeAll` — no `update`, no
   `delete`. A mistaken entry is corrected by posting an offsetting
   entry (or, for now, setting `isVoid: true` directly in Firestore —
   a "void with reason" UI flow is a natural extension, not yet built).

3. **Available Balance = Total Income Received − Total Expenses Paid**
   (spec §5), computed as `Σcredits − Σdebits` over all non-void ledger
   entries. Loan disbursements/repayments net into this figure (cash
   still moves) but are excluded from the "Total Expenses" KPI and
   reported separately as outstanding loans (spec §13: loans are
   "tracked separately but included appropriately in financial
   reporting").

4. **Remaining Budget = Allocated Budget − Actual Expenses** (spec §12),
   where Actual Expenses is the live sum of ledger debits for that
   category within that period — never a stored, updatable field.
   Warnings (`isNearLimit` at ≥80%, `isOverBudget` above 100%) are
   informational; **the system never blocks a valid expense for being
   over budget** (spec §12: "Do not prevent valid expenses solely
   because a budget is exceeded").

5. **Salary status derivation**: `pending` (paid = 0) → `partial`
   (0 < paid < expected) → `paid` (paid ≥ expected), recomputed on every
   payment via `computeSalaryStatus`. Overpayment doesn't go negative —
   `computeSalaryRemaining` floors at zero.

6. **Loan outstanding = amount − Σ(repayments)**, floored at zero
   (`computeLoanOutstanding`). A loan is `isSettled: true` exactly when
   outstanding reaches zero.

## Never overwrite history

- **Teacher salary changes** (spec §6): `changeTeacherSalary()` always
  *appends* a `teacherSalaryHistory` entry (`previousSalary → newSalary`,
  effective date, reason) in the same batch that updates the teacher's
  denormalized `currentSalary`. The history collection has no `update`
  method — see `createLogRepository` in
  [ARCHITECTURE.md](ARCHITECTURE.md).
- **Student class/status changes** (spec §7): editing a student's class
  or status writes a `studentAcademicHistory` entry recording the
  before/after, alongside the update — the old class/status isn't lost.
- **Salary payments and loan repayments** are themselves append-only
  records, not a single mutable "amount paid so far" field — the full
  payment-by-payment history is always available on the teacher's
  profile.

## Avoiding duplicate accounting

- **Student welfare/support** (spec §7, §11): recording support for a
  student (`recordWelfareSupport`) creates a `welfareSupport` doc **and**
  a linked `expenses` doc **and** the ledger entry, all in one batch. The
  welfare record is a view *onto* an expense, not a second, separate
  financial fact — so "total expenses" and "total student welfare
  spending" never double-count the same rupee.
- **Salary payments post as expenses** the same way — a payment is
  simultaneously a `salaryPayments` update and a `ledger` debit, counted
  once in "Total Expenses."

## Restricted funds (spec §10)

Income has a free-text `fundCategory` (donation, zakat, sadaqah, general,
scholarship fund, other — configurable, not a hard enum) and an
`isRestricted` flag. The app **does not** enforce or interpret Sharia
rulings about how restricted funds may be spent — that's an
organizational/scholarly policy decision. What it guarantees
mechanically: every income record's category is preserved and
reportable (Reports → Financial → Fund Source Report), so the
organization can answer "how much zakat did we receive and is it
distinguishable from general donations" — the governance judgment about
*how* to spend it stays with the admins/scholars, by design.

## Attendance percentage

`computeAttendancePercentage(presentOrLate, totalMarked)` = present-or-late
÷ total marked, returning `0` (not `NaN`) when nothing has been marked
yet — every screen that shows a percentage checks `marked > 0` before
displaying it, showing "—" otherwise rather than a misleading "0%".
