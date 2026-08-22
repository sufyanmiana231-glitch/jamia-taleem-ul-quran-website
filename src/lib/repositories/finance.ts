import { collection, doc, getDoc, onSnapshot, query, setDoc } from "firebase/firestore";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  budgetSchema,
  expenseCategorySchema,
  expenseSchema,
  incomeSchema,
  ledgerEntrySchema,
  welfareSupportSchema,
  type Budget,
  type Expense,
  type ExpenseCategory,
  type Income,
  type LedgerEntry,
  type WelfareSupport,
} from "@/domain/schema/finance";
import { createLogRepository, createRepository, type Unsub } from "./firestoreRepository";

export const incomesRepository = createRepository<Income, Record<string, unknown>>("incomes", incomeSchema);

export const expenseCategoriesRepository = createRepository<ExpenseCategory, Record<string, unknown>>(
  "expenseCategories",
  expenseCategorySchema,
  "name",
);

export const expensesRepository = createRepository<Expense, Record<string, unknown>>("expenses", expenseSchema);

export const welfareSupportRepository = createLogRepository<WelfareSupport, Record<string, unknown>>(
  "welfareSupport",
  welfareSupportSchema,
  "date",
);

/** Append-only ledger: create + subscribe only. No update/delete method exists anywhere in this file, by design. */
export const ledgerRepository = {
  subscribeAll(onData: (entries: LedgerEntry[]) => void, onError?: (e: Error) => void): Unsub {
    const db = getFirestoreDb();
    if (!isFirebaseConfigured || !db) {
      onData([]);
      return () => {};
    }
    return onSnapshot(
      query(collection(db, "ledgerEntries")),
      (snap) => {
        const items = snap.docs
          .map((d) => ledgerEntrySchema.safeParse({ id: d.id, ...d.data() }))
          .filter((r): r is { success: true; data: LedgerEntry } => r.success)
          .map((r) => r.data);
        onData(items);
      },
      (err) => onError?.(err),
    );
  },
};

/** Budgets are keyed by `${categoryId}_${period}` so allocating twice for the same category/period upserts instead of duplicating. */
export const budgetsRepository = {
  id(categoryId: string, period: string) {
    return `${categoryId}_${period}`;
  },
  subscribeAll(onData: (items: Budget[]) => void, onError?: (e: Error) => void): Unsub {
    const db = getFirestoreDb();
    if (!isFirebaseConfigured || !db) {
      onData([]);
      return () => {};
    }
    return onSnapshot(
      collection(db, "budgets"),
      (snap) => {
        const items = snap.docs
          .map((d) => budgetSchema.safeParse({ id: d.id, ...d.data() }))
          .filter((r): r is { success: true; data: Budget } => r.success)
          .map((r) => r.data);
        onData(items);
      },
      (err) => onError?.(err),
    );
  },
  async get(categoryId: string, period: string): Promise<Budget | null> {
    const db = getFirestoreDb();
    if (!isFirebaseConfigured || !db) return null;
    const snap = await getDoc(doc(db, "budgets", this.id(categoryId, period)));
    if (!snap.exists()) return null;
    const result = budgetSchema.safeParse({ id: snap.id, ...snap.data() });
    return result.success ? result.data : null;
  },
  async upsert(categoryId: string, period: string, allocatedAmount: number, actorUid: string): Promise<void> {
    const db = getFirestoreDb();
    if (!isFirebaseConfigured || !db) throw new Error("Firebase not configured");
    const now = new Date().toISOString();
    await setDoc(
      doc(db, "budgets", this.id(categoryId, period)),
      { categoryId, period, allocatedAmount, updatedAt: now, updatedBy: actorUid, createdAt: now },
      { merge: true },
    );
  },
};
