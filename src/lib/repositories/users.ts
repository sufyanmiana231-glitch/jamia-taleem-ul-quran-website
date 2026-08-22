import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { appUserSchema, type AppUser, type Role } from "@/domain/schema/user";
import type { Unsub } from "./firestoreRepository";

export const usersRepository = {
  subscribeAll(onData: (users: AppUser[]) => void, onError?: (e: Error) => void): Unsub {
    const db = getFirestoreDb();
    if (!isFirebaseConfigured || !db) {
      onData([]);
      return () => {};
    }
    return onSnapshot(
      collection(db, "users"),
      (snap) => {
        const items = snap.docs
          .map((d) => appUserSchema.safeParse({ id: d.id, ...d.data() }))
          .filter((r): r is { success: true; data: AppUser } => r.success)
          .map((r) => r.data);
        onData(items);
      },
      (err) => onError?.(err),
    );
  },
  async setRole(uid: string, role: Role): Promise<void> {
    const db = getFirestoreDb();
    if (!isFirebaseConfigured || !db) throw new Error("Firebase not configured");
    await updateDoc(doc(db, "users", uid), { role });
  },
  async setActive(uid: string, isActive: boolean): Promise<void> {
    const db = getFirestoreDb();
    if (!isFirebaseConfigured || !db) throw new Error("Firebase not configured");
    await updateDoc(doc(db, "users", uid), { isActive });
  },
};
