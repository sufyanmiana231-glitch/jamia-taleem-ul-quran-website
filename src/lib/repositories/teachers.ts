import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  loanRepaymentSchema,
  salaryPaymentSchema,
  teacherLoanSchema,
  teacherSalaryHistorySchema,
  teacherSchema,
  type LoanRepayment,
  type SalaryPayment,
  type Teacher,
  type TeacherLoan,
  type TeacherSalaryHistoryEntry,
} from "@/domain/schema/teacher";
import { createLogRepository, createRepository, type Unsub } from "./firestoreRepository";

export const teachersRepository = createRepository<Teacher, Record<string, unknown>>("teachers", teacherSchema);

export const teacherSalaryHistoryRepository = createLogRepository<TeacherSalaryHistoryEntry, Record<string, unknown>>(
  "teacherSalaryHistory",
  teacherSalaryHistorySchema,
);

/**
 * Keyed by `${teacherId}_${period}` (one row per teacher per month) so
 * repeated partial payments upsert the same doc instead of duplicating —
 * see finance-service.ts for the atomic increment-on-payment logic.
 */
export const salaryPaymentsRepository = {
  id(teacherId: string, period: string) {
    return `${teacherId}_${period}`;
  },
  async get(teacherId: string, period: string): Promise<SalaryPayment | null> {
    const db = getFirestoreDb();
    if (!isFirebaseConfigured || !db) return null;
    const snap = await getDoc(doc(db, "salaryPayments", this.id(teacherId, period)));
    if (!snap.exists()) return null;
    const result = salaryPaymentSchema.safeParse({ id: snap.id, ...snap.data() });
    return result.success ? result.data : null;
  },
  subscribeAll(onData: (items: SalaryPayment[]) => void, onError?: (e: Error) => void): Unsub {
    const db = getFirestoreDb();
    if (!isFirebaseConfigured || !db) {
      onData([]);
      return () => {};
    }
    return onSnapshot(
      collection(db, "salaryPayments"),
      (snap) => {
        const items = snap.docs
          .map((d) => salaryPaymentSchema.safeParse({ id: d.id, ...d.data() }))
          .filter((r): r is { success: true; data: SalaryPayment } => r.success)
          .map((r) => r.data);
        onData(items);
      },
      (err) => onError?.(err),
    );
  },
};

export const teacherLoansRepository = createRepository<TeacherLoan, Record<string, unknown>>(
  "teacherLoans",
  teacherLoanSchema,
);

export const loanRepaymentsRepository = createLogRepository<LoanRepayment, Record<string, unknown>>(
  "loanRepayments",
  loanRepaymentSchema,
);
