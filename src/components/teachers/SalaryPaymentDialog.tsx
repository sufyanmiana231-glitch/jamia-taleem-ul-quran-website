"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { recordSalaryPaymentFormSchema, type RecordSalaryPaymentInput } from "@/domain/schema/teacher";
import { paymentMethodSchema, type PaymentMethod } from "@/domain/schema/common";
import { recordSalaryPayment } from "@/lib/services/finance-service";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale, todayISO, currentPeriod, formatCurrency } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/Field";

type FormValues = z.input<typeof recordSalaryPaymentFormSchema>;

export function SalaryPaymentDialog({
  open,
  onOpenChange,
  teacherId,
  expectedAmount,
  remaining,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
  expectedAmount: number;
  remaining: number;
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
    resolver: zodResolver(recordSalaryPaymentFormSchema),
    defaultValues: {
      teacherId,
      period: currentPeriod(),
      amount: remaining,
      paymentDate: todayISO(),
      paymentMethod: "cash",
      reference: "",
      notes: "",
    },
  });

  const paymentMethod = watch("paymentMethod");

  const onSubmit: SubmitHandler<FormValues> = async (raw) => {
    if (!firebaseUser) return;
    const values: RecordSalaryPaymentInput = recordSalaryPaymentFormSchema.parse(raw);
    try {
      await recordSalaryPayment(values, expectedAmount, firebaseUser.uid);
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
          <DialogTitle>{t.teachers.payment.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t.teachers.payment.remaining}: <span className="font-semibold text-foreground">{formatCurrency(remaining)}</span>
          </p>
          <Field label={t.teachers.payment.period} required error={errors.period?.message}>
            <Input type="month" dir="ltr" {...register("period")} />
          </Field>
          <Field label={t.common.amount} required error={errors.amount?.message}>
            <Input type="number" dir="ltr" min={0} {...register("amount", { valueAsNumber: true })} />
          </Field>
          <Field label={t.common.date} required error={errors.paymentDate?.message}>
            <Input type="date" dir="ltr" {...register("paymentDate")} />
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
          <Field label={t.common.reference}>
            <Input dir="ltr" {...register("reference")} />
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
