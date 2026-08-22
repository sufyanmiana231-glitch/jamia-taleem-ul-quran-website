import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  QueryConstraint,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { ZodType, ZodTypeDef } from "zod";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";

/**
 * Schemas built with `.optional().default(...)` have a wider *input* type
 * (field can be omitted) than *output* type (field is always present after
 * parsing). `ZodType<T>` fixes Input = Output = T, which every such schema
 * fails to satisfy — so repositories only ever care about the parsed
 * (output) shape, hence the loosened Input parameter here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyZodType<T> = ZodType<T, ZodTypeDef, any>;

/**
 * Every entity repository is a thin, typed wrapper around these two
 * factories — this is the seam that lets the app "connect Firebase later
 * without rewriting business logic" (per spec §1): services/pages only
 * ever call repository methods, never `firebase/firestore` directly. When
 * Firebase isn't configured, every method degrades to an empty/no-op
 * result instead of throwing, so pages render a normal empty state.
 */

export type Unsub = Unsubscribe;

function noopUnsubscribe(): Unsub {
  return () => {};
}

export interface MutableRepository<T extends { id: string }, TCreate> {
  subscribeAll(onData: (items: T[]) => void, onError?: (err: Error) => void): Unsub;
  getById(id: string): Promise<T | null>;
  create(data: TCreate, actorUid: string): Promise<string>;
  update(id: string, patch: Partial<TCreate>, actorUid: string): Promise<void>;
  setArchived(id: string, archived: boolean, actorUid: string): Promise<void>;
}

/**
 * For entities with createdAt/createdBy/updatedAt/updatedBy + isArchived
 * (students, teachers, classes, expenses, incomes, budgets, ...).
 */
export function createRepository<T extends { id: string }, TCreate extends Record<string, unknown>>(
  collectionName: string,
  schema: AnyZodType<T>,
  orderByField = "createdAt",
): MutableRepository<T, TCreate> {
  const parseDoc = (id: string, data: unknown): T | null => {
    const result = schema.safeParse({ id, ...(data as object) });
    if (!result.success) {
      console.error(`[${collectionName}] failed to parse doc ${id}`, result.error.flatten());
      return null;
    }
    return result.data;
  };

  return {
    subscribeAll(onData, onError) {
      const db = getFirestoreDb();
      if (!isFirebaseConfigured || !db) {
        onData([]);
        return noopUnsubscribe();
      }
      const constraints: QueryConstraint[] = [orderBy(orderByField, "desc")];
      const q = query(collection(db, collectionName), ...constraints);
      return onSnapshot(
        q,
        (snapshot) => {
          const items = snapshot.docs.map((d) => parseDoc(d.id, d.data())).filter((x): x is T => x !== null);
          onData(items);
        },
        (err) => onError?.(err),
      );
    },

    async getById(id) {
      const db = getFirestoreDb();
      if (!isFirebaseConfigured || !db) return null;
      const snap = await getDoc(doc(db, collectionName, id));
      if (!snap.exists()) return null;
      return parseDoc(snap.id, snap.data());
    },

    async create(data, actorUid) {
      const db = getFirestoreDb();
      if (!isFirebaseConfigured || !db) throw new Error("Firebase not configured");
      const now = new Date().toISOString();
      const ref = await addDoc(collection(db, collectionName), {
        ...data,
        isArchived: false,
        createdAt: now,
        createdBy: actorUid,
        updatedAt: now,
        updatedBy: actorUid,
      });
      return ref.id;
    },

    async update(id, patch, actorUid) {
      const db = getFirestoreDb();
      if (!isFirebaseConfigured || !db) throw new Error("Firebase not configured");
      await updateDoc(doc(db, collectionName, id), {
        ...patch,
        updatedAt: new Date().toISOString(),
        updatedBy: actorUid,
      });
    },

    async setArchived(id, archived, actorUid) {
      const db = getFirestoreDb();
      if (!isFirebaseConfigured || !db) throw new Error("Firebase not configured");
      await updateDoc(doc(db, collectionName, id), {
        isArchived: archived,
        updatedAt: new Date().toISOString(),
        updatedBy: actorUid,
      });
    },
  };
}

export interface LogRepository<T extends { id: string }, TCreate extends Record<string, unknown>> {
  subscribeAll(onData: (items: T[]) => void, onError?: (err: Error) => void): Unsub;
  create(data: TCreate, actorUid: string): Promise<string>;
}

/** For append-only logs (salary history, loan repayments, academic history) — no update method exists on purpose. */
export function createLogRepository<T extends { id: string }, TCreate extends Record<string, unknown>>(
  collectionName: string,
  schema: AnyZodType<T>,
  orderByField = "createdAt",
): LogRepository<T, TCreate> {
  const parseDoc = (id: string, data: unknown): T | null => {
    const result = schema.safeParse({ id, ...(data as object) });
    if (!result.success) {
      console.error(`[${collectionName}] failed to parse doc ${id}`, result.error.flatten());
      return null;
    }
    return result.data;
  };

  return {
    subscribeAll(onData, onError) {
      const db = getFirestoreDb();
      if (!isFirebaseConfigured || !db) {
        onData([]);
        return noopUnsubscribe();
      }
      const q = query(collection(db, collectionName), orderBy(orderByField, "desc"));
      return onSnapshot(
        q,
        (snapshot) => {
          const items = snapshot.docs.map((d) => parseDoc(d.id, d.data())).filter((x): x is T => x !== null);
          onData(items);
        },
        (err) => onError?.(err),
      );
    },
    async create(data, actorUid) {
      const db = getFirestoreDb();
      if (!isFirebaseConfigured || !db) throw new Error("Firebase not configured");
      const ref = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: new Date().toISOString(),
        createdBy: actorUid,
      });
      return ref.id;
    },
  };
}

/** For singleton "one doc" collections keyed by a fixed id, e.g. settings/organization. */
export function createSingletonRepository<T>(collectionName: string, docId: string, schema: AnyZodType<T>) {
  return {
    async get(): Promise<T | null> {
      const db = getFirestoreDb();
      if (!isFirebaseConfigured || !db) return null;
      const snap = await getDoc(doc(db, collectionName, docId));
      if (!snap.exists()) return null;
      const result = schema.safeParse({ id: docId, ...snap.data() });
      return result.success ? result.data : null;
    },
    async set(data: Partial<T>, actorUid: string): Promise<void> {
      const db = getFirestoreDb();
      if (!isFirebaseConfigured || !db) throw new Error("Firebase not configured");
      await setDoc(
        doc(db, collectionName, docId),
        { ...data, updatedAt: new Date().toISOString(), updatedBy: actorUid },
        { merge: true },
      );
    },
  };
}

/** Escape hatch for entity-specific queries (e.g. "expenses in this category/period"). */
export async function getAllRaw<T extends { id: string }>(collectionName: string, schema: AnyZodType<T>): Promise<T[]> {
  const db = getFirestoreDb();
  if (!isFirebaseConfigured || !db) return [];
  const snap = await getDocs(collection(db, collectionName));
  return snap.docs
    .map((d) => schema.safeParse({ id: d.id, ...d.data() }))
    .filter((r): r is { success: true; data: T } => r.success)
    .map((r) => r.data);
}
