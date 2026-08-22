"use client";

import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { budgetFormSchema, type BudgetFormInput, type ExpenseCategory } from "@/domain/schema/finance";
import { budgetsRepository } from "@/lib/repositories";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale, currentPeriod } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/Field";

type FormValues = z.input<typeof budgetFormSchema>;

export function BudgetFormDialog({
  open,
  onOpenChange,
  categories,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ExpenseCategory[];
  initial?: { categoryId: string; period: string; allocatedAmount: number };
}) {
  const { t } = useLocale();
  const { firebaseUser } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: initial ?? { categoryId: "", period: currentPeriod(), allocatedAmount: 0 },
  });

  useEffect(() => {
    reset(initial ?? { categoryId: "", period: currentPeriod(), allocatedAmount: 0 });
  }, [initial, open, reset]);

  const categoryId = watch("categoryId");

  const onSubmit: SubmitHandler<FormValues> = async (raw) => {
    if (!firebaseUser) return;
    const values: BudgetFormInput = budgetFormSchema.parse(raw);
    try {
      await budgetsRepository.upsert(values.categoryId, values.period, values.allocatedAmount, firebaseUser.uid);
      toast({ title: t.common.successSaved, variant: "success" });
      reset();
      onOpenChange(false);
    } catch {
      toast({ title: t.common.errorGeneric, variant: "danger" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.finance.budgets.addBudget}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label={t.finance.expenses.category} required error={errors.categoryId?.message}>
            <Select value={categoryId} onValueChange={(v) => setValue("categoryId", v)}>
              <SelectTrigger>
                <SelectValue placeholder={t.common.selectPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t.finance.budgets.period} required error={errors.period?.message}>
            <Input type="month" dir="ltr" {...register("period")} />
          </Field>
          <Field label={t.finance.budgets.allocated} required error={errors.allocatedAmount?.message}>
            <Input type="number" dir="ltr" min={0} {...register("allocatedAmount", { valueAsNumber: true })} />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {t.common.save}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
