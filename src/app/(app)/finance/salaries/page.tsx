"use client";

import { useMemo, useState } from "react";
import { Banknote } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLocale, formatMonth, currentPeriod } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRepositoryList } from "@/hooks/useRepositoryList";
import { teachersRepository, salaryPaymentsRepository } from "@/lib/repositories";
import { computeSalaryRemaining, computeSalaryStatus } from "@/lib/services/finance-calculations";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import type { Teacher } from "@/domain/schema/teacher";
import { SalaryPaymentDialog } from "@/components/teachers/SalaryPaymentDialog";

interface Row {
  id: string;
  teacher: Teacher;
  expected: number;
  paid: number;
  remaining: number;
  status: "pending" | "partial" | "paid";
}

export default function SalariesPage() {
  const { t } = useLocale();
  const { can } = useAuth();
  const { data: teachers } = useRepositoryList(teachersRepository);
  const { data: payments } = useRepositoryList(salaryPaymentsRepository);

  const [period, setPeriod] = useState(currentPeriod());
  const [payTarget, setPayTarget] = useState<Row | null>(null);
  const canWrite = can("finance:write");

  const rows: Row[] = useMemo(() => {
    return teachers
      .filter((tr) => !tr.isArchived)
      .map((teacher) => {
        const payment = payments.find((p) => p.teacherId === teacher.id && p.period === period);
        const paid = payment?.paidAmount ?? 0;
        return {
          id: teacher.id,
          teacher,
          expected: teacher.currentSalary,
          paid,
          remaining: computeSalaryRemaining(teacher.currentSalary, paid),
          status: computeSalaryStatus(teacher.currentSalary, paid),
        };
      });
  }, [teachers, payments, period]);

  const columns: DataTableColumn<Row>[] = [
    { key: "name", header: t.teachers.fullName, cell: (r) => <a href={`/teachers/${r.teacher.id}`} className="font-medium hover:underline">{r.teacher.fullName}</a> },
    { key: "expected", header: t.teachers.payment.expected, cell: (r) => <Money amount={r.expected} /> },
    { key: "paid", header: t.teachers.payment.paid, cell: (r) => <Money amount={r.paid} /> },
    { key: "remaining", header: t.teachers.payment.remaining, cell: (r) => <Money amount={r.remaining} className={r.remaining > 0 ? "font-semibold text-warning" : ""} /> },
    {
      key: "status",
      header: t.common.status,
      cell: (r) => (
        <Badge variant={r.status === "paid" ? "success" : r.status === "partial" ? "warning" : "danger"}>{t.teachers.payment.status[r.status]}</Badge>
      ),
    },
  ];

  if (canWrite) {
    columns.push({
      key: "actions",
      header: t.common.actions,
      className: "text-left",
      cell: (r) =>
        r.remaining > 0 && (
          <Button size="sm" onClick={() => setPayTarget(r)}>
            <Banknote className="h-4 w-4" />
            {t.finance.salaries.recordPayment}
          </Button>
        ),
    });
  }

  return (
    <RequirePermission permission="finance:read">
      <PageHeader title={t.finance.salaries.title} subtitle={t.finance.salaries.subtitle} />

      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium">{t.teachers.payment.period}</label>
        <Input type="month" dir="ltr" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-44" />
        <span className="text-sm text-muted-foreground">{formatMonth(period)}</span>
      </div>

      <DataTable data={rows} columns={columns} searchFields={(r) => [r.teacher.fullName]} emptyDescription={t.finance.salaries.subtitle} />

      {payTarget && (
        <SalaryPaymentDialog
          open={!!payTarget}
          onOpenChange={(open) => !open && setPayTarget(null)}
          teacherId={payTarget.teacher.id}
          expectedAmount={payTarget.expected}
          remaining={payTarget.remaining}
        />
      )}
    </RequirePermission>
  );
}
