"use client";

import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { schoolClassFormSchema, type SchoolClass, type SchoolClassFormInput } from "@/domain/schema/schoolClass";

/**
 * Zod schemas with `.default()` fields have a wider Input type (field
 * optional) than Output type (field always present) — `zodResolver` types
 * itself against Input, so the form must be typed against Input too. We
 * re-parse through the schema in onSubmit to get back to the Output type
 * (`SchoolClassFormInput`) that the repository/service layer expects. This
 * is the pattern every form in the app follows — see finance forms too.
 */
type FormValues = z.input<typeof schoolClassFormSchema>;
import type { Teacher } from "@/domain/schema/teacher";
import { schoolClassesRepository } from "@/lib/repositories";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/shared/Field";

const emptyDefaults: SchoolClassFormInput = { name: "", description: "", teacherIds: [], isArchived: false };

export function ClassFormDialog({
  open,
  onOpenChange,
  schoolClass,
  teachers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolClass?: SchoolClass;
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
    resolver: zodResolver(schoolClassFormSchema),
    defaultValues: schoolClass ?? emptyDefaults,
  });

  useEffect(() => {
    reset(schoolClass ?? emptyDefaults);
  }, [schoolClass, open, reset]);

  const teacherIds = watch("teacherIds") ?? [];

  const toggleTeacher = (id: string) => {
    setValue("teacherIds", teacherIds.includes(id) ? teacherIds.filter((x) => x !== id) : [...teacherIds, id]);
  };

  const onSubmit: SubmitHandler<FormValues> = async (raw) => {
    if (!firebaseUser) return;
    const values: SchoolClassFormInput = schoolClassFormSchema.parse(raw);
    try {
      if (schoolClass) {
        await schoolClassesRepository.update(schoolClass.id, values, firebaseUser.uid);
      } else {
        await schoolClassesRepository.create(values, firebaseUser.uid);
      }
      toast({ title: t.common.successSaved, variant: "success" });
      onOpenChange(false);
    } catch {
      toast({ title: t.common.errorGeneric, variant: "danger" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{schoolClass ? t.classes.editClass : t.classes.addClass}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label={t.classes.className} required error={errors.name?.message}>
            <Input {...register("name")} />
          </Field>
          <Field label={t.classes.description}>
            <Textarea rows={2} {...register("description")} />
          </Field>
          <Field label={t.classes.capacity}>
            <Input type="number" min={0} {...register("capacity", { valueAsNumber: true })} />
          </Field>
          <Field label={t.classes.assignedTeachers}>
            <div className="flex max-h-40 flex-col gap-2 overflow-y-auto rounded-md border border-border p-2">
              {teachers.length === 0 && <p className="text-xs text-muted-foreground">{t.common.noData}</p>}
              {teachers.map((teacher) => (
                <label key={teacher.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={teacherIds.includes(teacher.id)} onCheckedChange={() => toggleTeacher(teacher.id)} />
                  {teacher.fullName}
                </label>
              ))}
            </div>
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
