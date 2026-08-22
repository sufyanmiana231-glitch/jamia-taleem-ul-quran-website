"use client";

import { LogOut, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, LOCALE_LABEL, LOCALES } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar() {
  const { t, locale, setLocale } = useLocale();
  const { appUser, firebaseUser, role, signOut, firebaseReady } = useAuth();
  const router = useRouter();

  const name = appUser?.name || firebaseUser?.email || "Admin";
  const initials = name.slice(0, 1).toUpperCase();
  const roleLabel = role ? t.settings.roles[role] : "";

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-2">
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as (typeof LOCALES)[number])}
          className="rounded-md border border-border bg-surface px-2 py-1 text-xs"
          aria-label={t.settings.language}
        >
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {LOCALE_LABEL[l]}
            </option>
          ))}
        </select>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-muted">
            <div className="text-end">
              <p className="text-sm font-medium leading-tight">{name}</p>
              {roleLabel && <p className="text-xs leading-tight text-muted-foreground">{roleLabel}</p>}
            </div>
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>{name}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {firebaseReady ? (
            <DropdownMenuItem onClick={handleSignOut} destructive>
              <LogOut className="h-4 w-4" />
              {t.nav.logout}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled>
              <UserIcon className="h-4 w-4" />
              {t.auth.notConfigured}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
