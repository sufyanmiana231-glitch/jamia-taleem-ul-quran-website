"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, BookOpenText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getNavGroups, type NavGroup } from "./nav-config";

function isActive(pathname: string, href?: string) {
  if (!href) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function GroupLink({ group, pathname }: { group: NavGroup; pathname: string }) {
  const active = isActive(pathname, group.href) || group.children?.some((c) => isActive(pathname, c.href));
  const [open, setOpen] = useState(Boolean(active));
  const Icon = group.icon;

  if (!group.children) {
    return (
      <Link
        href={group.href!}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active ? "bg-brand-soft text-brand" : "text-foreground hover:bg-surface-muted",
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="truncate">{group.label}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active ? "text-brand" : "text-foreground hover:bg-surface-muted",
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="flex-1 truncate text-start">{group.label}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="me-3 mt-1 flex flex-col gap-0.5 border-e border-border pe-3">
          {group.children.map((child) => {
            const childActive = isActive(pathname, child.href);
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  childActive ? "bg-brand-soft font-medium text-brand" : "text-muted-foreground hover:bg-surface-muted",
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ className }: { className?: string }) {
  const { t } = useLocale();
  const { can } = useAuth();
  const pathname = usePathname();
  const groups = getNavGroups(t).filter((g) => can(g.permission));

  return (
    <aside className={cn("flex w-64 shrink-0 flex-col gap-1 border-e border-border bg-surface p-3", className)}>
      <div className="flex items-center gap-2 px-2 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground">
          <BookOpenText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{t.app.name}</p>
          <p className="truncate text-xs text-muted-foreground">{t.app.systemName}</p>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5">
        {groups.map((group) => (
          <GroupLink key={group.label} group={group} pathname={pathname} />
        ))}
      </nav>
    </aside>
  );
}
