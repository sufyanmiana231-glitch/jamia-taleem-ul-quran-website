import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig, isFirebaseConfigured } from "./config";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

/**
 * Lazy, singleton initialization so importing this module is always safe —
 * including during builds / on the server — even when Firebase isn't
 * configured yet. Callers must check `isFirebaseConfigured` (or that the
 * getter returns non-null) before using the result.
 */
function ensureInitialized() {
  if (!isFirebaseConfigured) return;
  if (!app) {
    app = getApps()[0] ?? initializeApp(firebaseConfig);
  }
}

export function getFirebaseApp(): FirebaseApp | null {
  ensureInitialized();
  return app;
}

export function getFirebaseAuth(): Auth | null {
  ensureInitialized();
  if (!app) return null;
  if (!auth) auth = getAuth(app);
  return auth;
}

export function getFirestoreDb(): Firestore | null {
  ensureInitialized();
  if (!app) return null;
  if (!db) db = getFirestore(app);
  return db;
}

export { isFirebaseConfigured };
