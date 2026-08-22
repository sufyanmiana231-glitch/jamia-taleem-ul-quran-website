"use client";

import { useMemo, useState } from "react";
import { Plus, HandCoins } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale, formatDate } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRepositoryList } from "@/hooks/useRepositoryList";
import { teachersRepository, teacherLoansRepository } from "@/lib/repositories";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import type { TeacherLoan } from "@/domain/schema/teacher";
import { TeacherLoanDialog } from "@/components/teachers/TeacherLoanDialog";
import { LoanRepaymentDialog } from "@/components/teachers/LoanRepaymentDialog";

export default function LoansPage() {
  const { t } = useLocale();
  const { can } = useAuth();
  const { data: teachers } = useRepositoryList(teachersRepository);
  const { data: loans } = useRepositoryList(teacherLoansRepository);

  const [issueOpen, setIssueOpen] = useState(false);
  const [repayTarget, setRepayTarget] = useState<TeacherLoan | null>(null);
  const canWrite = can("finance:write");

  const rows = useMemo(() => loans.filter((l) => !l.isArchived), [loans]);
  const totalOutstanding = rows.reduce((s, l) => s + l.outstandingAmount, 0);

  const columns: DataTableColumn<TeacherLoan>[] = [
    {
      key: "teacher",
      header: t.teachers.title,
      cell: (l) => {
        const teacher = teachers.find((tr) => tr.id === l.teacherId);
        return teacher ? (
          <a href={`/teachers/${teacher.id}`} className="font-medium hover:underline">
            {teacher.fullName}
          </a>
        ) : (
          "—"
        );
      },
    },
    { key: "type", header: t.common.category, cell: (l) => t.teachers.loan.type[l.type] },
    { key: "date", header: t.teachers.loan.issueDate, cell: (l) => formatDate(l.issueDate) },
    { key: "amount", header: t.teachers.loan.amount, cell: (l) => <Money amount={l.amount} /> },
    { key: "outstanding", header: t.teachers.loan.outstanding, cell: (l) => <Money amount={l.outstandingAmount} className={!l.isSettled ? "font-semibold text-warning" : ""} /> },
    { key: "status", header: t.common.status, cell: (l) => <Badge variant={l.isSettled ? "success" : "warning"}>{l.isSettled ? t.common.active : t.finance.expenses.status.pending}</Badge> },
  ];

  if (canWrite) {
    columns.push({
      key: "actions",
      header: t.common.actions,
      className: "text-left",
      cell: (l) =>
        !l.isSettled && (
          <Button size="sm" variant="outline" onClick={() => setRepayTarget(l)}>
            <HandCoins className="h-4 w-4" />
            {t.teachers.loan.repay}
          </Button>
        ),
    });
  }

  return (
    <RequirePermission permission="finance:read">
      <PageHeader
        title={t.finance.loans.title}
        subtitle={`${t.finance.loans.subtitle} — ${t.dashboard.outstandingLoans}: `}
        actions={
          canWrite && (
            <Button onClick={() => setIssueOpen(true)}>
              <Plus className="h-4 w-4" />
              {t.teachers.loan.addLoan}
            </Button>
          )
        }
      />
      <p className="-mt-3 mb-4 text-sm text-muted-foreground">
        {t.dashboard.outstandingLoans}: <Money amount={totalOutstanding} className="font-semibold text-foreground" />
      </p>

      <DataTable
        data={rows}
        columns={columns}
        searchFields={(l) => [teachers.find((tr) => tr.id === l.teacherId)?.fullName ?? ""]}
        emptyDescription={t.finance.loans.subtitle}
      />

      <TeacherLoanDialog open={issueOpen} onOpenChange={setIssueOpen} teachers={teachers.filter((tr) => !tr.isArchived)} />

      {repayTarget && (
        <LoanRepaymentDialog
          open={!!repayTarget}
          onOpenChange={(open) => !open && setRepayTarget(null)}
          loanId={repayTarget.id}
          teacherId={repayTarget.teacherId}
          outstandingAmount={repayTarget.outstandingAmount}
        />
      )}
    </RequirePermission>
  );
}
