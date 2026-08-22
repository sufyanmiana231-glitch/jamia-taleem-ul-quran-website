"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, runTransaction } from "firebase/firestore";
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
 * admin automatically. Every subsequent signup gets "viewer" and needs an
 * existing admin to change their role from Settings — there is no
 * self-service admin escalation after the bootstrap doc is claimed.
 *
 * "First person" is decided by a `system/adminBootstrap` sentinel document,
 * claimed exactly once inside a transaction (see firestore.rules for the
 * matching write rule) — not by counting the `users` collection, which a
 * plain client-side check couldn't do safely under concurrent sign-ins,
 * and which firestore.rules can't express directly (no "collection size"
 * predicate in the rules language).
 */
async function bootstrapOrLoadAppUser(firebaseUser: FirebaseUser): Promise<AppUser> {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore not configured");

  const userRef = doc(db, "users", firebaseUser.uid);
  const existing = await getDoc(userRef);
  if (existing.exists()) {
    return { id: existing.id, ...(existing.data() as Omit<AppUser, "id">) };
  }

  const bootstrapRef = doc(db, "system", "adminBootstrap");
  const createdAt = new Date().toISOString();

  const newUser = await runTransaction(db, async (tx) => {
    const bootstrapSnap = await tx.get(bootstrapRef);
    const alreadyClaimed = bootstrapSnap.exists() && bootstrapSnap.data().claimed === true;

    const user: Omit<AppUser, "id"> = {
      name: firebaseUser.displayName || firebaseUser.email || "صارف",
      email: firebaseUser.email || "",
      role: alreadyClaimed ? "viewer" : "admin",
      isActive: true,
      linkedTeacherId: null,
      createdAt,
    };
    tx.set(userRef, user);
    if (!alreadyClaimed) {
      tx.set(bootstrapRef, { claimed: true, claimedBy: firebaseUser.uid, claimedAt: createdAt });
    }
    return user;
  });

  return { id: firebaseUser.uid, ...newUser };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  // Nothing to load when Firebase isn't configured — start "not loading" instead of
  // flipping it off inside the effect, which is unreachable anyway (see below).
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    // getFirebaseAuth() is guaranteed non-null here: isFirebaseConfigured true means
    // ensureInitialized() in client.ts already created the app and getAuth() cannot fail.
    const auth = getFirebaseAuth()!;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const profile = await bootstrapOrLoadAppUser(user);
          setAppUser(profile);
        } catch (err) {
          // Swallowing this silently is exactly what made the last bug (rules
          // blocking the first-admin bootstrap) invisible until "the sidebar is
          // gone" — surface it so a permissions/rules problem is diagnosable
          // from the browser console instead of a guessing game.
          console.error("Failed to load or bootstrap the app user profile:", err);
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
      // While Firebase is unconfigured there is no role to check against — and no
      // backend to enforce anything either — so every permission defaults open,
      // matching RequireAuth's "let the shell through" behavior in that state.
      can: (permission: Permission) => !isFirebaseConfigured || can(appUser?.role ?? null, permission),
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
