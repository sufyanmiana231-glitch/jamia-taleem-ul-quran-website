import { doc, getDoc, onSnapshot, query, collection, where, setDoc } from "firebase/firestore";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  studentAttendanceDaySchema,
  teacherAttendanceDaySchema,
  type AttendanceEntry,
  type StudentAttendanceDay,
  type TeacherAttendanceDay,
} from "@/domain/schema/attendance";
import type { Unsub } from "./firestoreRepository";

/**
 * One document per (class, date) / per date — see attendance.ts schema
 * comment for why. `saveDay` fully replaces the `records` map in a single
 * write, which is what makes "mark 40 students in one screen" cheap.
 */
export const studentAttendanceRepository = {
  dayId(classId: string, date: string) {
    return `${classId}_${date}`;
  },
  async getDay(classId: string, date: string): Promise<StudentAttendanceDay | null> {
    const db = getFirestoreDb();
    if (!isFirebaseConfigured || !db) return null;
    const snap = await getDoc(doc(db, "studentAttendanceDays", this.dayId(classId, date)));
    if (!snap.exists()) return null;
    const result = studentAttendanceDaySchema.safeParse({ id: snap.id, ...snap.data() });
    return result.success ? result.data : null;
  },
  async saveDay(classId: string, date: string, records: Record<string, AttendanceEntry>, actorUid: string): Promise<void> {
    const db = getFirestoreDb();
    if (!isFirebaseConfigured || !db) throw new Error("Firebase not configured");
    const id = this.dayId(classId, date);
    const now = new Date().toISOString();
    await setDoc(
      doc(db, "studentAttendanceDays", id),
      { classId, date, records, updatedAt: now, updatedBy: actorUid, createdAt: now },
      { merge: true },
    );
  },
  subscribeForClass(classId: string, onData: (days: StudentAttendanceDay[]) => void, onError?: (e: Error) => void): Unsub {
    const db = getFirestoreDb();
    if (!isFirebaseConfigured || !db) {
      onData([]);
      return () => {};
    }
    const q = query(collection(db, "studentAttendanceDays"), where("classId", "==", classId));
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map((d) => studentAttendanceDaySchema.safeParse({ id: d.id, ...d.data() }))
          .filter((r): r is { success: true; data: StudentAttendanceDay } => r.success)
          .map((r) => r.data);
        onData(items);
      },
      (err) => onError?.(err),
    );
  },
  /** Across every class for one date — powers "today's attendance" on the dashboard. */
  subscribeForDate(date: string, onData: (days: StudentAttendanceDay[]) => void, onError?: (e: Error) => void): Unsub {
    const db = getFirestoreDb();
    if (!isFirebaseConfigured || !db) {
      onData([]);
      return () => {};
    }
    const q = query(collection(db, "studentAttendanceDays"), where("date", "==", date));
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map((d) => studentAttendanceDaySchema.safeParse({ id: d.id, ...d.data() }))
          .filter((r): r is { success: true; data: StudentAttendanceDay } => r.success)
          .map((r) => r.data);
        onData(items);
      },
      (err) => onError?.(err),
    );
  },
  /** Every day, every class — used for the (bounded) attendance trend chart. */
  subscribeAllDays(onData: (days: StudentAttendanceDay[]) => void, onError?: (e: Error) => void): Unsub {
    const db = getFirestoreDb();
    if (!isFirebaseConfigured || !db) {
      onData([]);
      return () => {};
    }
    return onSnapshot(
      collection(db, "studentAttendanceDays"),
      (snap) => {
        const items = snap.docs
          .map((d) => studentAttendanceDaySchema.safeParse({ id: d.id, ...d.data() }))
          .filter((r): r is { success: true; data: StudentAttendanceDay } => r.success)
          .map((r) => r.data);
        onData(items);
      },
      (err) => onError?.(err),
    );
  },
};

export const teacherAttendanceRepository = {
  async getDay(date: string): Promise<TeacherAttendanceDay | null> {
    const db = getFirestoreDb();
    if (!isFirebaseConfigured || !db) return null;
    const snap = await getDoc(doc(db, "teacherAttendanceDays", date));
    if (!snap.exists()) return null;
    const result = teacherAttendanceDaySchema.safeParse({ id: snap.id, ...snap.data() });
    return result.success ? result.data : null;
  },
  async saveDay(date: string, records: Record<string, AttendanceEntry>, actorUid: string): Promise<void> {
    const db = getFirestoreDb();
    if (!isFirebaseConfigured || !db) throw new Error("Firebase not configured");
    const now = new Date().toISOString();
    await setDoc(
      doc(db, "teacherAttendanceDays", date),
      { date, records, updatedAt: now, updatedBy: actorUid, createdAt: now },
      { merge: true },
    );
  },
  subscribeDay(date: string, onData: (day: TeacherAttendanceDay | null) => void, onError?: (e: Error) => void): Unsub {
    const db = getFirestoreDb();
    if (!isFirebaseConfigured || !db) {
      onData(null);
      return () => {};
    }
    return onSnapshot(
      doc(db, "teacherAttendanceDays", date),
      (snap) => {
        if (!snap.exists()) return onData(null);
        const result = teacherAttendanceDaySchema.safeParse({ id: snap.id, ...snap.data() });
        onData(result.success ? result.data : null);
      },
      (err) => onError?.(err),
    );
  },
  subscribeAll(onData: (days: TeacherAttendanceDay[]) => void, onError?: (e: Error) => void): Unsub {
    const db = getFirestoreDb();
    if (!isFirebaseConfigured || !db) {
      onData([]);
      return () => {};
    }
    return onSnapshot(
      collection(db, "teacherAttendanceDays"),
      (snap) => {
        const items = snap.docs
          .map((d) => teacherAttendanceDaySchema.safeParse({ id: d.id, ...d.data() }))
          .filter((r): r is { success: true; data: TeacherAttendanceDay } => r.success)
          .map((r) => r.data);
        onData(items);
      },
      (err) => onError?.(err),
    );
  },
};
