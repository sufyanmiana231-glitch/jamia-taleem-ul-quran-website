"use client";

import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n";

export function FirebaseStatusBanner() {
  const { firebaseReady } = useAuth();
  const { t } = useLocale();

  if (firebaseReady) return null;

  return (
    <div className="flex items-center gap-2 bg-warning-soft px-4 py-2 text-sm text-warning">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        {t.auth.notConfigured} — <code className="rounded bg-black/5 px-1 py-0.5">.env.local</code> میں فائربیس کی معلومات درج کریں (دیکھیں docs/SETUP.md)۔
      </span>
    </div>
  );
}
