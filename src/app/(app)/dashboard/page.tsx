"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale,
  Receipt,
  Banknote,
  Landmark,
  HandCoins,
  GraduationCap,
  Users,
  UserPlus,
  CalendarCheck,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Money } from "@/components/shared/Money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { useLocale, formatCurrency, formatDate, formatMonth, currentPeriod, recentMonths, todayISO } from "@/lib/i18n";
import { useRepositoryList } from "@/hooks/useRepositoryList";
import {
  ledgerRepository,
  studentsRepository,
  teachersRepository,
  expenseCategoriesRepository,
  expensesRepository,
  salaryPaymentsRepository,
  welfareSupportRepository,
} from "@/lib/repositories";
import { studentAttendanceRepository, teacherAttendanceRepository } from "@/lib/repositories/attendance";
import type { StudentAttendanceDay, TeacherAttendanceDay } from "@/domain/schema/attendance";
import {
  computeAttendancePercentage,
  computeBalance,
  computeExpensesByCategory,
  computeMonthlySeries,
  computeOutstandingLoansTotal,
  computeSalaryRemaining,
  computeTotalReceived,
  computeTotalSpent,
} from "@/lib/services/finance-calculations";
import { IncomeExpenseChart } from "@/components/charts/IncomeExpenseChart";
import { ExpensesByCategoryChart } from "@/components/charts/ExpensesByCategoryChart";
import { TrendChart } from "@/components/charts/TrendChart";

