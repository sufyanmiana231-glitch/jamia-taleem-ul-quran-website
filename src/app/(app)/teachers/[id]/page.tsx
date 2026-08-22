"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Pencil, Plus, Banknote, HandCoins } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Money } from "@/components/shared/Money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale, formatDate, formatMonth, currentPeriod } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRepositoryList } from "@/hooks/useRepositoryList";
import {
  teachersRepository,
  schoolClassesRepository,
  teacherSalaryHistoryRepository,
  salaryPaymentsRepository,
  teacherLoansRepository,
  loanRepaymentsRepository,
} from "@/lib/repositories";
import { teacherAttendanceRepository } from "@/lib/repositories/attendance";
import { computeAttendancePercentage, computeSalaryRemaining } from "@/lib/services/finance-calculations";
import { TeacherFormDialog } from "@/components/teachers/TeacherFormDialog";
import { SalaryChangeDialog } from "@/components/teachers/SalaryChangeDialog";
import { SalaryPaymentDialog } from "@/components/teachers/SalaryPaymentDialog";
import { TeacherLoanDialog } from "@/components/teachers/TeacherLoanDialog";
import { LoanRepaymentDialog } from "@/components/teachers/LoanRepaymentDialog";

const STATUS_TONE = { active: "success", on_leave: "warning", inactive: "info", left: "danger" } as const;

