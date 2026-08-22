"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale, formatDate } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRepositoryList } from "@/hooks/useRepositoryList";
import { incomesRepository } from "@/lib/repositories";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import type { Income } from "@/domain/schema/finance";
import { IncomeFormDialog } from "@/components/finance/IncomeFormDialog";

export default function IncomePage() {
  const { t } = useLocale();
  const { can } = useAuth();
  const { data: incomes } = useRepositoryList(incomesRepository);
  const [formOpen, setFormOpen] = useState(false);

  const canWrite = can("finance:write");
  const totalShown = incomes.filter((i) => !i.isArchived).reduce((s, i) => s + i.amount, 0);

  const columns: DataTableColumn<Income>[] = [
    { key: "date", header: t.common.date, cell: (i) => formatDate(i.date) },
    { key: "category", header: t.finance.income.fundCategory, cell: (i) => <Badge variant="brand">{t.finance.income.categories[i.fundCategory as keyof typeof t.finance.income.categories] ?? i.fundCategory}</Badge> },
    { key: "source", header: t.finance.income.source, cell: (i) => i.sourceName || "—" },
    { key: "description", header: t.common.description, cell: (i) => <span className="text-muted-foreground">{i.description || "—"}</span> },
    { key: "amount", header: t.common.amount, cell: (i) => <Money amount={i.amount} className="font-semibold" /> },
  ];

  return (
    <RequirePermission permission="finance:read">
      <PageHeader
        title={t.finance.income.title}
        subtitle={`${t.finance.income.subtitle} — ${t.common.total}: ${totalShown.toLocaleString("en-US")}`}
        actions={
          canWrite && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              {t.finance.income.addIncome}
            </Button>
          )
        }
      />

      <DataTable
        data={incomes.filter((i) => !i.isArchived)}
        columns={columns}
        searchFields={(i) => [i.sourceName, i.description, i.reference]}
        emptyDescription={t.finance.income.subtitle}
      />

      <IncomeFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </RequirePermission>
  );
}
