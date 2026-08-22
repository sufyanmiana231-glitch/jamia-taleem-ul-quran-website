"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/client";
import type { AppUser, Role } from "@/domain/schema/user";
import { can, type Permission } from "./roles";

type AuthContextValue = {
  firebaseReady: boolean;
  loading: boolean;
  firebaseUser: FirebaseUser | null;
  appUser: AppUser | null;
  role: Role | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  can: (permission: Permission) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * The very first person to sign in on a fresh Firebase project becomes
 * admin automatically (checked by counting the `users` collection). Every
 * subsequent signup needs an admin to create their `users/{uid}` doc with
 * an explicit role — there is no self-service admin escalation after that.
 */
async function bootstrapOrLoadAppUser(firebaseUser: FirebaseUser): Promise<AppUser> {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not configured");

  const userRef = doc(db, "users", firebaseUser.uid);
  const existing = await getDoc(userRef);
  if (existing.exists()) {
    return { id: existing.id, ...(existing.data() as Omit<AppUser, "id">) };
  }

  const usersSnapshot = await getDocs(query(collection(db, "users"), limit(1)));
  const isFirstUser = usersSnapshot.empty;

  const newUser: Omit<AppUser, "id"> = {
    name: firebaseUser.displayName || firebaseUser.email || "صارف",
    email: firebaseUser.email || "",
    role: isFirstUser ? "admin" : "viewer",
    isActive: true,
    linkedTeacherId: null,
    createdAt: new Date().toISOString(),
  };
  await setDoc(userRef, { ...newUser, createdAt: serverTimestamp() });
  return { id: firebaseUser.uid, ...newUser };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const profile = await bootstrapOrLoadAppUser(user);
          setAppUser(profile);
        } catch {
          setAppUser(null);
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseReady: isFirebaseConfigured,
      loading,
      firebaseUser,
      appUser,
      role: appUser?.role ?? null,
      signIn: async (email: string, password: string) => {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error("Firebase not configured");
        await signInWithEmailAndPassword(auth, email, password);
      },
      signOut: async () => {
        const auth = getFirebaseAuth();
        if (!auth) return;
        await firebaseSignOut(auth);
      },
      can: (permission: Permission) => can(appUser?.role ?? null, permission),
    }),
    [loading, firebaseUser, appUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
