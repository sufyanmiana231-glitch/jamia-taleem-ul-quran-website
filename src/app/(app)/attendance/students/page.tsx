"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCheck, Save } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale, todayISO, formatDate } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/toast";
import { useRepositoryList } from "@/hooks/useRepositoryList";
import { studentsRepository, schoolClassesRepository } from "@/lib/repositories";
import { studentAttendanceRepository } from "@/lib/repositories/attendance";
import { computeAttendancePercentage } from "@/lib/services/finance-calculations";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { AttendanceStatusPicker } from "@/components/attendance/AttendanceStatusPicker";
import type { AttendanceStatus, AttendanceEntry, StudentAttendanceDay } from "@/domain/schema/attendance";

export default function StudentAttendancePage() {
  const { t } = useLocale();
  const { firebaseUser } = useAuth();
  const { toast } = useToast();
  const { data: students } = useRepositoryList(studentsRepository);
  const { data: classes } = useRepositoryList(schoolClassesRepository);

  const activeClasses = useMemo(() => classes.filter((c) => !c.isArchived), [classes]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  // Defaults to the first class once classes load, without a setState-in-effect:
  // the Select's own onValueChange is what normally updates selectedClassId.
  const classId = selectedClassId || activeClasses[0]?.id || "";
  const [date, setDate] = useState(todayISO());
  const [records, setRecords] = useState<Record<string, AttendanceEntry>>({});
  const [saving, setSaving] = useState(false);
  const [classDays, setClassDays] = useState<StudentAttendanceDay[]>([]);

  const classStudents = useMemo(() => students.filter((s) => s.classId === classId && !s.isArchived), [students, classId]);

  useEffect(() => {
    if (!classId) return;
    return studentAttendanceRepository.subscribeForClass(classId, setClassDays);
  }, [classId]);

  useEffect(() => {
    if (!classId || !date) return;
    studentAttendanceRepository.getDay(classId, date).then((day) => {
      setRecords(day?.records ?? {});
    });
  }, [classId, date]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setRecords((prev) => ({ ...prev, [studentId]: { status, notes: prev[studentId]?.notes ?? "" } }));
  };

  const markAllPresent = () => {
    const next: Record<string, AttendanceEntry> = {};
    for (const s of classStudents) next[s.id] = { status: "present", notes: "" };
    setRecords(next);
  };

  const handleSave = async () => {
    if (!firebaseUser || !classId) return;
    setSaving(true);
    try {
      await studentAttendanceRepository.saveDay(classId, date, records, firebaseUser.uid);
      toast({ title: t.attendance.saveAttendance, variant: "success" });
    } catch {
      toast({ title: t.common.errorGeneric, variant: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const period = date.slice(0, 7);
  const monthlySummary = useMemo(() => {
    const daysInPeriod = classDays.filter((d) => d.date.startsWith(period));
    return classStudents.map((s) => {
      const entries = daysInPeriod.map((d) => d.records[s.id]).filter(Boolean);
      const present = entries.filter((e) => e.status === "present" || e.status === "late").length;
      return { student: s, percentage: computeAttendancePercentage(present, entries.length), marked: entries.length };
    });
  }, [classDays, classStudents, period]);

  return (
    <RequirePermission permission="attendance:write">
      <PageHeader title={t.attendance.students} subtitle={t.attendance.subtitle} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">{t.attendance.selectClass}</label>
          <Select value={classId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder={t.common.selectPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {activeClasses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">{t.attendance.selectDate}</label>
          <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        </div>
        <Button variant="outline" onClick={markAllPresent} disabled={classStudents.length === 0}>
          <CheckCheck className="h-4 w-4" />
          {t.attendance.markAllPresent}
        </Button>
        <Button onClick={handleSave} disabled={saving || classStudents.length === 0}>
          <Save className="h-4 w-4" />
          {t.attendance.saveAttendance}
        </Button>
      </div>

      {!classId ? (
        <EmptyState title={t.common.noData} description={t.classes.subtitle} />
      ) : classStudents.length === 0 ? (
        <EmptyState title={t.common.noData} />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {classStudents.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 p-3">
                <span className="font-medium">{s.fullName}</span>
                <AttendanceStatusPicker value={records[s.id]?.status} onChange={(status) => setStatus(s.id, status)} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {classStudents.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            {t.attendance.monthlySummary} — {formatDate(`${period}-01`, "MMMM yyyy")}
          </h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {monthlySummary.map(({ student, percentage, marked }) => (
                <div key={student.id} className="flex items-center justify-between p-3 text-sm">
                  <span>{student.fullName}</span>
                  <span className="text-muted-foreground">{marked > 0 ? `${Math.round(percentage)}%` : "—"}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </RequirePermission>
  );
}
