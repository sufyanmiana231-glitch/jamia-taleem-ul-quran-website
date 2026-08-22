import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  CalendarCheck,
  Wallet,
  BarChart3,
  Settings,
  HandCoins,
  Receipt,
  PiggyBank,
  Banknote,
  Landmark,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import type { Permission } from "@/lib/auth/roles";

export interface NavLeaf {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
}

export interface NavGroup {
  label: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
  href?: string;
  children?: NavLeaf[];
}

export function getNavGroups(t: Dictionary): NavGroup[] {
  return [
    { label: t.nav.dashboard, icon: LayoutDashboard, permission: "reports:read", href: "/dashboard" },
    { label: t.nav.students, icon: GraduationCap, permission: "students:read", href: "/students" },
    { label: t.nav.teachers, icon: Users, permission: "teachers:read", href: "/teachers" },
    { label: t.nav.classes, icon: BookOpen, permission: "classes:read", href: "/classes" },
    {
      label: t.nav.attendance,
      icon: CalendarCheck,
      permission: "attendance:read",
      children: [
        { href: "/attendance/students", label: t.attendance.students, icon: GraduationCap, permission: "attendance:read" },
        { href: "/attendance/teachers", label: t.attendance.teachers, icon: Users, permission: "attendance:read" },
      ],
    },
    {
      label: t.nav.finance,
      icon: Wallet,
      permission: "finance:read",
      children: [
        { href: "/finance/income", label: t.nav.income, icon: HandCoins, permission: "finance:read" },
        { href: "/finance/expenses", label: t.nav.expenses, icon: Receipt, permission: "finance:read" },
        { href: "/finance/budgets", label: t.nav.budgets, icon: PiggyBank, permission: "finance:read" },
        { href: "/finance/salaries", label: t.nav.salaries, icon: Banknote, permission: "finance:read" },
        { href: "/finance/loans", label: t.nav.loans, icon: Landmark, permission: "finance:read" },
      ],
    },
    { label: t.nav.reports, icon: BarChart3, permission: "reports:read", href: "/reports" },
    { label: t.nav.settings, icon: Settings, permission: "settings:read", href: "/settings" },
  ];
}
