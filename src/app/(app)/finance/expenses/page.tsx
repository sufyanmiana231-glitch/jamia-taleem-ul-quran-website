"use client";

import { useMemo, useState } from "react";
import { Plus, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale, formatDate, todayISO } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/toast";
import { useRepositoryList } from "@/hooks/useRepositoryList";
import { expensesRepository, expenseCategoriesRepository, studentsRepository, teachersRepository } from "@/lib/repositories";
import { markExpensePaid } from "@/lib/services/finance-service";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import type { Expense } from "@/domain/schema/finance";
import { ExpenseFormDialog } from "@/components/finance/ExpenseFormDialog";

export default function ExpensesPage() {
  const { t } = useLocale();
  const { firebaseUser, can } = useAuth();
  const { toast } = useToast();
  const { data: expenses } = useRepositoryList(expensesRepository);
  const { data: categories } = useRepositoryList(expenseCategoriesRepository);
  const { data: students } = useRepositoryList(studentsRepository);
  const { data: teachers } = useRepositoryList(teachersRepository);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);

  const canWrite = can("finance:write");

  const filtered = useMemo(
    () =>
      expenses.filter((e) => {
        if (e.isArchived) return false;
        if (categoryFilter !== "all" && e.categoryId !== categoryFilter) return false;
        if (statusFilter !== "all" && e.status !== statusFilter) return false;
        return true;
      }),
    [expenses, categoryFilter, statusFilter],
  );

  const handleMarkPaid = async (expense: Expense) => {
    if (!firebaseUser) return;
    try {
      await markExpensePaid(
        expense.id,
        {
          amount: expense.amount,
          categoryId: expense.categoryId,
          description: expense.description,
          linkedStudentId: expense.linkedStudentId,
          linkedTeacherId: expense.linkedTeacherId,
          paymentMethod: expense.paymentMethod,
          reference: expense.reference,
        },
        todayISO(),
        firebaseUser.uid,
      );
      toast({ title: t.common.successSaved, variant: "success" });
    } catch {
      toast({ title: t.common.errorGeneric, variant: "danger" });
    }
  };

  const columns: DataTableColumn<Expense>[] = [
    { key: "date", header: t.finance.expenses.billDate, cell: (e) => formatDate(e.billDate) },
    { key: "category", header: t.finance.expenses.category, cell: (e) => categories.find((c) => c.id === e.categoryId)?.name ?? "—" },
    { key: "description", header: t.common.description, cell: (e) => <span className="text-muted-foreground">{e.description}</span> },
    { key: "amount", header: t.common.amount, cell: (e) => <Money amount={e.amount} className="font-semibold" /> },
    {
      key: "status",
      header: t.common.status,
      cell: (e) => <Badge variant={e.status === "paid" ? "success" : "warning"}>{t.finance.expenses.status[e.status]}</Badge>,
    },
  ];

  if (canWrite) {
    columns.push({
      key: "actions",
      header: t.common.actions,
      className: "text-left",
      cell: (e) =>
        e.status === "pending" && (
          <Button
            size="sm"
            variant="outline"
            onClick={(ev) => {
              ev.stopPropagation();
              handleMarkPaid(e);
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
            {t.finance.expenses.status.paid}
          </Button>
        ),
    });
  }

  return (
    <RequirePermission permission="finance:read">
      <PageHeader
        title={t.finance.expenses.title}
        subtitle={t.finance.expenses.subtitle}
        actions={
          canWrite && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              {t.finance.expenses.addExpense}
            </Button>
          )
        }
      />

      <DataTable
        data={filtered}
        columns={columns}
        searchFields={(e) => [e.description, e.reference]}
        emptyDescription={t.finance.expenses.subtitle}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}</SelectItem>
                <SelectItem value="paid">{t.finance.expenses.status.paid}</SelectItem>
                <SelectItem value="pending">{t.finance.expenses.status.pending}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <ExpenseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories.filter((c) => !c.isArchived)}
        students={students.filter((s) => !s.isArchived)}
        teachers={teachers.filter((tr) => !tr.isArchived)}
      />
    </RequirePermission>
  );
}
