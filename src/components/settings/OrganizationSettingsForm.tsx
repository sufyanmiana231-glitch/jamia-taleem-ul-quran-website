"use client";

import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { organizationSettingsFormSchema, type OrganizationSettingsFormInput } from "@/domain/schema/settings";
import { organizationSettingsRepository } from "@/lib/repositories";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/shared/Field";

type FormValues = z.input<typeof organizationSettingsFormSchema>;

export function OrganizationSettingsForm({ canWrite }: { canWrite: boolean }) {
  const { t } = useLocale();
  const { firebaseUser } = useAuth();
  const { toast } = useToast();
  const [loaded, setLoaded] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(organizationSettingsFormSchema),
    defaultValues: { name: "جامعہ تعلیم القرآن", address: "", phone: "", currency: "PKR", fiscalYearStartMonth: 1 },
  });

  useEffect(() => {
    organizationSettingsRepository.get().then((settings) => {
      if (settings) reset(settings);
      setLoaded(true);
    });
  }, [reset]);

  const onSubmit: SubmitHandler<FormValues> = async (raw) => {
    if (!firebaseUser) return;
    const values = organizationSettingsFormSchema.parse(raw);
    try {
      await organizationSettingsRepository.set(values, firebaseUser.uid);
      toast({ title: t.common.successSaved, variant: "success" });
    } catch {
      toast({ title: t.common.errorGeneric, variant: "danger" });
    }
  };

  if (!loaded) return <p className="text-sm text-muted-foreground">{t.common.loading}</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.settings.organization}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t.settings.orgName}>
            <Input disabled={!canWrite} {...register("name")} />
          </Field>
          <Field label={t.settings.orgPhone}>
            <Input dir="ltr" disabled={!canWrite} {...register("phone")} />
          </Field>
          <Field label={t.settings.orgAddress} className="sm:col-span-2">
            <Input disabled={!canWrite} {...register("address")} />
          </Field>
          <Field label={t.settings.currency}>
            <Input dir="ltr" disabled={!canWrite} {...register("currency")} />
          </Field>
          {canWrite && (
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isSubmitting}>
                {t.common.saveChanges}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
