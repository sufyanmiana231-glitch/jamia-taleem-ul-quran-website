"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Money } from "@/components/shared/Money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale, formatDate } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRepositoryList } from "@/hooks/useRepositoryList";
import {
  studentsRepository,
  schoolClassesRepository,
  teachersRepository,
  expenseCategoriesRepository,
  welfareSupportRepository,
  studentAcademicHistoryRepository,
} from "@/lib/repositories";
import { studentAttendanceRepository } from "@/lib/repositories/attendance";
import { computeAttendancePercentage } from "@/lib/services/finance-calculations";
import { StudentFormDialog } from "@/components/students/StudentFormDialog";
import { StudentWelfareDialog } from "@/components/students/StudentWelfareDialog";
import { useEffect } from "react";
import type { StudentAttendanceDay } from "@/domain/schema/attendance";

const STATUS_TONE = {
  active: "success",
  on_leave: "warning",
  completed: "brand",
  transferred: "info",
  left: "danger",
} as const;

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLocale();
  const { can } = useAuth();

  const { data: students, loading } = useRepositoryList(studentsRepository);
  const { data: classes } = useRepositoryList(schoolClassesRepository);
  const { data: teachers } = useRepositoryList(teachersRepository);
  const { data: categories } = useRepositoryList(expenseCategoriesRepository);
  const { data: welfare } = useRepositoryList(welfareSupportRepository);
  const { data: history } = useRepositoryList(studentAcademicHistoryRepository);

  const student = useMemo(() => students.find((s) => s.id === id), [students, id]);
  const studentClass = classes.find((c) => c.id === student?.classId);
  const mentor = teachers.find((tr) => tr.id === student?.mentorTeacherId);
  const studentWelfare = useMemo(() => welfare.filter((w) => w.studentId === id), [welfare, id]);
  const studentHistory = useMemo(() => history.filter((h) => h.studentId === id), [history, id]);

  const [attendanceDays, setAttendanceDays] = useState<StudentAttendanceDay[]>([]);
  useEffect(() => {
    if (!student?.classId) return;
    return studentAttendanceRepository.subscribeForClass(student.classId, setAttendanceDays);
  }, [student?.classId]);

  const attendanceRecords = useMemo(
    () =>
      attendanceDays
        .filter((day) => day.records[id])
        .map((day) => ({ date: day.date, ...day.records[id] }))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [attendanceDays, id],
  );
  const attendancePresent = attendanceRecords.filter((r) => r.status === "present" || r.status === "late").length;
  const attendancePercentage = computeAttendancePercentage(attendancePresent, attendanceRecords.length);

  const [editOpen, setEditOpen] = useState(false);
  const [welfareOpen, setWelfareOpen] = useState(false);

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>;
  if (!student) return <EmptyState title={t.common.noData} action={<Button onClick={() => router.push("/students")}>{t.common.back}</Button>} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/students")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />
          {t.common.back}
        </button>
        {can("students:write") && (
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            {t.common.edit}
          </Button>
        )}
      </div>

      <PageHeader
        title={student.fullName}
        subtitle={`${t.students.fatherName}: ${student.fatherName} · ${t.students.admissionNumber}: ${student.admissionNumber}`}
        actions={<Badge variant={STATUS_TONE[student.status]}>{t.students.status[student.status]}</Badge>}
      />

      <Tabs defaultValue="overview" dir="rtl">
        <TabsList>
          <TabsTrigger value="overview">{t.students.tabs.overview}</TabsTrigger>
          <TabsTrigger value="personal">{t.students.tabs.personal}</TabsTrigger>
          <TabsTrigger value="academic">{t.students.tabs.academic}</TabsTrigger>
          <TabsTrigger value="attendance">{t.students.tabs.attendance}</TabsTrigger>
          <TabsTrigger value="welfare">{t.students.tabs.welfare}</TabsTrigger>
          <TabsTrigger value="notes">{t.students.tabs.notes}</TabsTrigger>
          <TabsTrigger value="history">{t.students.tabs.history}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t.students.currentClass}</p>
                <p className="mt-1 font-semibold">{studentClass?.name ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t.students.admissionDate}</p>
                <p className="mt-1 font-semibold">{formatDate(student.admissionDate)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t.students.mentorTeacher}</p>
                <p className="mt-1 font-semibold">{mentor?.fullName ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t.attendance.attendancePercentage}</p>
                <p className="mt-1 font-semibold">{attendanceRecords.length > 0 ? `${Math.round(attendancePercentage)}%` : "—"}</p>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{t.students.tabs.personal}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <InfoField label={t.students.guardianPhone} value={student.guardianPhone} ltr />
              <InfoField label={t.students.guardianName} value={student.guardianName} />
              <InfoField label={t.students.dateOfBirth} value={student.dateOfBirth ? formatDate(student.dateOfBirth) : "—"} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal">
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 p-5 text-sm sm:grid-cols-3">
              <InfoField label={t.students.fatherName} value={student.fatherName} />
              <InfoField label={t.students.dateOfBirth} value={student.dateOfBirth ? formatDate(student.dateOfBirth) : "—"} />
              <InfoField label={t.students.gender} value={student.gender ? t.common[student.gender] : "—"} />
              <InfoField label={t.students.guardianName} value={student.guardianName} />
              <InfoField label={t.students.guardianRelation} value={student.guardianRelation} />
              <InfoField label={t.students.guardianPhone} value={student.guardianPhone} ltr />
              <InfoField label={t.students.altPhone} value={student.altPhone} ltr />
              <InfoField label={t.students.cnic} value={student.cnic} ltr />
              <InfoField label={t.students.currentAddress} value={student.currentAddress} />
              <InfoField label={t.students.permanentAddress} value={student.permanentAddress} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic">
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 p-5 text-sm sm:grid-cols-3">
              <InfoField label={t.students.currentClass} value={studentClass?.name} />
              <InfoField label={t.students.program} value={student.program} />
              <InfoField label={t.students.mentorTeacher} value={mentor?.fullName} />
              <InfoField label={t.students.hifzProgress} value={student.hifzProgress} />
              <InfoField label={t.students.tajweedLevel} value={student.tajweedLevel} />
              <InfoField label={t.students.previousEducation} value={student.previousEducation} />
              <InfoField label={t.students.specialRequirements} value={student.specialRequirements} />
              <InfoField label={t.students.academicNotes} value={student.academicNotes} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>
                {t.attendance.attendancePercentage}: {attendanceRecords.length > 0 ? `${Math.round(attendancePercentage)}%` : "—"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceRecords.length === 0 ? (
                <EmptyState title={t.common.noData} />
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {attendanceRecords.slice(0, 30).map((r) => (
                    <div key={r.date} className="flex items-center justify-between py-2 text-sm">
                      <span>{formatDate(r.date)}</span>
                      <Badge variant={r.status === "present" ? "success" : r.status === "absent" ? "danger" : "warning"}>
                        {t.attendance.status[r.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="welfare">
          <div className="mb-3 flex justify-end">
            {can("finance:write") && (
              <Button size="sm" onClick={() => setWelfareOpen(true)}>
                <Plus className="h-4 w-4" />
                {t.students.addSupport}
              </Button>
            )}
          </div>
          <Card>
            <CardContent className="p-0">
              {studentWelfare.length === 0 ? (
                <div className="p-5">
                  <EmptyState title={t.common.noData} />
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {studentWelfare
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((w) => (
                      <div key={w.id} className="flex items-center justify-between p-4 text-sm">
                        <div>
                          <p className="font-medium">{categories.find((c) => c.id === w.categoryId)?.name ?? w.categoryId}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(w.date)} — {w.description || "—"}</p>
                        </div>
                        <Money amount={w.amount} className="font-semibold" />
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardContent className="p-5 text-sm">{student.notes || t.common.noData}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              {studentHistory.length === 0 ? (
                <div className="p-5">
                  <EmptyState title={t.common.noData} />
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {studentHistory
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((h) => (
                      <div key={h.id} className="p-4 text-sm">
                        <p className="text-xs text-muted-foreground">{formatDate(h.date)}</p>
                        <p className="mt-1">
                          {classes.find((c) => c.id === h.previousClassId)?.name ?? "—"} ←{" "}
                          {classes.find((c) => c.id === h.newClassId)?.name ?? "—"}
                          {" · "}
                          {h.previousStatus ? t.students.status[h.previousStatus] : "—"} ←{" "}
                          {h.newStatus ? t.students.status[h.newStatus] : "—"}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <StudentFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        student={student}
        classes={classes.filter((c) => !c.isArchived)}
        teachers={teachers.filter((tr) => !tr.isArchived)}
      />
      <StudentWelfareDialog
        open={welfareOpen}
        onOpenChange={setWelfareOpen}
        studentId={student.id}
        studentName={student.fullName}
        categories={categories.filter((c) => c.group === "student" && !c.isArchived)}
      />
    </div>
  );
}

function InfoField({ label, value, ltr }: { label: string; value?: string | null; ltr?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={ltr ? "mt-0.5" : "mt-0.5"} dir={ltr ? "ltr" : undefined}>
        {value || "—"}
      </p>
    </div>
  );
}
