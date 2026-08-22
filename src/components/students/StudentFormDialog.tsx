"use client";

import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { studentFormSchema, type Student, type StudentFormInput, type StudentStatus } from "@/domain/schema/student";
import type { SchoolClass } from "@/domain/schema/schoolClass";
import type { Teacher } from "@/domain/schema/teacher";
import { studentsRepository, studentAcademicHistoryRepository } from "@/lib/repositories";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLocale, todayISO } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/Field";

type FormValues = z.input<typeof studentFormSchema>;

const emptyDefaults: FormValues = {
  fullName: "",
  fatherName: "",
  dateOfBirth: "",
  guardianName: "",
  guardianRelation: "",
  guardianPhone: "",
  altPhone: "",
  cnic: "",
  currentAddress: "",
  permanentAddress: "",
  photoUrl: "",
  admissionDate: todayISO(),
  admissionNumber: "",
  classId: null,
  previousEducation: "",
  status: "active",
  specialRequirements: "",
  program: "",
  mentorTeacherId: null,
  academicNotes: "",
  hifzProgress: "",
  tajweedLevel: "",
  notes: "",
  isArchived: false,
};

const STATUSES: StudentStatus[] = ["active", "on_leave", "completed", "transferred", "left"];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-sm font-semibold text-brand">{children}</p>;
}

export function StudentFormDialog({
  open,
  onOpenChange,
  student,
  classes,
  teachers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student;
  classes: SchoolClass[];
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
    resolver: zodResolver(studentFormSchema),
    defaultValues: student ?? emptyDefaults,
  });

  useEffect(() => {
    reset(student ?? emptyDefaults);
  }, [student, open, reset]);

  const classId = watch("classId");
  const mentorTeacherId = watch("mentorTeacherId");
  const status = watch("status");
  const gender = watch("gender");

  const onSubmit: SubmitHandler<FormValues> = async (raw) => {
    if (!firebaseUser) return;
    const values: StudentFormInput = studentFormSchema.parse(raw);
    try {
      if (student) {
        await studentsRepository.update(student.id, values, firebaseUser.uid);
        if (values.classId !== student.classId || values.status !== student.status) {
          await studentAcademicHistoryRepository.create(
            {
              studentId: student.id,
              date: todayISO(),
              previousClassId: student.classId,
              newClassId: values.classId,
              previousStatus: student.status,
              newStatus: values.status,
              reason: "پروفائل میں ترمیم",
            },
            firebaseUser.uid,
          );
        }
      } else {
        await studentsRepository.create(values, firebaseUser.uid);
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
          <DialogTitle>{student ? t.students.editStudent : t.students.addStudent}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <SectionTitle>{t.students.tabs.personal}</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t.students.fullName} required error={errors.fullName?.message}>
              <Input {...register("fullName")} />
            </Field>
            <Field label={t.students.fatherName} required error={errors.fatherName?.message}>
              <Input {...register("fatherName")} />
            </Field>
            <Field label={t.students.dateOfBirth}>
              <Input type="date" dir="ltr" {...register("dateOfBirth")} />
            </Field>
            <Field label={t.students.gender}>
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
            <Field label={t.students.guardianName}>
              <Input {...register("guardianName")} />
            </Field>
            <Field label={t.students.guardianRelation}>
              <Input {...register("guardianRelation")} />
            </Field>
            <Field label={t.students.guardianPhone} required error={errors.guardianPhone?.message}>
              <Input dir="ltr" {...register("guardianPhone")} />
            </Field>
            <Field label={t.students.altPhone}>
              <Input dir="ltr" {...register("altPhone")} />
            </Field>
            <Field label={t.students.cnic}>
              <Input dir="ltr" {...register("cnic")} />
            </Field>
            <Field label={t.students.photo}>
              <Input dir="ltr" placeholder="https://…" {...register("photoUrl")} />
            </Field>
            <Field label={t.students.currentAddress} className="sm:col-span-2">
              <Textarea rows={2} {...register("currentAddress")} />
            </Field>
            <Field label={t.students.permanentAddress} className="sm:col-span-2">
              <Textarea rows={2} {...register("permanentAddress")} />
            </Field>
          </div>

          <SectionTitle>{t.students.tabs.academic}</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t.students.admissionDate} required error={errors.admissionDate?.message}>
              <Input type="date" dir="ltr" {...register("admissionDate")} />
            </Field>
            <Field label={t.students.admissionNumber} required error={errors.admissionNumber?.message}>
              <Input {...register("admissionNumber")} />
            </Field>
            <Field label={t.students.currentClass}>
              <Select value={classId ?? "none"} onValueChange={(v) => setValue("classId", v === "none" ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t.common.selectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t.students.admissionStatus}>
              <Select value={status} onValueChange={(v) => setValue("status", v as StudentStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t.students.status[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t.students.program}>
              <Input {...register("program")} />
            </Field>
            <Field label={t.students.mentorTeacher}>
              <Select value={mentorTeacherId ?? "none"} onValueChange={(v) => setValue("mentorTeacherId", v === "none" ? null : v)}>
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
            <Field label={t.students.hifzProgress}>
              <Input {...register("hifzProgress")} />
            </Field>
            <Field label={t.students.tajweedLevel}>
              <Input {...register("tajweedLevel")} />
            </Field>
            <Field label={t.students.previousEducation} className="sm:col-span-2">
              <Textarea rows={2} {...register("previousEducation")} />
            </Field>
            <Field label={t.students.academicNotes} className="sm:col-span-2">
              <Textarea rows={2} {...register("academicNotes")} />
            </Field>
            <Field label={t.students.specialRequirements} className="sm:col-span-2">
              <Textarea rows={2} {...register("specialRequirements")} />
            </Field>
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
