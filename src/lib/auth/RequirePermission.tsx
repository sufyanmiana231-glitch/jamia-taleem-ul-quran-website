"use client";

import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import type { Permission } from "./roles";
import { useLocale } from "@/lib/i18n";

/**
 * Gates a page/section by permission. While Firebase is unconfigured (no
 * roles exist yet) access is left open so the UI remains inspectable —
 * the real boundary is always firestore.rules, not this component.
 */
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { firebaseReady, can } = useAuth();
  const { t } = useLocale();

  if (firebaseReady && !can(permission)) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface p-12 text-center">
        <p className="text-lg font-semibold">رسائی کی اجازت نہیں</p>
        <p className="text-sm text-muted-foreground">{t.common.errorGeneric}</p>
      </div>
    );
  }

  return <>{children}</>;
}
