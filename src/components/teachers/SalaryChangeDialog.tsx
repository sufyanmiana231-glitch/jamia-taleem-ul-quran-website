"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { salaryChangeFormSchema, type SalaryChangeFormInput } from "@/domain/schema/teacher";
import { changeTeacherSalary } from "@/lib/services/finance-service";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale, todayISO, formatCurrency } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/shared/Field";

type FormValues = z.input<typeof salaryChangeFormSchema>;

export function SalaryChangeDialog({
  open,
  onOpenChange,
  teacherId,
  currentSalary,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
  currentSalary: number;
}) {
  const { t } = useLocale();
  const { firebaseUser } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(salaryChangeFormSchema),
    defaultValues: { newSalary: currentSalary, effectiveDate: todayISO(), reason: "", notes: "" },
  });

  const onSubmit: SubmitHandler<FormValues> = async (raw) => {
    if (!firebaseUser) return;
    const values: SalaryChangeFormInput = salaryChangeFormSchema.parse(raw);
    try {
      await changeTeacherSalary(teacherId, currentSalary, values, firebaseUser.uid);
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
          <DialogTitle>{t.teachers.salaryChange.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t.teachers.salaryChange.previousSalary}: <span className="font-semibold text-foreground">{formatCurrency(currentSalary)}</span>
          </p>
          <Field label={t.teachers.salaryChange.newSalary} required error={errors.newSalary?.message}>
            <Input type="number" dir="ltr" min={0} {...register("newSalary", { valueAsNumber: true })} />
          </Field>
          <Field label={t.teachers.salaryChange.effectiveDate} required error={errors.effectiveDate?.message}>
            <Input type="date" dir="ltr" {...register("effectiveDate")} />
          </Field>
          <Field label={t.teachers.salaryChange.reason} required error={errors.reason?.message}>
            <Input {...register("reason")} />
          </Field>
          <Field label={t.common.notes}>
            <Textarea rows={2} {...register("notes")} />
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
