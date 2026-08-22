"use client";

import { useState } from "react";
import { Plus, Archive, ArchiveRestore, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/toast";
import { useRepositoryList } from "@/hooks/useRepositoryList";
import { schoolClassesRepository, studentsRepository, teachersRepository } from "@/lib/repositories";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import type { SchoolClass } from "@/domain/schema/schoolClass";
import { ClassFormDialog } from "@/components/classes/ClassFormDialog";

export default function ClassesPage() {
  const { t } = useLocale();
  const { firebaseUser, can } = useAuth();
  const { toast } = useToast();
  const { data: classes } = useRepositoryList(schoolClassesRepository);
  const { data: students } = useRepositoryList(studentsRepository);
  const { data: teachers } = useRepositoryList(teachersRepository);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolClass | undefined>(undefined);
  const [archiveTarget, setArchiveTarget] = useState<SchoolClass | null>(null);

  const visible = classes.filter((c) => !c.isArchived);
  const canWrite = can("classes:write");

  const columns: DataTableColumn<SchoolClass>[] = [
    { key: "name", header: t.classes.className, cell: (c) => <span className="font-medium">{c.name}</span> },
    {
      key: "teachers",
      header: t.classes.assignedTeachers,
      cell: (c) => (
        <span className="text-sm text-muted-foreground">
          {c.teacherIds.map((id) => teachers.find((tr) => tr.id === id)?.fullName).filter(Boolean).join("، ") || "—"}
        </span>
      ),
    },
    {
      key: "students",
      header: t.classes.totalStudents,
      cell: (c) => <Badge variant="brand">{students.filter((s) => s.classId === c.id && !s.isArchived).length}</Badge>,
    },
  ];

  if (canWrite) {
    columns.push({
      key: "actions",
      header: t.common.actions,
      className: "text-left",
      cell: (c) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(c);
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
              setArchiveTarget(c);
            }}
          >
            <Archive className="h-4 w-4" />
          </Button>
        </div>
      ),
    });
  }

  return (
    <RequirePermission permission="classes:read">
      <PageHeader
        title={t.classes.title}
        subtitle={t.classes.subtitle}
        actions={
          canWrite && (
            <Button
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {t.classes.addClass}
            </Button>
          )
        }
      />

      <DataTable
        data={visible}
        columns={columns}
        searchFields={(c) => [c.name]}
        emptyDescription={t.classes.subtitle}
      />

      {classes.some((c) => c.isArchived) && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{t.common.archive}</h2>
          <DataTable
            data={classes.filter((c) => c.isArchived)}
            columns={[
              { key: "name", header: t.classes.className, cell: (c) => c.name },
              {
                key: "restore",
                header: "",
                className: "text-left",
                cell: (c) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (!firebaseUser) return;
                      await schoolClassesRepository.setArchived(c.id, false, firebaseUser.uid);
                      toast({ title: t.common.successSaved, variant: "success" });
                    }}
                  >
                    <ArchiveRestore className="h-4 w-4" />
                    {t.common.unarchive}
                  </Button>
                ),
              },
            ]}
          />
        </div>
      )}

      <ClassFormDialog open={formOpen} onOpenChange={setFormOpen} schoolClass={editing} teachers={teachers.filter((tr) => !tr.isArchived)} />

      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={t.common.confirmArchiveTitle}
        description={t.common.confirmDeleteDesc}
        onConfirm={async () => {
          if (!archiveTarget || !firebaseUser) return;
          await schoolClassesRepository.setArchived(archiveTarget.id, true, firebaseUser.uid);
          toast({ title: t.common.successSaved, variant: "success" });
        }}
      />
    </RequirePermission>
  );
}
