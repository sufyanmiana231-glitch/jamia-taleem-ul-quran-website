"use client";

import { useMemo, useState } from "react";
import { Plus, Archive, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale, formatDate } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/toast";
import { useRepositoryList } from "@/hooks/useRepositoryList";
import { studentsRepository, schoolClassesRepository, teachersRepository } from "@/lib/repositories";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import type { Student, StudentStatus } from "@/domain/schema/student";
import { StudentFormDialog } from "@/components/students/StudentFormDialog";

const STATUS_TONE: Record<StudentStatus, "success" | "warning" | "brand" | "info" | "danger"> = {
  active: "success",
  on_leave: "warning",
  completed: "brand",
  transferred: "info",
  left: "danger",
};

export default function StudentsPage() {
  const { t } = useLocale();
  const { firebaseUser, can } = useAuth();
  const { toast } = useToast();
  const { data: students } = useRepositoryList(studentsRepository);
  const { data: classes } = useRepositoryList(schoolClassesRepository);
  const { data: teachers } = useRepositoryList(teachersRepository);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | undefined>(undefined);
  const [archiveTarget, setArchiveTarget] = useState<Student | null>(null);

  const canWrite = can("students:write");

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (s.isArchived) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (classFilter !== "all" && s.classId !== classFilter) return false;
      return true;
    });
  }, [students, statusFilter, classFilter]);

  const columns: DataTableColumn<Student>[] = [
    {
      key: "name",
      header: t.students.fullName,
      cell: (s) => (
        <div>
          <p className="font-medium">{s.fullName}</p>
          <p className="text-xs text-muted-foreground">{s.fatherName}</p>
        </div>
      ),
    },
    {
      key: "class",
      header: t.students.currentClass,
      cell: (s) => classes.find((c) => c.id === s.classId)?.name ?? "—",
    },
    { key: "phone", header: t.students.guardianPhone, cell: (s) => <span dir="ltr">{s.guardianPhone || "—"}</span> },
    { key: "admission", header: t.students.admissionDate, cell: (s) => formatDate(s.admissionDate) },
    {
      key: "status",
      header: t.common.status,
      cell: (s) => <Badge variant={STATUS_TONE[s.status]}>{t.students.status[s.status]}</Badge>,
    },
  ];

  if (canWrite) {
    columns.push({
      key: "actions",
      header: t.common.actions,
      className: "text-left",
      cell: (s) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(s);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setArchiveTarget(s);
            }}
          >
            <Archive className="h-4 w-4" />
          </Button>
        </div>
      ),
    });
  }

  return (
    <RequirePermission permission="students:read">
      <PageHeader
        title={t.students.title}
        subtitle={t.students.subtitle}
        actions={
          canWrite && (
            <Button
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {t.students.addStudent}
            </Button>
          )
        }
      />

      <DataTable
        data={filtered}
        columns={columns}
        searchFields={(s) => [s.fullName, s.fatherName, s.guardianPhone, s.admissionNumber]}
        searchPlaceholder={t.common.search}
        rowHref={(s) => `/students/${s.id}`}
        emptyDescription={t.students.subtitle}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}</SelectItem>
                {(Object.keys(t.students.status) as StudentStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {t.students.status[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <StudentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        student={editing}
        classes={classes.filter((c) => !c.isArchived)}
        teachers={teachers.filter((tr) => !tr.isArchived)}
      />

      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={t.common.confirmArchiveTitle}
        description={t.common.confirmDeleteDesc}
        onConfirm={async () => {
          if (!archiveTarget || !firebaseUser) return;
          await studentsRepository.setArchived(archiveTarget.id, true, firebaseUser.uid);
          toast({ title: t.common.successSaved, variant: "success" });
        }}
      />
    </RequirePermission>
  );
}
