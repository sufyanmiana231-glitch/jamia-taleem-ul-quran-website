import { arrayUnion, collection, doc, getDoc, increment, writeBatch } from "firebase/firestore";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import type { IncomeFormInput, ExpenseFormInput, LedgerEntryType, LedgerDirection } from "@/domain/schema/finance";
import type {
  RecordSalaryPaymentInput,
  SalaryChangeFormInput,
  TeacherLoanFormInput,
  LoanRepaymentFormInput,
} from "@/domain/schema/teacher";
import type { WelfareSupportFormInput } from "@/domain/schema/finance";
import { computeSalaryStatus, computeLoanOutstanding } from "./finance-calculations";
import { salaryPaymentsRepository } from "@/lib/repositories/teachers";

/**
 * The only place in the app allowed to write a ledger entry. Every
 * financial action here is one atomic Firestore batch: the source
 * document (income/expense/salary payment/loan) and its ledger entry are
 * written together, or neither is. See docs/BUSINESS_RULES.md.
 */

function requireDb() {
  const db = getFirestoreDb();
  if (!isFirebaseConfigured || !db) throw new Error("Firebase not configured — cannot post a financial transaction");
  return db;
}

function ledgerPayload(input: {
  type: LedgerEntryType;
  direction: LedgerDirection;
  amount: number;
  date: string;
  description: string;
  sourceCollection: string;
  sourceDocId: string;
  actorUid: string;
  fundCategory?: string;
  expenseCategoryId?: string;
  linkedStudentId?: string;
  linkedTeacherId?: string;
  paymentMethod?: string;
  reference?: string;
}) {
  return {
    type: input.type,
    direction: input.direction,
    amount: input.amount,
    date: input.date,
    description: input.description,
    sourceCollection: input.sourceCollection,
    sourceDocId: input.sourceDocId,
    fundCategory: input.fundCategory ?? null,
    expenseCategoryId: input.expenseCategoryId ?? null,
    linkedStudentId: input.linkedStudentId ?? null,
    linkedTeacherId: input.linkedTeacherId ?? null,
    paymentMethod: input.paymentMethod ?? null,
    reference: input.reference ?? "",
    isVoid: false,
    createdAt: new Date().toISOString(),
    createdBy: input.actorUid,
  };
}

export async function postIncome(input: IncomeFormInput, actorUid: string): Promise<string> {
  const db = requireDb();
  const incomeRef = doc(collection(db, "incomes"));
  const ledgerRef = doc(collection(db, "ledgerEntries"));
  const now = new Date().toISOString();
  const batch = writeBatch(db);
  batch.set(incomeRef, {
    ...input,
    isArchived: false,
    ledgerEntryId: ledgerRef.id,
    createdAt: now,
    createdBy: actorUid,
    updatedAt: now,
    updatedBy: actorUid,
  });
  batch.set(
    ledgerRef,
    ledgerPayload({
      type: "income",
      direction: "credit",
      amount: input.amount,
      date: input.date,
      description: input.description || `آمدن — ${input.sourceName || input.fundCategory}`,
      sourceCollection: "incomes",
      sourceDocId: incomeRef.id,
      actorUid,
      fundCategory: input.fundCategory,
      paymentMethod: input.paymentMethod,
      reference: input.reference,
    }),
  );
  await batch.commit();
  return incomeRef.id;
}

/** Only "paid" expenses hit the ledger — a "pending" expense is a commitment, not yet cash out. Use markExpensePaid to post it later. */
export async function postExpense(input: ExpenseFormInput, actorUid: string): Promise<string> {
  const db = requireDb();
  const expenseRef = doc(collection(db, "expenses"));
  const now = new Date().toISOString();
  const batch = writeBatch(db);

  let ledgerEntryId: string | undefined;
  if (input.status === "paid") {
    const ledgerRef = doc(collection(db, "ledgerEntries"));
    ledgerEntryId = ledgerRef.id;
    batch.set(
      ledgerRef,
      ledgerPayload({
        type: "expense",
        direction: "debit",
        amount: input.amount,
        date: input.paymentDate || input.billDate,
        description: input.description,
        sourceCollection: "expenses",
        sourceDocId: expenseRef.id,
        actorUid,
        expenseCategoryId: input.categoryId,
        linkedStudentId: input.linkedStudentId,
        linkedTeacherId: input.linkedTeacherId,
        paymentMethod: input.paymentMethod,
        reference: input.reference,
      }),
    );
  }

  batch.set(expenseRef, {
    ...input,
    isArchived: false,
    ledgerEntryId: ledgerEntryId ?? null,
    createdAt: now,
    createdBy: actorUid,
    updatedAt: now,
    updatedBy: actorUid,
  });
  await batch.commit();
  return expenseRef.id;
}

