"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCheck, Save } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale, todayISO, formatDate } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/toast";
import { useRepositoryList } from "@/hooks/useRepositoryList";
import { teachersRepository } from "@/lib/repositories";
import { teacherAttendanceRepository } from "@/lib/repositories/attendance";
import { computeAttendancePercentage } from "@/lib/services/finance-calculations";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { AttendanceStatusPicker } from "@/components/attendance/AttendanceStatusPicker";
import type { AttendanceStatus, AttendanceEntry } from "@/domain/schema/attendance";

export default function TeacherAttendancePage() {
  const { t } = useLocale();
  const { firebaseUser } = useAuth();
  const { toast } = useToast();
  const { data: teachers } = useRepositoryList(teachersRepository);
  const { data: allDays } = useRepositoryList(teacherAttendanceRepository);

  const activeTeachers = useMemo(() => teachers.filter((tr) => !tr.isArchived), [teachers]);
  const [date, setDate] = useState(todayISO());
  const [records, setRecords] = useState<Record<string, AttendanceEntry>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    teacherAttendanceRepository.getDay(date).then((day) => {
      if (active) setRecords(day?.records ?? {});
    });
    return () => {
      active = false;
    };
  }, [date]);

  const setStatus = (teacherId: string, status: AttendanceStatus) => {
    setRecords((prev) => ({ ...prev, [teacherId]: { status, notes: prev[teacherId]?.notes ?? "" } }));
  };

  const markAllPresent = () => {
    const next: Record<string, AttendanceEntry> = {};
    for (const tr of activeTeachers) next[tr.id] = { status: "present", notes: "" };
    setRecords(next);
  };

  const handleSave = async () => {
    if (!firebaseUser) return;
    setSaving(true);
    try {
      await teacherAttendanceRepository.saveDay(date, records, firebaseUser.uid);
      toast({ title: t.attendance.saveAttendance, variant: "success" });
    } catch {
      toast({ title: t.common.errorGeneric, variant: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const period = date.slice(0, 7);
  const monthlySummary = useMemo(() => {
    const daysInPeriod = allDays.filter((d) => d.date.startsWith(period));
    return activeTeachers.map((tr) => {
      const entries = daysInPeriod.map((d) => d.records[tr.id]).filter(Boolean);
      const present = entries.filter((e) => e.status === "present" || e.status === "late").length;
      return { teacher: tr, percentage: computeAttendancePercentage(present, entries.length), marked: entries.length };
    });
  }, [allDays, activeTeachers, period]);

  return (
    <RequirePermission permission="attendance:write">
      <PageHeader title={t.attendance.teachers} subtitle={t.attendance.subtitle} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">{t.attendance.selectDate}</label>
          <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        </div>
        <Button variant="outline" onClick={markAllPresent} disabled={activeTeachers.length === 0}>
          <CheckCheck className="h-4 w-4" />
          {t.attendance.markAllPresent}
        </Button>
        <Button onClick={handleSave} disabled={saving || activeTeachers.length === 0}>
          <Save className="h-4 w-4" />
          {t.attendance.saveAttendance}
        </Button>
      </div>

      {activeTeachers.length === 0 ? (
        <EmptyState title={t.common.noData} />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {activeTeachers.map((tr) => (
              <div key={tr.id} className="flex items-center justify-between gap-3 p-3">
                <span className="font-medium">{tr.fullName}</span>
                <AttendanceStatusPicker value={records[tr.id]?.status} onChange={(status) => setStatus(tr.id, status)} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activeTeachers.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            {t.attendance.monthlySummary} — {formatDate(`${period}-01`, "MMMM yyyy")}
          </h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {monthlySummary.map(({ teacher, percentage, marked }) => (
                <div key={teacher.id} className="flex items-center justify-between p-3 text-sm">
                  <span>{teacher.fullName}</span>
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
