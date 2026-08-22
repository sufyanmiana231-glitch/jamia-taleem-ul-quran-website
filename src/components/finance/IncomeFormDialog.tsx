"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { incomeFormSchema, DEFAULT_FUND_CATEGORIES, type IncomeFormInput } from "@/domain/schema/finance";
import { paymentMethodSchema, type PaymentMethod } from "@/domain/schema/common";
import { postIncome } from "@/lib/services/finance-service";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale, todayISO } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/Field";

type FormValues = z.input<typeof incomeFormSchema>;

export function IncomeFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
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
    resolver: zodResolver(incomeFormSchema),
    defaultValues: {
      amount: 0,
      date: todayISO(),
      fundCategory: "donation",
      sourceName: "",
      description: "",
      paymentMethod: "cash",
      reference: "",
      notes: "",
      isRestricted: false,
    },
  });

  const fundCategory = watch("fundCategory");
  const paymentMethod = watch("paymentMethod");
  const isRestricted = watch("isRestricted");

  const onSubmit: SubmitHandler<FormValues> = async (raw) => {
    if (!firebaseUser) return;
    const values: IncomeFormInput = incomeFormSchema.parse(raw);
    try {
      await postIncome(values, firebaseUser.uid);
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
          <DialogTitle>{t.finance.income.addIncome}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label={t.common.amount} required error={errors.amount?.message}>
            <Input type="number" dir="ltr" min={0} {...register("amount", { valueAsNumber: true })} />
          </Field>
          <Field label={t.common.date} required error={errors.date?.message}>
            <Input type="date" dir="ltr" {...register("date")} />
          </Field>
          <Field label={t.finance.income.fundCategory} required error={errors.fundCategory?.message}>
            <Select value={fundCategory} onValueChange={(v) => setValue("fundCategory", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_FUND_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t.finance.income.categories[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t.finance.income.source}>
            <Input {...register("sourceName")} />
          </Field>
          <Field label={t.common.description}>
            <Textarea rows={2} {...register("description")} />
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
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isRestricted} onCheckedChange={(v) => setValue("isRestricted", Boolean(v))} />
            مخصوص مقصد کے لیے فنڈ (Restricted)
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