/** Transitions a pending expense to paid and posts the (until-now missing) ledger entry — never edits an existing ledger entry. */
export async function markExpensePaid(
  expenseId: string,
  expense: { amount: number; categoryId: string; description: string; linkedStudentId?: string; linkedTeacherId?: string; paymentMethod?: string; reference?: string },
  paymentDate: string,
  actorUid: string,
): Promise<void> {
  const db = requireDb();
  const ledgerRef = doc(collection(db, "ledgerEntries"));
  const batch = writeBatch(db);
  batch.update(doc(db, "expenses", expenseId), {
    status: "paid",
    paymentDate,
    ledgerEntryId: ledgerRef.id,
    updatedAt: new Date().toISOString(),
    updatedBy: actorUid,
  });
  batch.set(
    ledgerRef,
    ledgerPayload({
      type: "expense",
      direction: "debit",
      amount: expense.amount,
      date: paymentDate,
      description: expense.description,
      sourceCollection: "expenses",
      sourceDocId: expenseId,
      actorUid,
      expenseCategoryId: expense.categoryId,
      linkedStudentId: expense.linkedStudentId,
      linkedTeacherId: expense.linkedTeacherId,
      paymentMethod: expense.paymentMethod,
      reference: expense.reference,
    }),
  );
  await batch.commit();
}

/** Creates the welfare-support record AND its backing expense in one batch, so support spending is never double-counted (spec §7/§11). */
export async function recordWelfareSupport(
  input: WelfareSupportFormInput,
  studentName: string,
  actorUid: string,
): Promise<string> {
  const db = requireDb();
  const expenseRef = doc(collection(db, "expenses"));
  const welfareRef = doc(collection(db, "welfareSupport"));
  const ledgerRef = doc(collection(db, "ledgerEntries"));
  const now = new Date().toISOString();
  const description = input.description || `طالب علم امداد — ${studentName}`;

  const batch = writeBatch(db);
  batch.set(expenseRef, {
    categoryId: input.categoryId,
    amount: input.amount,
    billDate: input.date,
    paymentDate: input.date,
    dueDate: "",
    status: "paid",
    description,
    linkedStudentId: input.studentId,
    paymentMethod: "cash",
    reference: "",
    notes: `منظور کنندہ: ${input.approvedBy || "—"}`,
    isArchived: false,
    ledgerEntryId: ledgerRef.id,
    createdAt: now,
    createdBy: actorUid,
    updatedAt: now,
    updatedBy: actorUid,
  });
  batch.set(welfareRef, {
    ...input,
    expenseId: expenseRef.id,
    createdAt: now,
    createdBy: actorUid,
  });
  batch.set(
    ledgerRef,
    ledgerPayload({
      type: "expense",
      direction: "debit",
      amount: input.amount,
      date: input.date,
      description,
      sourceCollection: "expenses",
      sourceDocId: expenseRef.id,
      actorUid,
      expenseCategoryId: input.categoryId,
      linkedStudentId: input.studentId,
    }),
  );
  await batch.commit();
  return welfareRef.id;
}

export async function changeTeacherSalary(
  teacherId: string,
  previousSalary: number,
  input: SalaryChangeFormInput,
  actorUid: string,
): Promise<void> {
  const db = requireDb();
  const historyRef = doc(collection(db, "teacherSalaryHistory"));
  const now = new Date().toISOString();
  const batch = writeBatch(db);
  batch.set(historyRef, {
    teacherId,
    previousSalary,
    newSalary: input.newSalary,
    effectiveDate: input.effectiveDate,
    reason: input.reason,
    notes: input.notes,
    createdAt: now,
    createdBy: actorUid,
  });
  batch.update(doc(db, "teachers", teacherId), {
    currentSalary: input.newSalary,
    salaryStartDate: input.effectiveDate,
    updatedAt: now,
    updatedBy: actorUid,
  });
  await batch.commit();
}

