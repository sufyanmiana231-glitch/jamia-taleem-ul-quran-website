"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ExportButton } from "@/components/shared/ExportButton";
import { Money } from "@/components/shared/Money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, TrendingUp, TrendingDown, GraduationCap, Users, Landmark } from "lucide-react";
import { useLocale, formatDate, formatCurrency } from "@/lib/i18n";
import { useRepositoryList } from "@/hooks/useRepositoryList";
import {
  ledgerRepository,
  studentsRepository,
  teachersRepository,
  schoolClassesRepository,
  expenseCategoriesRepository,
  salaryPaymentsRepository,
  teacherLoansRepository,
  welfareSupportRepository,
  budgetsRepository,
} from "@/lib/repositories";
import { studentAttendanceRepository, teacherAttendanceRepository } from "@/lib/repositories/attendance";
import {
  computeBalance,
  computeBudgetUsage,
  computeExpensesByCategory,
  computeAttendancePercentage,
  sumEntriesInRange,
} from "@/lib/services/finance-calculations";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import type { StudentAttendanceDay } from "@/domain/schema/attendance";

function monthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function ReportsPage() {
  const { t } = useLocale();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: ledger } = useRepositoryList(ledgerRepository);
  const { data: students } = useRepositoryList(studentsRepository);
  const { data: teachers } = useRepositoryList(teachersRepository);
  const { data: classes } = useRepositoryList(schoolClassesRepository);
  const { data: categories } = useRepositoryList(expenseCategoriesRepository);
  const { data: salaryPayments } = useRepositoryList(salaryPaymentsRepository);
  const { data: loans } = useRepositoryList(teacherLoansRepository);
  const { data: welfare } = useRepositoryList(welfareSupportRepository);
  const { data: budgets } = useRepositoryList(budgetsRepository);

  const [studentDays, setStudentDays] = useState<StudentAttendanceDay[]>([]);
  useEffect(() => studentAttendanceRepository.subscribeAllDays(setStudentDays), []);
  const { data: teacherDays } = useRepositoryList(teacherAttendanceRepository);

  const rangeEntries = useMemo(() => sumEntriesInRange(ledger, from, to), [ledger, from, to]);
  const balance = computeBalance(ledger);
  const totalIncomeRange = rangeEntries.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const totalExpenseRange = rangeEntries.filter((e) => e.type === "expense" || e.type === "salary_payment").reduce((s, e) => s + e.amount, 0);

  const expenseByCategory = useMemo(() => {
    const map = computeExpensesByCategory(rangeEntries);
    return Object.entries(map)
      .map(([categoryId, amount]) => ({ name: categories.find((c) => c.id === categoryId)?.name ?? categoryId, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [rangeEntries, categories]);

  const fundSourceReport = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of rangeEntries) {
      if (e.type !== "income" || !e.fundCategory) continue;
      map[e.fundCategory] = (map[e.fundCategory] ?? 0) + e.amount;
    }
    return Object.entries(map).map(([category, amount]) => ({
      name: t.finance.income.categories[category as keyof typeof t.finance.income.categories] ?? category,
      amount,
    }));
  }, [rangeEntries, t]);

  const budgetPeriod = from.slice(0, 7);
  const budgetVsActual = useMemo(() => {
    const spentMap = computeExpensesByCategory(ledger.filter((e) => e.date.startsWith(budgetPeriod)));
    return categories
      .filter((c) => !c.isArchived)
      .map((c) => {
        const budget = budgets.find((b) => b.categoryId === c.id && b.period === budgetPeriod);
        const usage = computeBudgetUsage(budget?.allocatedAmount ?? 0, spentMap[c.id] ?? 0);
        return { name: c.name, ...usage };
      })
      .filter((r) => r.allocatedAmount > 0 || r.spentAmount > 0);
  }, [categories, budgets, ledger, budgetPeriod]);

  const salaryPaymentsRange = useMemo(
    () => salaryPayments.filter((p) => p.lastPaymentDate && p.lastPaymentDate >= from && p.lastPaymentDate <= to),
    [salaryPayments, from, to],
  );

  const outstandingLoans = useMemo(() => loans.filter((l) => !l.isSettled && !l.isArchived), [loans]);

  const welfareRange = useMemo(() => welfare.filter((w) => w.date >= from && w.date <= to), [welfare, from, to]);

  const activeStudents = students.filter((s) => !s.isArchived);
  const activeTeachers = teachers.filter((tr) => !tr.isArchived);
  const newAdmissionsRange = students.filter((s) => s.admissionDate >= from && s.admissionDate <= to);

  const studentsByClass = useMemo(
    () =>
      classes
        .filter((c) => !c.isArchived)
        .map((c) => ({ name: c.name, count: activeStudents.filter((s) => s.classId === c.id).length }))
        .filter((r) => r.count > 0),
    [classes, activeStudents],
  );

  const studentAttendanceByClass = useMemo(() => {
    const daysInRange = studentDays.filter((d) => d.date >= from && d.date <= to);
    return classes
      .filter((c) => !c.isArchived)
      .map((c) => {
        const classDays = daysInRange.filter((d) => d.classId === c.id);
        const entries = classDays.flatMap((d) => Object.values(d.records));
        const present = entries.filter((e) => e.status === "present" || e.status === "late").length;
        return { name: c.name, percentage: computeAttendancePercentage(present, entries.length), marked: entries.length };
      })
      .filter((r) => r.marked > 0);
  }, [studentDays, classes, from, to]);

  const teacherAttendanceSummary = useMemo(() => {
    const daysInRange = teacherDays.filter((d) => d.date >= from && d.date <= to);
    return activeTeachers
      .map((tr) => {
        const entries = daysInRange.map((d) => d.records[tr.id]).filter(Boolean);
        const present = entries.filter((e) => e.status === "present" || e.status === "late").length;
        return { name: tr.fullName, percentage: computeAttendancePercentage(present, entries.length), marked: entries.length };
      })
      .filter((r) => r.marked > 0);
  }, [teacherDays, activeTeachers, from, to]);

  return (
    <RequirePermission permission="reports:read">
      <PageHeader title={t.reports.title} subtitle={t.reports.subtitle} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">{t.common.from}</label>
          <Input type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">{t.common.to}</label>
          <Input type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
        </div>
      </div>

      <Tabs defaultValue="financial" dir="rtl">
        <TabsList>
          <TabsTrigger value="financial">{t.reports.financial}</TabsTrigger>
          <TabsTrigger value="students">{t.reports.studentReports}</TabsTrigger>
          <TabsTrigger value="teachers">{t.reports.teacherReports}</TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label={t.dashboard.currentBalance} value={formatCurrency(balance)} icon={Wallet} tone="brand" />
            <StatCard label={t.dashboard.monthIncome} value={formatCurrency(totalIncomeRange)} icon={TrendingUp} tone="success" />
            <StatCard label={t.dashboard.monthExpenses} value={formatCurrency(totalExpenseRange)} icon={TrendingDown} tone="danger" />
            <StatCard label={t.dashboard.outstandingLoans} value={formatCurrency(outstandingLoans.reduce((s, l) => s + l.outstandingAmount, 0))} icon={Landmark} tone="info" />
          </div>

          <ReportTable
            title={t.reports.expenseByCategory}
            rows={expenseByCategory}
            columns={[
              { key: "name", header: t.common.category },
              { key: "amount", header: t.common.amount, money: true },
            ]}
            filename="expense-by-category"
          />

          <ReportTable
            title={t.reports.fundSourceReport}
            rows={fundSourceReport}
            columns={[
              { key: "name", header: t.finance.income.fundCategory },
              { key: "amount", header: t.common.amount, money: true },
            ]}
            filename="fund-source-report"
          />

          <ReportTable
            title={`${t.reports.budgetVsActual} (${budgetPeriod})`}
            rows={budgetVsActual.map((r) => ({ name: r.name, allocated: r.allocatedAmount, spent: r.spentAmount, remaining: r.remaining }))}
            columns={[
              { key: "name", header: t.common.category },
              { key: "allocated", header: t.finance.budgets.allocated, money: true },
              { key: "spent", header: t.finance.budgets.spent, money: true },
              { key: "remaining", header: t.finance.budgets.remaining, money: true },
            ]}
            filename="budget-vs-actual"
          />

          <ReportTable
            title={t.finance.salaries.title}
            rows={salaryPaymentsRange.map((p) => ({
              name: teachers.find((tr) => tr.id === p.teacherId)?.fullName ?? p.teacherId,
              period: p.period,
              paid: p.paidAmount,
            }))}
            columns={[
              { key: "name", header: t.teachers.fullName },
              { key: "period", header: t.teachers.payment.period },
              { key: "paid", header: t.teachers.payment.paid, money: true },
            ]}
            filename="salary-payments"
          />

          <ReportTable
            title={t.finance.loans.title}
            rows={outstandingLoans.map((l) => ({
              name: teachers.find((tr) => tr.id === l.teacherId)?.fullName ?? l.teacherId,
              date: formatDate(l.issueDate),
              outstanding: l.outstandingAmount,
            }))}
            columns={[
              { key: "name", header: t.teachers.fullName },
              { key: "date", header: t.teachers.loan.issueDate },
              { key: "outstanding", header: t.teachers.loan.outstanding, money: true },
            ]}
            filename="outstanding-loans"
          />

          <ReportTable
            title={t.reports.welfareReport}
            rows={welfareRange.map((w) => ({
              name: students.find((s) => s.id === w.studentId)?.fullName ?? w.studentId,
              date: formatDate(w.date),
              category: categories.find((c) => c.id === w.categoryId)?.name ?? w.categoryId,
              amount: w.amount,
            }))}
            columns={[
              { key: "name", header: t.students.fullName },
              { key: "date", header: t.common.date },
              { key: "category", header: t.common.category },
              { key: "amount", header: t.common.amount, money: true },
            ]}
            filename="student-welfare-report"
          />
        </TabsContent>

        <TabsContent value="students" className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label={t.dashboard.totalStudents} value={String(activeStudents.length)} icon={GraduationCap} tone="brand" />
            <StatCard label={t.dashboard.newAdmissions} value={String(newAdmissionsRange.length)} icon={GraduationCap} tone="success" />
          </div>

          <ReportTable
            title={t.classes.title}
            rows={studentsByClass}
            columns={[
              { key: "name", header: t.classes.className },
              { key: "count", header: t.classes.totalStudents },
            ]}
            filename="students-by-class"
          />

          <ReportTable
            title={t.attendance.students}
            rows={studentAttendanceByClass.map((r) => ({ name: r.name, percentage: `${Math.round(r.percentage)}%` }))}
            columns={[
              { key: "name", header: t.classes.className },
              { key: "percentage", header: t.attendance.attendancePercentage },
            ]}
            filename="student-attendance-by-class"
          />

          <ReportTable
            title={t.reports.welfareReport}
            rows={welfareRange.map((w) => ({
              name: students.find((s) => s.id === w.studentId)?.fullName ?? w.studentId,
              date: formatDate(w.date),
              amount: w.amount,
            }))}
            columns={[
              { key: "name", header: t.students.fullName },
              { key: "date", header: t.common.date },
              { key: "amount", header: t.common.amount, money: true },
            ]}
            filename="student-support-history"
          />
        </TabsContent>

        <TabsContent value="teachers" className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label={t.dashboard.totalTeachers} value={String(activeTeachers.length)} icon={Users} tone="brand" />
          </div>

          <ReportTable
            title={t.finance.salaries.title}
            rows={salaryPaymentsRange.map((p) => ({
              name: teachers.find((tr) => tr.id === p.teacherId)?.fullName ?? p.teacherId,
              period: p.period,
              paid: p.paidAmount,
            }))}
            columns={[
              { key: "name", header: t.teachers.fullName },
              { key: "period", header: t.teachers.payment.period },
              { key: "paid", header: t.teachers.payment.paid, money: true },
            ]}
            filename="teacher-salary-payments"
          />

          <ReportTable
            title={t.finance.loans.title}
            rows={outstandingLoans.map((l) => ({
              name: teachers.find((tr) => tr.id === l.teacherId)?.fullName ?? l.teacherId,
              outstanding: l.outstandingAmount,
            }))}
            columns={[
              { key: "name", header: t.teachers.fullName },
              { key: "outstanding", header: t.teachers.loan.outstanding, money: true },
            ]}
            filename="teacher-loans"
          />

          <ReportTable
            title={t.attendance.teachers}
            rows={teacherAttendanceSummary.map((r) => ({ name: r.name, percentage: `${Math.round(r.percentage)}%` }))}
            columns={[
              { key: "name", header: t.teachers.fullName },
              { key: "percentage", header: t.attendance.attendancePercentage },
            ]}
            filename="teacher-attendance"
          />
        </TabsContent>
      </Tabs>
    </RequirePermission>
  );
}

function ReportTable({
  title,
  rows,
  columns,
  filename,
}: {
  title: string;
  rows: Record<string, string | number>[];
  columns: { key: string; header: string; money?: boolean }[];
  filename: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <ExportButton filename={filename} rows={rows} />
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState title="" description="—" />
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {rows.map((row, i) => (
              <div key={i} className="grid gap-2 p-3 text-sm" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
                {columns.map((col) => (
                  <span key={col.key} className={col.money ? "font-medium" : ""}>
                    {col.money ? <Money amount={Number(row[col.key])} /> : row[col.key]}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