export default function TeacherProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLocale();
  const { can } = useAuth();

  const { data: teachers, loading } = useRepositoryList(teachersRepository);
  const { data: classes } = useRepositoryList(schoolClassesRepository);
  const { data: salaryHistory } = useRepositoryList(teacherSalaryHistoryRepository);
  const { data: salaryPayments } = useRepositoryList(salaryPaymentsRepository);
  const { data: loans } = useRepositoryList(teacherLoansRepository);
  const { data: repayments } = useRepositoryList(loanRepaymentsRepository);
  const { data: attendanceDays } = useRepositoryList(teacherAttendanceRepository);

  const teacher = useMemo(() => teachers.find((tr) => tr.id === id), [teachers, id]);
  const myHistory = useMemo(() => salaryHistory.filter((h) => h.teacherId === id).sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate)), [salaryHistory, id]);
  const myPayments = useMemo(() => salaryPayments.filter((p) => p.teacherId === id).sort((a, b) => b.period.localeCompare(a.period)), [salaryPayments, id]);
  const myLoans = useMemo(() => loans.filter((l) => l.teacherId === id && !l.isArchived).sort((a, b) => b.issueDate.localeCompare(a.issueDate)), [loans, id]);
  const myAttendance = useMemo(
    () =>
      attendanceDays
        .filter((day) => day.records[id])
        .map((day) => ({ date: day.date, ...day.records[id] }))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [attendanceDays, id],
  );
  const attendancePresent = myAttendance.filter((r) => r.status === "present" || r.status === "late").length;
  const attendancePercentage = computeAttendancePercentage(attendancePresent, myAttendance.length);

  const currentMonthPayment = myPayments.find((p) => p.period === currentPeriod());
  const currentMonthRemaining = teacher ? computeSalaryRemaining(teacher.currentSalary, currentMonthPayment?.paidAmount ?? 0) : 0;

  const [editOpen, setEditOpen] = useState(false);
  const [salaryChangeOpen, setSalaryChangeOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [loanOpen, setLoanOpen] = useState(false);
  const [repayLoan, setRepayLoan] = useState<{ id: string; outstanding: number } | null>(null);

  if (loading) return <p className="text-muted-foreground">{t.common.loading}</p>;
  if (!teacher) return <EmptyState title={t.common.noData} action={<Button onClick={() => router.push("/teachers")}>{t.common.back}</Button>} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/teachers")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />
          {t.common.back}
        </button>
        {can("teachers:write") && (
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            {t.common.edit}
          </Button>
        )}
      </div>

      <PageHeader
        title={teacher.fullName}
        subtitle={`${teacher.designation || t.teachers.title} · ${t.teachers.joiningDate}: ${formatDate(teacher.joiningDate)}`}
        actions={<Badge variant={STATUS_TONE[teacher.status]}>{t.teachers.status[teacher.status]}</Badge>}
      />

      <Tabs defaultValue="overview" dir="rtl">
        <TabsList>
          <TabsTrigger value="overview">{t.teachers.tabs.overview}</TabsTrigger>
          <TabsTrigger value="personal">{t.teachers.tabs.personal}</TabsTrigger>
          <TabsTrigger value="employment">{t.teachers.tabs.employment}</TabsTrigger>
          <TabsTrigger value="salary">{t.teachers.tabs.salary}</TabsTrigger>
          <TabsTrigger value="loans">{t.teachers.tabs.loans}</TabsTrigger>
          <TabsTrigger value="attendance">{t.teachers.tabs.attendance}</TabsTrigger>
          <TabsTrigger value="notes">{t.teachers.tabs.notes}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t.teachers.monthlySalary}</p>
                <p className="mt-1 font-semibold"><Money amount={teacher.currentSalary} /></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t.teachers.payment.remaining} ({formatMonth(currentPeriod())})</p>
                <p className="mt-1 font-semibold"><Money amount={currentMonthRemaining} /></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t.teachers.loan.outstanding}</p>
                <p className="mt-1 font-semibold"><Money amount={myLoans.reduce((s, l) => s + l.outstandingAmount, 0)} /></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t.attendance.attendancePercentage}</p>
                <p className="mt-1 font-semibold">{myAttendance.length > 0 ? `${Math.round(attendancePercentage)}%` : "—"}</p>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{t.teachers.assignedClasses}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {classes.filter((c) => teacher.assignedClassIds.includes(c.id)).map((c) => c.name).join("، ") || "—"}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal">
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 p-5 text-sm sm:grid-cols-3">
              <InfoField label={t.teachers.fatherName} value={teacher.fatherName} />
              <InfoField label={t.teachers.cnic} value={teacher.cnic} ltr />
              <InfoField label={t.teachers.dateOfBirth} value={teacher.dateOfBirth ? formatDate(teacher.dateOfBirth) : "—"} />
              <InfoField label={t.teachers.gender} value={teacher.gender ? t.common[teacher.gender] : "—"} />
              <InfoField label={t.teachers.phone} value={teacher.phone} ltr />
              <InfoField label={t.teachers.altPhone} value={teacher.altPhone} ltr />
              <InfoField label={t.teachers.currentAddress} value={teacher.currentAddress} />
              <InfoField label={t.teachers.permanentAddress} value={teacher.permanentAddress} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employment">
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 p-5 text-sm sm:grid-cols-3">
              <InfoField label={t.teachers.joiningDate} value={formatDate(teacher.joiningDate)} />
              <InfoField label={t.teachers.designation} value={teacher.designation} />
              <InfoField label={t.teachers.subjects} value={teacher.subjects.join("، ")} />
              <InfoField label={t.teachers.assignedClasses} value={classes.filter((c) => teacher.assignedClassIds.includes(c.id)).map((c) => c.name).join("، ")} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary">
          <div className="mb-3 flex justify-end gap-2">
            {can("finance:write") && (
              <>
                <Button size="sm" variant="outline" onClick={() => setSalaryChangeOpen(true)}>
                  {t.teachers.salaryChange.title}
                </Button>
                <Button size="sm" onClick={() => setPaymentOpen(true)}>
                  <Banknote className="h-4 w-4" />
                  {t.teachers.payment.title}
                </Button>
              </>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t.finance.salaries.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {myPayments.length === 0 ? (
                <div className="p-5"><EmptyState title={t.common.noData} /></div>
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {myPayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-4 text-sm">
                      <div>
                        <p className="font-medium">{formatMonth(p.period)}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.teachers.payment.paid}: <Money amount={p.paidAmount} /> / {t.teachers.payment.expected}: <Money amount={p.expectedAmount} />
                        </p>
                      </div>
                      <Badge variant={p.status === "paid" ? "success" : p.status === "partial" ? "warning" : "danger"}>
                        {t.teachers.payment.status[p.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{t.teachers.tabs.salaryHistory}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {myHistory.length === 0 ? (
                <div className="p-5"><EmptyState title={t.common.noData} /></div>
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {myHistory.map((h) => (
                    <div key={h.id} className="flex items-center justify-between p-4 text-sm">
                      <div>
                        <p className="font-medium">
                          <Money amount={h.previousSalary} /> ← <Money amount={h.newSalary} />
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(h.effectiveDate)} — {h.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans">
          <div className="mb-3 flex justify-end">
            {can("finance:write") && (
              <Button size="sm" onClick={() => setLoanOpen(true)}>
                <Plus className="h-4 w-4" />
                {t.teachers.loan.addLoan}
              </Button>
            )}
          </div>
          <Card>
            <CardContent className="p-0">
              {myLoans.length === 0 ? (
                <div className="p-5"><EmptyState title={t.common.noData} /></div>
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {myLoans.map((loan) => (
                    <div key={loan.id} className="flex flex-col gap-2 p-4 text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {t.teachers.loan.type[loan.type]} — <Money amount={loan.amount} />
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(loan.issueDate)} — {loan.reason || "—"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={loan.isSettled ? "success" : "warning"}>
                            {loan.isSettled ? t.common.active : `${t.teachers.loan.outstanding}: `}
                            {!loan.isSettled && <Money amount={loan.outstandingAmount} className="ms-1" />}
                          </Badge>
                          {can("finance:write") && !loan.isSettled && (
                            <Button size="sm" variant="outline" onClick={() => setRepayLoan({ id: loan.id, outstanding: loan.outstandingAmount })}>
                              <HandCoins className="h-4 w-4" />
                              {t.teachers.loan.repay}
                            </Button>
                          )}
                        </div>
                      </div>
                      {repayments.filter((r) => r.loanId === loan.id).length > 0 && (
                        <div className="ms-4 flex flex-col gap-1 border-e border-border pe-3 text-xs text-muted-foreground">
                          {repayments
                            .filter((r) => r.loanId === loan.id)
                            .sort((a, b) => b.date.localeCompare(a.date))
                            .map((r) => (
                              <div key={r.id} className="flex items-center justify-between">
                                <span>{formatDate(r.date)}</span>
                                <Money amount={r.amount} />
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>
                {t.attendance.attendancePercentage}: {myAttendance.length > 0 ? `${Math.round(attendancePercentage)}%` : "—"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myAttendance.length === 0 ? (
                <EmptyState title={t.common.noData} />
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {myAttendance.slice(0, 30).map((r) => (
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

        <TabsContent value="notes">
          <Card>
            <CardContent className="p-5 text-sm">{teacher.notes || t.common.noData}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TeacherFormDialog open={editOpen} onOpenChange={setEditOpen} teacher={teacher} classes={classes.filter((c) => !c.isArchived)} />
      <SalaryChangeDialog open={salaryChangeOpen} onOpenChange={setSalaryChangeOpen} teacherId={teacher.id} currentSalary={teacher.currentSalary} />
      <SalaryPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        teacherId={teacher.id}
        expectedAmount={teacher.currentSalary}
        remaining={currentMonthRemaining}
      />
      <TeacherLoanDialog open={loanOpen} onOpenChange={setLoanOpen} teacherId={teacher.id} />
      {repayLoan && (
        <LoanRepaymentDialog
          open={!!repayLoan}
          onOpenChange={(open) => !open && setRepayLoan(null)}
          loanId={repayLoan.id}
          teacherId={teacher.id}
          outstandingAmount={repayLoan.outstanding}
        />
      )}
    </div>
  );
}

function InfoField({ label, value, ltr }: { label: string; value?: string | null; ltr?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5" dir={ltr ? "ltr" : undefined}>
        {value || "—"}
      </p>
    </div>
  );
}