export default function DashboardPage() {
  const { t } = useLocale();
  const { data: ledger } = useRepositoryList(ledgerRepository);
  const { data: students } = useRepositoryList(studentsRepository);
  const { data: teachers } = useRepositoryList(teachersRepository);
  const { data: categories } = useRepositoryList(expenseCategoriesRepository);
  const { data: expenses } = useRepositoryList(expensesRepository);
  const { data: salaryPayments } = useRepositoryList(salaryPaymentsRepository);
  const { data: welfare } = useRepositoryList(welfareSupportRepository);

  const [studentAttendanceToday, setStudentAttendanceToday] = useState<StudentAttendanceDay[]>([]);
  const [teacherAttendanceToday, setTeacherAttendanceToday] = useState<TeacherAttendanceDay | null>(null);

  useEffect(() => studentAttendanceRepository.subscribeForDate(todayISO(), setStudentAttendanceToday), []);
  useEffect(() => teacherAttendanceRepository.subscribeDay(todayISO(), setTeacherAttendanceToday), []);

  const period = currentPeriod();
  const months = useMemo(() => recentMonths(6), []);

  const activeStudents = useMemo(() => students.filter((s) => !s.isArchived), [students]);
  const activeTeachers = useMemo(() => teachers.filter((t) => !t.isArchived), [teachers]);

  const balance = computeBalance(ledger);
  const totalReceived = computeTotalReceived(ledger);
  const totalSpent = computeTotalSpent(ledger);
  const outstandingLoans = computeOutstandingLoansTotal(ledger);

  const monthlySeries = useMemo(() => computeMonthlySeries(ledger, months), [ledger, months]);
  const currentMonthRow = monthlySeries[monthlySeries.length - 1];

  const pendingExpenses = useMemo(
    () => expenses.filter((e) => e.status === "pending" && !e.isArchived).reduce((s, e) => s + e.amount, 0),
    [expenses],
  );

  const salaryPaidThisMonth = useMemo(
    () => salaryPayments.filter((p) => p.period === period).reduce((s, p) => s + p.paidAmount, 0),
    [salaryPayments, period],
  );

  const salaryPayable = useMemo(() => {
    return activeTeachers.reduce((sum, teacher) => {
      const payment = salaryPayments.find((p) => p.teacherId === teacher.id && p.period === period);
      return sum + computeSalaryRemaining(teacher.currentSalary, payment?.paidAmount ?? 0);
    }, 0);
  }, [activeTeachers, salaryPayments, period]);

  const totalScholarships = useMemo(() => welfare.reduce((s, w) => s + w.amount, 0), [welfare]);

  const newAdmissions = useMemo(() => students.filter((s) => s.admissionDate.startsWith(period)).length, [students, period]);

  const studentAttendanceStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let total = 0;
    for (const day of studentAttendanceToday) {
      for (const entry of Object.values(day.records)) {
        total += 1;
        if (entry.status === "present" || entry.status === "late") present += 1;
        if (entry.status === "absent") absent += 1;
      }
    }
    return { present, absent, total, percentage: computeAttendancePercentage(present, total) };
  }, [studentAttendanceToday]);

  const teacherAttendanceStats = useMemo(() => {
    const records = teacherAttendanceToday ? Object.values(teacherAttendanceToday.records) : [];
    const present = records.filter((r) => r.status === "present" || r.status === "late").length;
    const absent = records.filter((r) => r.status === "absent").length;
    return { present, absent, total: records.length, percentage: computeAttendancePercentage(present, records.length) };
  }, [teacherAttendanceToday]);

  const expensesByCategoryData = useMemo(() => {
    const byCategory = computeExpensesByCategory(ledger);
    return Object.entries(byCategory).map(([categoryId, amount]) => ({
      name: categories.find((c) => c.id === categoryId)?.name ?? categoryId,
      amount,
    }));
  }, [ledger, categories]);

  const admissionsTrendData = useMemo(
    () =>
      months.map((m) => ({
        month: formatMonth(m).split(" ")[0],
        count: students.filter((s) => s.admissionDate.startsWith(m)).length,
      })),
    [months, students],
  );

  const salaryTrendData = useMemo(
    () => monthlySeries.map((row) => ({ month: formatMonth(row.period).split(" ")[0], amount: row.salary })),
    [monthlySeries],
  );

  const recentAdmissions = useMemo(
    () => [...students].sort((a, b) => b.admissionDate.localeCompare(a.admissionDate)).slice(0, 5),
    [students],
  );

  const recentExpenses = useMemo(
    () => [...expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [expenses],
  );

  const upcomingSalaries = useMemo(() => {
    return activeTeachers
      .map((teacher) => {
        const payment = salaryPayments.find((p) => p.teacherId === teacher.id && p.period === period);
        const remaining = computeSalaryRemaining(teacher.currentSalary, payment?.paidAmount ?? 0);
        return { teacher, remaining };
      })
      .filter((x) => x.remaining > 0)
      .sort((a, b) => b.remaining - a.remaining)
      .slice(0, 5);
  }, [activeTeachers, salaryPayments, period]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.dashboard.title} subtitle={t.dashboard.subtitle} />

      {/* Financial summary */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <StatCard label={t.dashboard.availableFunds} value={formatCurrency(balance)} icon={Wallet} tone="brand" caption={t.dashboard.balanceFormulaNote} />
        <StatCard label={t.dashboard.totalReceived} value={formatCurrency(totalReceived)} icon={TrendingUp} tone="success" />
        <StatCard label={t.dashboard.totalSpent} value={formatCurrency(totalSpent)} icon={TrendingDown} tone="danger" />
        <StatCard label={t.dashboard.monthIncome} value={formatCurrency(currentMonthRow?.income ?? 0)} icon={HandCoins} tone="success" />
        <StatCard label={t.dashboard.monthExpenses} value={formatCurrency((currentMonthRow?.expense ?? 0) + (currentMonthRow?.salary ?? 0))} icon={Receipt} tone="warning" />
        <StatCard label={t.dashboard.pendingExpenses} value={formatCurrency(pendingExpenses)} icon={Scale} tone="warning" />
        <StatCard label={t.dashboard.salaryPayable} value={formatCurrency(salaryPayable)} icon={Banknote} tone="gold" />
        <StatCard label={t.dashboard.salaryPaidThisMonth} value={formatCurrency(salaryPaidThisMonth)} icon={Banknote} tone="success" />
        <StatCard label={t.dashboard.outstandingLoans} value={formatCurrency(outstandingLoans)} icon={Landmark} tone="info" />
        <StatCard label={t.dashboard.totalScholarships} value={formatCurrency(totalScholarships)} icon={HandCoins} tone="info" />
      </section>

      {/* Operational summary */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <StatCard label={t.dashboard.totalStudents} value={String(activeStudents.length)} icon={GraduationCap} tone="brand" />
        <StatCard label={t.dashboard.newAdmissions} value={String(newAdmissions)} icon={UserPlus} tone="success" />
        <StatCard label={t.dashboard.totalTeachers} value={String(activeTeachers.length)} icon={Users} tone="brand" />
        <StatCard
          label={t.dashboard.studentAttendanceToday}
          value={studentAttendanceStats.total > 0 ? `${Math.round(studentAttendanceStats.percentage)}%` : "—"}
          icon={CalendarCheck}
          tone="success"
          caption={`${t.dashboard.studentsAbsentToday}: ${studentAttendanceStats.absent}`}
        />
        <StatCard
          label={t.dashboard.teacherAttendanceToday}
          value={teacherAttendanceStats.total > 0 ? `${Math.round(teacherAttendanceStats.percentage)}%` : "—"}
          icon={UserCheck}
          tone="success"
          caption={`${t.dashboard.teachersAbsentToday}: ${teacherAttendanceStats.absent}`}
        />
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.incomeVsExpenses}</CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeExpenseChart data={monthlySeries} incomeLabel={t.nav.income} expenseLabel={t.nav.expenses} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.expensesByCategory}</CardTitle>
          </CardHeader>
          <CardContent>
            {expensesByCategoryData.length === 0 ? (
              <EmptyState title={t.common.noData} />
            ) : (
              <ExpensesByCategoryChart data={expensesByCategoryData} otherLabel={t.finance.expenses.groups.other} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.admissionsTrend}</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={admissionsTrendData} xKey="month" yKey="count" variant="bar" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.salaryTrend}</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={salaryTrendData} xKey="month" yKey="amount" variant="bar" valueFormatter={formatCurrency} />
          </CardContent>
        </Card>
      </section>

      {/* Recent activity */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.recentAdmissions}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recentAdmissions.length === 0 ? (
              <EmptyState title={t.common.noData} />
            ) : (
              recentAdmissions.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.fullName}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(s.admissionDate)}</p>
                  </div>
                  <Badge variant="brand">{t.students.status[s.status]}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.recentExpenses}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recentExpenses.length === 0 ? (
              <EmptyState title={t.common.noData} />
            ) : (
              recentExpenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(e.billDate)}</p>
                  </div>
                  <Money amount={e.amount} className="font-semibold" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.upcomingSalaries}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {upcomingSalaries.length === 0 ? (
              <EmptyState title={t.common.noData} />
            ) : (
              upcomingSalaries.map(({ teacher, remaining }) => (
                <div key={teacher.id} className="flex items-center justify-between text-sm">
                  <p className="truncate font-medium">{teacher.fullName}</p>
                  <Money amount={remaining} className="font-semibold text-warning" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
