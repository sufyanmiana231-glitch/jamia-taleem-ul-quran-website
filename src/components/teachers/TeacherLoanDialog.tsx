"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { teacherLoanFormSchema, type TeacherLoanFormInput, type LoanType } from "@/domain/schema/teacher";
import { issueTeacherLoan } from "@/lib/services/finance-service";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale, todayISO } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/shared/Field";

type FormValues = z.input<typeof teacherLoanFormSchema>;
const TYPES: LoanType[] = ["loan", "salary_advance", "emergency"];

export function TeacherLoanDialog({ open, onOpenChange, teacherId }: { open: boolean; onOpenChange: (open: boolean) => void; teacherId: string }) {
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
    resolver: zodResolver(teacherLoanFormSchema),
    defaultValues: { teacherId, amount: 0, issueDate: todayISO(), type: "loan", reason: "", deductFromSalary: false, notes: "" },
  });

  const type = watch("type");
  const deductFromSalary = watch("deductFromSalary");

  const onSubmit: SubmitHandler<FormValues> = async (raw) => {
    if (!firebaseUser) return;
    const values: TeacherLoanFormInput = teacherLoanFormSchema.parse(raw);
    try {
      await issueTeacherLoan(values, firebaseUser.uid);
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
          <DialogTitle>{t.teachers.loan.addLoan}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label={t.teachers.loan.amount} required error={errors.amount?.message}>
            <Input type="number" dir="ltr" min={0} {...register("amount", { valueAsNumber: true })} />
          </Field>
          <Field label={t.teachers.loan.issueDate} required error={errors.issueDate?.message}>
            <Input type="date" dir="ltr" {...register("issueDate")} />
          </Field>
          <Field label={t.common.category}>
            <Select value={type} onValueChange={(v) => setValue("type", v as LoanType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((ty) => (
                  <SelectItem key={ty} value={ty}>
                    {t.teachers.loan.type[ty]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t.teachers.loan.reason}>
            <Input {...register("reason")} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={deductFromSalary} onCheckedChange={(v) => setValue("deductFromSalary", Boolean(v))} />
            {t.teachers.loan.deductFromSalary}
          </label>
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
