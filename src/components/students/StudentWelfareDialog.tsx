"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { welfareSupportBaseSchema, type WelfareSupportFormInput } from "@/domain/schema/finance";
import type { ExpenseCategory } from "@/domain/schema/finance";
import { recordWelfareSupport } from "@/lib/services/finance-service";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale, todayISO } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/Field";

type FormValues = z.input<typeof welfareSupportBaseSchema>;

export function StudentWelfareDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  categories: ExpenseCategory[];
}) {
  const { t } = useLocale();
  const { firebaseUser } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(welfareSupportBaseSchema),
    defaultValues: { studentId, categoryId: "", amount: 0, date: todayISO(), description: "", approvedBy: "" },
  });

  const categoryId = watch("categoryId");

  const onSubmit: SubmitHandler<FormValues> = async (raw) => {
    if (!firebaseUser) return;
    const values: WelfareSupportFormInput = welfareSupportBaseSchema.parse(raw);
    setBusy(true);
    try {
      await recordWelfareSupport(values, studentName, firebaseUser.uid);
      toast({ title: t.common.successSaved, variant: "success" });
      reset();
      onOpenChange(false);
    } catch {
      toast({ title: t.common.errorGeneric, variant: "danger" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.students.addSupport}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label={t.common.category} required error={errors.categoryId?.message}>
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
          <Field label={t.common.date} required error={errors.date?.message}>
            <Input type="date" dir="ltr" {...register("date")} />
          </Field>
          <Field label={t.common.description}>
            <Textarea rows={2} {...register("description")} />
          </Field>
          <Field label="منظور کنندہ">
            <Input {...register("approvedBy")} />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={busy}>
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
