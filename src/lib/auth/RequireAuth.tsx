"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { useLocale } from "@/lib/i18n";

/**
 * Guards the authenticated app shell. When Firebase isn't configured yet
 * we deliberately let the UI through instead of hard-blocking behind a
 * login wall that can never succeed — see docs/SETUP.md. A banner (rendered
 * by the layout) makes that state obvious instead of silent.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { firebaseReady, loading, firebaseUser } = useAuth();
  const router = useRouter();
  const { t } = useLocale();

  useEffect(() => {
    if (firebaseReady && !loading && !firebaseUser) {
      router.replace("/login");
    }
  }, [firebaseReady, loading, firebaseUser, router]);

  if (firebaseReady && loading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        {t.common.loading}
      </div>
    );
  }

  if (firebaseReady && !firebaseUser) {
    return null;
  }

  return <>{children}</>;
}
