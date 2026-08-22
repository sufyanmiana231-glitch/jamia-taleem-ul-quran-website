"use client";

import { useMemo, useState } from "react";
import { Plus, Archive, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Money } from "@/components/shared/Money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/toast";
import { useRepositoryList } from "@/hooks/useRepositoryList";
import { teachersRepository, schoolClassesRepository } from "@/lib/repositories";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import type { Teacher, TeacherStatus } from "@/domain/schema/teacher";
import { TeacherFormDialog } from "@/components/teachers/TeacherFormDialog";

const STATUS_TONE: Record<TeacherStatus, "success" | "warning" | "info" | "danger"> = {
  active: "success",
  on_leave: "warning",
  inactive: "info",
  left: "danger",
};

export default function TeachersPage() {
  const { t } = useLocale();
  const { firebaseUser, can } = useAuth();
  const { toast } = useToast();
  const { data: teachers } = useRepositoryList(teachersRepository);
  const { data: classes } = useRepositoryList(schoolClassesRepository);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | undefined>(undefined);
  const [archiveTarget, setArchiveTarget] = useState<Teacher | null>(null);

  const canWrite = can("teachers:write");

  const filtered = useMemo(
    () => teachers.filter((tr) => !tr.isArchived && (statusFilter === "all" || tr.status === statusFilter)),
    [teachers, statusFilter],
  );

  const columns: DataTableColumn<Teacher>[] = [
    {
      key: "name",
      header: t.teachers.fullName,
      cell: (tr) => (
        <div>
          <p className="font-medium">{tr.fullName}</p>
          <p className="text-xs text-muted-foreground">{tr.designation || "—"}</p>
        </div>
      ),
    },
    { key: "phone", header: t.teachers.phone, cell: (tr) => <span dir="ltr">{tr.phone}</span> },
    {
      key: "classes",
      header: t.classes.title,
      cell: (tr) => classes.filter((c) => tr.assignedClassIds.includes(c.id)).map((c) => c.name).join("، ") || "—",
    },
    { key: "salary", header: t.teachers.monthlySalary, cell: (tr) => <Money amount={tr.currentSalary} /> },
    { key: "status", header: t.common.status, cell: (tr) => <Badge variant={STATUS_TONE[tr.status]}>{t.teachers.status[tr.status]}</Badge> },
  ];

  if (canWrite) {
    columns.push({
      key: "actions",
      header: t.common.actions,
      className: "text-left",
      cell: (tr) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(tr);
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
              setArchiveTarget(tr);
            }}
          >
            <Archive className="h-4 w-4" />
          </Button>
        </div>
      ),
    });
  }

  return (
    <RequirePermission permission="teachers:read">
      <PageHeader
        title={t.teachers.title}
        subtitle={t.teachers.subtitle}
        actions={
          canWrite && (
            <Button
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {t.teachers.addTeacher}
            </Button>
          )
        }
      />

      <DataTable
        data={filtered}
        columns={columns}
        searchFields={(tr) => [tr.fullName, tr.fatherName, tr.phone]}
        rowHref={(tr) => `/teachers/${tr.id}`}
        emptyDescription={t.teachers.subtitle}
        toolbar={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.common.all}</SelectItem>
              {(Object.keys(t.teachers.status) as TeacherStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {t.teachers.status[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <TeacherFormDialog open={formOpen} onOpenChange={setFormOpen} teacher={editing} classes={classes.filter((c) => !c.isArchived)} />

      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={t.common.confirmArchiveTitle}
        description={t.common.confirmDeleteDesc}
        onConfirm={async () => {
          if (!archiveTarget || !firebaseUser) return;
          await teachersRepository.setArchived(archiveTarget.id, true, firebaseUser.uid);
          toast({ title: t.common.successSaved, variant: "success" });
        }}
      />
    </RequirePermission>
  );
}
