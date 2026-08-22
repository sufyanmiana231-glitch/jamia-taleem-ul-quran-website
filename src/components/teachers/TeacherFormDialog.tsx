"use client";

import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { teacherFormSchema, type Teacher, type TeacherFormInput, type TeacherStatus } from "@/domain/schema/teacher";
import type { SchoolClass } from "@/domain/schema/schoolClass";
import { teachersRepository, teacherSalaryHistoryRepository } from "@/lib/repositories";
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

type FormValues = z.input<typeof teacherFormSchema>;

const emptyDefaults: FormValues = {
  fullName: "",
  fatherName: "",
  cnic: "",
  dateOfBirth: "",
  phone: "",
  altPhone: "",
  currentAddress: "",
  permanentAddress: "",
  photoUrl: "",
  notes: "",
  joiningDate: todayISO(),
  status: "active",
  designation: "",
  subjects: [],
  assignedClassIds: [],
  salaryStartDate: todayISO(),
  initialSalary: 0,
  isArchived: false,
};

const STATUSES: TeacherStatus[] = ["active", "on_leave", "inactive", "left"];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-sm font-semibold text-brand">{children}</p>;
}

export function TeacherFormDialog({
  open,
  onOpenChange,
  teacher,
  classes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: Teacher;
  classes: SchoolClass[];
}) {
  const { t } = useLocale();
  const { firebaseUser } = useAuth();
  const { toast } = useToast();

  const defaults: FormValues = teacher
    ? { ...teacher, initialSalary: teacher.currentSalary }
    : emptyDefaults;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacher, open, reset]);

  const status = watch("status");
  const gender = watch("gender");
  const assignedClassIds = watch("assignedClassIds") ?? [];
  const subjectsText = watch("subjects")?.join("، ") ?? "";

  const toggleClass = (id: string) => {
    setValue("assignedClassIds", assignedClassIds.includes(id) ? assignedClassIds.filter((x) => x !== id) : [...assignedClassIds, id]);
  };

  const onSubmit: SubmitHandler<FormValues> = async (raw) => {
    if (!firebaseUser) return;
    const values: TeacherFormInput = teacherFormSchema.parse(raw);
    const { initialSalary, ...teacherFields } = values;
    try {
      if (teacher) {
        await teachersRepository.update(teacher.id, teacherFields, firebaseUser.uid);
      } else {
        const teacherId = await teachersRepository.create({ ...teacherFields, currentSalary: initialSalary }, firebaseUser.uid);
        await teacherSalaryHistoryRepository.create(
          {
            teacherId,
            previousSalary: 0,
            newSalary: initialSalary,
            effectiveDate: values.salaryStartDate,
            reason: "ابتدائی تقرری",
          },
          firebaseUser.uid,
        );
      }
      toast({ title: t.common.successSaved, variant: "success" });
      onOpenChange(false);
    } catch {
      toast({ title: t.common.errorGeneric, variant: "danger" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{teacher ? t.teachers.editTeacher : t.teachers.addTeacher}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <SectionTitle>{t.teachers.tabs.personal}</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t.teachers.fullName} required error={errors.fullName?.message}>
              <Input {...register("fullName")} />
            </Field>
            <Field label={t.teachers.fatherName} required error={errors.fatherName?.message}>
              <Input {...register("fatherName")} />
            </Field>
            <Field label={t.teachers.cnic}>
              <Input dir="ltr" {...register("cnic")} />
            </Field>
            <Field label={t.teachers.dateOfBirth}>
              <Input type="date" dir="ltr" {...register("dateOfBirth")} />
            </Field>
            <Field label={t.teachers.gender}>
              <Select value={gender ?? undefined} onValueChange={(v) => setValue("gender", v as "male" | "female")}>
                <SelectTrigger>
                  <SelectValue placeholder={t.common.selectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t.common.male}</SelectItem>
                  <SelectItem value="female">{t.common.female}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={t.teachers.phone} required error={errors.phone?.message}>
              <Input dir="ltr" {...register("phone")} />
            </Field>
            <Field label={t.teachers.altPhone}>
              <Input dir="ltr" {...register("altPhone")} />
            </Field>
            <Field label={t.teachers.photo}>
              <Input dir="ltr" placeholder="https://…" {...register("photoUrl")} />
            </Field>
            <Field label={t.teachers.currentAddress} className="sm:col-span-2">
              <Textarea rows={2} {...register("currentAddress")} />
            </Field>
            <Field label={t.teachers.permanentAddress} className="sm:col-span-2">
              <Textarea rows={2} {...register("permanentAddress")} />
            </Field>
          </div>

          <SectionTitle>{t.teachers.tabs.employment}</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t.teachers.joiningDate} required error={errors.joiningDate?.message}>
              <Input type="date" dir="ltr" {...register("joiningDate")} />
            </Field>
            <Field label={t.teachers.employmentStatus}>
              <Select value={status} onValueChange={(v) => setValue("status", v as TeacherStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t.teachers.status[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t.teachers.designation}>
              <Input {...register("designation")} />
            </Field>
            <Field label={t.teachers.subjects} className="sm:col-span-2">
              <Input
                defaultValue={subjectsText}
                placeholder="ناظرہ، حفظ، تجوید"
                onChange={(e) => setValue("subjects", e.target.value.split("،").map((s) => s.trim()).filter(Boolean))}
              />
            </Field>
            <Field label={t.teachers.assignedClasses} className="sm:col-span-2">
              <div className="flex max-h-32 flex-col gap-2 overflow-y-auto rounded-md border border-border p-2">
                {classes.length === 0 && <p className="text-xs text-muted-foreground">{t.common.noData}</p>}
                {classes.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={assignedClassIds.includes(c.id)} onCheckedChange={() => toggleClass(c.id)} />
                    {c.name}
                  </label>
                ))}
              </div>
            </Field>
            {!teacher && (
              <>
                <Field label={t.teachers.monthlySalary} required error={errors.initialSalary?.message}>
                  <Input type="number" dir="ltr" min={0} {...register("initialSalary", { valueAsNumber: true })} />
                </Field>
                <Field label={t.teachers.salaryStartDate} required error={errors.salaryStartDate?.message}>
                  <Input type="date" dir="ltr" {...register("salaryStartDate")} />
                </Field>
              </>
            )}
            <Field label={t.common.notes} className="sm:col-span-2">
              <Textarea rows={2} {...register("notes")} />
            </Field>
          </div>

          <DialogFooter className="pt-2">
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