/** Increments paidAmount on the (teacherId, period) doc and posts a matching ledger debit — supports any number of partial payments. */
export async function recordSalaryPayment(
  input: RecordSalaryPaymentInput,
  expectedAmount: number,
  actorUid: string,
): Promise<void> {
  const db = requireDb();
  const id = salaryPaymentsRepository.id(input.teacherId, input.period);
  const ref = doc(db, "salaryPayments", id);
  const ledgerRef = doc(collection(db, "ledgerEntries"));
  const now = new Date().toISOString();

  const existing = await getDoc(ref);
  const prevPaid = existing.exists() ? ((existing.data().paidAmount as number) ?? 0) : 0;
  const newPaid = prevPaid + input.amount;
  const status = computeSalaryStatus(expectedAmount, newPaid);

  const batch = writeBatch(db);
  batch.set(
    ref,
    {
      teacherId: input.teacherId,
      period: input.period,
      expectedAmount,
      paidAmount: increment(input.amount),
      remainingAmount: Math.max(0, expectedAmount - newPaid),
      status,
      lastPaymentDate: input.paymentDate,
      paymentMethod: input.paymentMethod,
      reference: input.reference,
      notes: input.notes,
      ledgerEntryIds: arrayUnion(ledgerRef.id),
      createdAt: existing.exists() ? existing.data().createdAt : now,
      updatedAt: now,
      updatedBy: actorUid,
    },
    { merge: true },
  );
  batch.set(
    ledgerRef,
    ledgerPayload({
      type: "salary_payment",
      direction: "debit",
      amount: input.amount,
      date: input.paymentDate,
      description: `تنخواہ کی ادائیگی — ${input.period}`,
      sourceCollection: "salaryPayments",
      sourceDocId: id,
      actorUid,
      linkedTeacherId: input.teacherId,
      paymentMethod: input.paymentMethod,
      reference: input.reference,
    }),
  );
  await batch.commit();
}

export async function issueTeacherLoan(input: TeacherLoanFormInput, actorUid: string): Promise<string> {
  const db = requireDb();
  const loanRef = doc(collection(db, "teacherLoans"));
  const ledgerRef = doc(collection(db, "ledgerEntries"));
  const now = new Date().toISOString();
  const batch = writeBatch(db);
  batch.set(loanRef, {
    ...input,
    outstandingAmount: input.amount,
    isSettled: false,
    isArchived: false,
    ledgerEntryId: ledgerRef.id,
    createdAt: now,
    createdBy: actorUid,
  });
  batch.set(
    ledgerRef,
    ledgerPayload({
      type: "loan_disbursement",
      direction: "debit",
      amount: input.amount,
      date: input.issueDate,
      description: `قرض / ایڈوانس جاری کیا گیا`,
      sourceCollection: "teacherLoans",
      sourceDocId: loanRef.id,
      actorUid,
      linkedTeacherId: input.teacherId,
    }),
  );
  await batch.commit();
  return loanRef.id;
}

export async function repayTeacherLoan(
  loanId: string,
  teacherId: string,
  currentOutstanding: number,
  input: LoanRepaymentFormInput,
  actorUid: string,
): Promise<void> {
  const db = requireDb();
  const repaymentRef = doc(collection(db, "loanRepayments"));
  const ledgerRef = doc(collection(db, "ledgerEntries"));
  const now = new Date().toISOString();
  const newOutstanding = computeLoanOutstanding(currentOutstanding, input.amount);

  const batch = writeBatch(db);
  batch.set(repaymentRef, {
    loanId,
    teacherId,
    amount: input.amount,
    date: input.date,
    paymentMethod: input.paymentMethod,
    notes: input.notes,
    ledgerEntryId: ledgerRef.id,
    createdAt: now,
    createdBy: actorUid,
  });
  batch.update(doc(db, "teacherLoans", loanId), {
    outstandingAmount: newOutstanding,
    isSettled: newOutstanding <= 0,
    updatedAt: now,
    updatedBy: actorUid,
  });
  batch.set(
    ledgerRef,
    ledgerPayload({
      type: "loan_repayment",
      direction: "credit",
      amount: input.amount,
      date: input.date,
      description: `قرض کی قسط وصول ہوئی`,
      sourceCollection: "loanRepayments",
      sourceDocId: repaymentRef.id,
      actorUid,
      linkedTeacherId: teacherId,
      paymentMethod: input.paymentMethod,
    }),
  );
  await batch.commit();
}
