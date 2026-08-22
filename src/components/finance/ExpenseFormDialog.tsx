"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { expenseFormSchema, type ExpenseCategory, type ExpenseFormInput, type ExpensePaymentStatus } from "@/domain/schema/finance";
import { paymentMethodSchema, type PaymentMethod } from "@/domain/schema/common";
import { postExpense } from "@/lib/services/finance-service";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale, todayISO } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/Field";
import type { Student } from "@/domain/schema/student";
import type { Teacher } from "@/domain/schema/teacher";

type FormValues = z.input<typeof expenseFormSchema>;

export function ExpenseFormDialog({
  open,
  onOpenChange,
  categories,
  students,
  teachers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ExpenseCategory[];
  students: Student[];
  teachers: Teacher[];
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
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      categoryId: "",
      amount: 0,
      billDate: todayISO(),
      dueDate: "",
      paymentDate: todayISO(),
      status: "paid",
      description: "",
      linkedStudentId: "",
      linkedTeacherId: "",
      paymentMethod: "cash",
      reference: "",
      notes: "",
    },
  });

  const categoryId = watch("categoryId");
  const status = watch("status");
  const paymentMethod = watch("paymentMethod");
  const linkedStudentId = watch("linkedStudentId");
  const linkedTeacherId = watch("linkedTeacherId");

  const onSubmit: SubmitHandler<FormValues> = async (raw) => {
    if (!firebaseUser) return;
    const values: ExpenseFormInput = expenseFormSchema.parse(raw);
    try {
      await postExpense(values, firebaseUser.uid);
      toast({ title: t.common.successSaved, variant: "success" });
      reset();
      onOpenChange(false);
    } catch {
      toast({ title: t.common.errorGeneric, variant: "danger" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.finance.expenses.addExpense}</DialogTitle>
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
          <Field label={t.common.amount} required error={errors.amount?.message}>
            <Input type="number" dir="ltr" min={0} {...register("amount", { valueAsNumber: true })} />
          </Field>
          <Field label={t.common.description} required error={errors.description?.message}>
            <Textarea rows={2} {...register("description")} />
          </Field>
          <Field label={t.finance.expenses.billDate} required error={errors.billDate?.message}>
            <Input type="date" dir="ltr" {...register("billDate")} />
          </Field>
          <Field label={t.finance.expenses.dueDate}>
            <Input type="date" dir="ltr" {...register("dueDate")} />
          </Field>
          <Field label={t.finance.expenses.paymentStatus}>
            <Select value={status} onValueChange={(v) => setValue("status", v as ExpensePaymentStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">{t.finance.expenses.status.paid}</SelectItem>
                <SelectItem value="pending">{t.finance.expenses.status.pending}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {status === "paid" && (
            <Field label={t.finance.expenses.paymentDate} required error={errors.paymentDate?.message}>
              <Input type="date" dir="ltr" {...register("paymentDate")} />
            </Field>
          )}
          <Field label={t.finance.expenses.linkedStudent}>
            <Select value={linkedStudentId || "none"} onValueChange={(v) => setValue("linkedStudentId", v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder={t.common.selectPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t.finance.expenses.linkedTeacher}>
            <Select value={linkedTeacherId || "none"} onValueChange={(v) => setValue("linkedTeacherId", v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder={t.common.selectPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {teachers.map((tr) => (
                  <SelectItem key={tr.id} value={tr.id}>
                    {tr.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
