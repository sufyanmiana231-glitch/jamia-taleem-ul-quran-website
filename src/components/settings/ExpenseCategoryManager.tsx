"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Plus, Archive, ArchiveRestore } from "lucide-react";
import { expenseCategoryFormSchema, type ExpenseCategory, type ExpenseGroup } from "@/domain/schema/finance";
import { expenseCategoriesRepository } from "@/lib/repositories";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/Field";

type FormValues = z.input<typeof expenseCategoryFormSchema>;
const GROUPS: ExpenseGroup[] = ["utilities", "kitchen", "student", "salary", "other"];

export function ExpenseCategoryManager({ categories, canWrite }: { categories: ExpenseCategory[]; canWrite: boolean }) {
  const { t } = useLocale();
  const { firebaseUser } = useAuth();
  const { toast } = useToast();
  const [showArchived, setShowArchived] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(expenseCategoryFormSchema),
    defaultValues: { name: "", group: "other" },
  });

  const group = watch("group");

  const onSubmit: SubmitHandler<FormValues> = async (raw) => {
    if (!firebaseUser) return;
    const values = expenseCategoryFormSchema.parse(raw);
    try {
      await expenseCategoriesRepository.create({ ...values, isDefault: false }, firebaseUser.uid);
      toast({ title: t.common.successSaved, variant: "success" });
      reset();
    } catch {
      toast({ title: t.common.errorGeneric, variant: "danger" });
    }
  };

  const visible = categories.filter((c) => c.isArchived === showArchived);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.settings.expenseCategories}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canWrite && (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-3">
            <Field label={t.finance.expenses.category} error={errors.name?.message} className="min-w-40 flex-1">
              <Input {...register("name")} />
            </Field>
            <Field label={t.common.category} className="w-40">
              <Select value={group} onValueChange={(v) => setValue("group", v as ExpenseGroup)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUPS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {t.finance.expenses.groups[g]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Button type="submit" disabled={isSubmitting}>
              <Plus className="h-4 w-4" />
              {t.finance.expenses.addCategory}
            </Button>
          </form>
        )}

        <div className="flex items-center gap-2 text-xs">
          <button className={showArchived ? "text-muted-foreground" : "font-medium text-brand"} onClick={() => setShowArchived(false)}>
            {t.common.active}
          </button>
          <span className="text-muted-foreground">·</span>
          <button className={showArchived ? "font-medium text-brand" : "text-muted-foreground"} onClick={() => setShowArchived(true)}>
            {t.common.archive}
          </button>
        </div>

        <div className="flex flex-col divide-y divide-border rounded-md border border-border">
          {visible.length === 0 && <p className="p-4 text-sm text-muted-foreground">{t.common.noData}</p>}
          {visible.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{c.name}</span>
                <Badge variant="outline">{t.finance.expenses.groups[c.group]}</Badge>
              </div>
              {canWrite && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    if (!firebaseUser) return;
                    await expenseCategoriesRepository.setArchived(c.id, !c.isArchived, firebaseUser.uid);
                  }}
                >
                  {c.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
