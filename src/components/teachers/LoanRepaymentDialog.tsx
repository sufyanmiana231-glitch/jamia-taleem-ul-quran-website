"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { loanRepaymentFormSchema, type LoanRepaymentFormInput } from "@/domain/schema/teacher";
import { paymentMethodSchema, type PaymentMethod } from "@/domain/schema/common";
import { repayTeacherLoan } from "@/lib/services/finance-service";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale, todayISO, formatCurrency } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/Field";

type FormValues = z.input<typeof loanRepaymentFormSchema>;

export function LoanRepaymentDialog({
  open,
  onOpenChange,
  loanId,
  teacherId,
  outstandingAmount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loanId: string;
  teacherId: string;
  outstandingAmount: number;
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
    resolver: zodResolver(loanRepaymentFormSchema),
    defaultValues: { amount: outstandingAmount, date: todayISO(), paymentMethod: "cash", notes: "" },
  });

  const paymentMethod = watch("paymentMethod");

  const onSubmit: SubmitHandler<FormValues> = async (raw) => {
    if (!firebaseUser) return;
    const values: LoanRepaymentFormInput = loanRepaymentFormSchema.parse(raw);
    try {
      await repayTeacherLoan(loanId, teacherId, outstandingAmount, values, firebaseUser.uid);
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
          <DialogTitle>{t.teachers.loan.repay}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t.teachers.loan.outstanding}: <span className="font-semibold text-foreground">{formatCurrency(outstandingAmount)}</span>
          </p>
          <Field label={t.common.amount} required error={errors.amount?.message}>
            <Input type="number" dir="ltr" min={0} {...register("amount", { valueAsNumber: true })} />
          </Field>
          <Field label={t.common.date} required error={errors.date?.message}>
            <Input type="date" dir="ltr" {...register("date")} />
          </Field>
          <Field label={t.common.paymentMethod}>
            <Select value={paymentMethod} onValueChange={(v) => setValue("paymentMethod", v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethodSchema.options.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
