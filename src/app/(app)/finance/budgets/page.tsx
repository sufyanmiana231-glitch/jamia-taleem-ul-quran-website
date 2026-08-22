"use client";

import { useMemo, useState } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Money } from "@/components/shared/Money";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useLocale, formatMonth } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRepositoryList } from "@/hooks/useRepositoryList";
import { budgetsRepository, expenseCategoriesRepository, ledgerRepository } from "@/lib/repositories";
import { computeBudgetUsage, computeExpensesByCategory } from "@/lib/services/finance-calculations";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { BudgetFormDialog } from "@/components/finance/BudgetFormDialog";

export default function BudgetsPage() {
  const { t } = useLocale();
  const { can } = useAuth();
  const { data: budgets } = useRepositoryList(budgetsRepository);
  const { data: categories } = useRepositoryList(expenseCategoriesRepository);
  const { data: ledger } = useRepositoryList(ledgerRepository);

  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<{ categoryId: string; period: string; allocatedAmount: number } | undefined>(undefined);

  const canWrite = can("finance:write");
  const activeCategories = categories.filter((c) => !c.isArchived);

  const spentByCategory = useMemo(() => {
    const entriesInPeriod = ledger.filter((e) => e.date.startsWith(period));
    return computeExpensesByCategory(entriesInPeriod);
  }, [ledger, period]);

  const rows = useMemo(
    () =>
      activeCategories.map((c) => {
        const budget = budgets.find((b) => b.categoryId === c.id && b.period === period);
        const spent = spentByCategory[c.id] ?? 0;
        const usage = computeBudgetUsage(budget?.allocatedAmount ?? 0, spent);
        return { category: c, budget, usage };
      }),
    [activeCategories, budgets, spentByCategory, period],
  );

  return (
    <RequirePermission permission="finance:read">
      <PageHeader
        title={t.finance.budgets.title}
        subtitle={t.finance.budgets.subtitle}
        actions={
          canWrite && (
            <Button
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {t.finance.budgets.addBudget}
            </Button>
          )
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium">{t.finance.budgets.period}</label>
        <Input type="month" dir="ltr" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-44" />
        <span className="text-sm text-muted-foreground">{formatMonth(period)}</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={t.common.noData} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ category, budget, usage }) => (
            <Card key={category.id}>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{category.name}</p>
                  {canWrite && (
                    <button
                      className="text-xs text-brand hover:underline"
                      onClick={() => {
                        setEditing({ categoryId: category.id, period, allocatedAmount: budget?.allocatedAmount ?? 0 });
                        setFormOpen(true);
                      }}
                    >
                      {t.common.edit}
                    </button>
                  )}
                </div>
                <Progress value={usage.percentUsed} tone={usage.isOverBudget ? "danger" : usage.isNearLimit ? "warning" : "brand"} />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {t.finance.budgets.spent}: <Money amount={usage.spentAmount} />
                  </span>
                  <span>
                    {t.finance.budgets.allocated}: <Money amount={usage.allocatedAmount} />
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.finance.budgets.remaining}</span>
                  <Money amount={usage.remaining} className={usage.remaining < 0 ? "font-semibold text-danger" : "font-semibold"} />
                </div>
                {usage.isOverBudget && (
                  <p className="flex items-center gap-1 text-xs text-danger">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t.finance.budgets.overBudgetWarning}
                  </p>
                )}
                {!usage.isOverBudget && usage.isNearLimit && (
                  <p className="flex items-center gap-1 text-xs text-warning">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t.finance.budgets.nearLimitWarning}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BudgetFormDialog open={formOpen} onOpenChange={setFormOpen} categories={activeCategories} initial={editing} />
    </RequirePermission>
  );
}
