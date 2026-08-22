# Database (Firestore)

Schemas are defined once in `src/domain/schema/*.ts` (Zod) — this document
describes the resulting Firestore collections; the schema files are the
source of truth for exact field types/validation.

## Collections

| Collection | Shape | Written by |
|---|---|---|
| `users` | `{name, email, role, isActive, linkedTeacherId, createdAt}` | Auth bootstrap, Settings → Users |
| `settings/organization` | singleton doc | Settings → Organization |
| `students` | full student record, `isArchived` soft-delete | Students module |
| `studentAcademicHistory` | append-only class/status transition log | Students module (auto, on class/status change) |
| `teachers` | full teacher record incl. denormalized `currentSalary` | Teachers module |
| `teacherSalaryHistory` | append-only `{previousSalary, newSalary, effectiveDate, reason}` | Teachers module → "Change salary" |
| `salaryPayments` | keyed `${teacherId}_${period}`, accumulates via `increment()` | finance-service `recordSalaryPayment` |
| `teacherLoans` | `{amount, outstandingAmount, isSettled, ...}` | finance-service `issueTeacherLoan` |
| `loanRepayments` | append-only, references `loanId` | finance-service `repayTeacherLoan` |
| `schoolClasses` | `{name, teacherIds[], capacity}` | Classes module |
| `studentAttendanceDays` | keyed `${classId}_${date}`, `records: {studentId: {status, notes}}` | Attendance module |
| `teacherAttendanceDays` | keyed `${date}`, `records: {teacherId: {status, notes}}` | Attendance module |
| `incomes` | one row per donation/fund received | Finance → Income |
| `expenseCategories` | `{name, group, isDefault, isArchived}` | Settings → Expense Categories |
| `expenses` | `{categoryId, amount, status: pending\|paid, linkedStudentId?, linkedTeacherId?}` | Finance → Expenses |
| `budgets` | keyed `${categoryId}_${period}`, `{allocatedAmount}` — spend is *derived*, never stored | Finance → Budgets |
| `welfareSupport` | `{studentId, categoryId, amount, expenseId}` — always paired with an `expenses` doc | Student profile → "Record support" |
| `ledgerEntries` | **append-only**, every financial movement | finance-service only |
| `auditLogs` | append-only change log | (wired for future use; not all mutations log yet — see below) |

## The ledger is the single source of truth for money

Every function in `lib/services/finance-service.ts` that moves money
writes to `incomes`/`expenses`/`salaryPayments`/`teacherLoans` **and**
`ledgerEntries` in one Firestore `writeBatch` — both succeed or both
fail, so the ledger can never drift from the records that produced it.

```
ledgerEntries/{id}
  type: income | expense | salary_payment | loan_disbursement | loan_repayment
  direction: credit | debit
  amount, date, description
  sourceCollection, sourceDocId   ← traceability back to the record that posted it
  fundCategory?, expenseCategoryId?, linkedStudentId?, linkedTeacherId?
  isVoid: boolean                 ← reversals are new offsetting entries, never edits
```

**Why a ledger instead of computing totals from each collection
directly?** Five collections (`incomes`, `expenses`, `salaryPayments`,
`teacherLoans`, `loanRepayments`) each have a different shape and
different rules for when they count as cash movement (a *pending*
expense doesn't move cash yet; a *paid* one does). Summing across five
shapes correctly, consistently, in every report and on the dashboard,
means either duplicating that logic five times or centralizing it once.
The ledger is that one place — `computeBalance()`,
`computeTotalReceived()`, `computeTotalSpent()`, etc.
(`lib/services/finance-calculations.ts`) only ever read `ledgerEntries`,
and are unit-tested against it directly.

### Balance formula (spec §5)

```
Available Balance = Σ(credit ledger entries) − Σ(debit ledger entries)
                   = Total Income Received − Total Expenses Paid
```

Loan disbursements are debits and repayments are credits, so they net
into the same balance (a loan is still cash leaving the building) while
being excluded from the "Total Expenses" KPI and reported separately as
"Outstanding Loans" — a loan is a receivable, not a cost.

### Why `expenses` has a `status` field instead of only posting when paid

A *pending* expense (a bill received but not yet paid) is a real
administrative record the admin wants to track, but it hasn't moved cash
yet. `postExpense()` only writes a ledger entry when `status: 'paid'`;
`markExpensePaid()` posts the (until-then-missing) ledger entry when a
pending expense is later paid. An expense is never double-posted.

### Why `budgets` doesn't store a `spentAmount`

Storing it would require updating it on every expense write touching
that category/period — another place totals could drift. Instead
`computeBudgetUsage(allocated, spent)` takes `spent` computed on read
(sum of ledger debits for that category within that period), so a
budget's "spent" figure is always consistent with the ledger, by
construction, not by remembering to update it.

### Attendance is one document per class-day / per day, not per student

`studentAttendanceDays/{classId}_{date}` holds a `records` map keyed by
`studentId`. Marking 40 students is one read + one write, not 40 — this
is what makes the bulk-marking screen (spec §9: "must be fast for
administrators") cheap regardless of class size.

## Known gap: audit log coverage

`auditLogs` and the schema for it exist, but only a subset of mutations
call it today (the append-only repositories — salary history, loan
repayments, academic history — are audit trails *in themselves* by
being append-only; free-form edits like updating a student's phone
number don't yet write a separate audit entry). Extending
`createRepository().update()` to also write an `auditLogs` entry is a
natural next step and doesn't require a schema change — the collection
is already there.
