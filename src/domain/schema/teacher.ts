import { z } from "zod";
import { auditFieldsSchema, genderSchema, isoDateSchema, moneySchema, paymentMethodSchema } from "./common";

export const teacherStatusSchema = z.enum(["active", "on_leave", "inactive", "left"]);
export type TeacherStatus = z.infer<typeof teacherStatusSchema>;

export const teacherBaseSchema = z.object({
  fullName: z.string().min(2, "پورا نام درج کریں"),
  fatherName: z.string().min(2, "والد کا نام درج کریں"),
  cnic: z.string().optional().default(""),
  dateOfBirth: isoDateSchema.optional().or(z.literal("")),
  gender: genderSchema.optional(),
  phone: z.string().min(7, "درست فون نمبر درج کریں"),
  altPhone: z.string().optional().default(""),
  currentAddress: z.string().optional().default(""),
  permanentAddress: z.string().optional().default(""),
  photoUrl: z.string().optional().default(""),
  notes: z.string().optional().default(""),

  joiningDate: isoDateSchema,
  status: teacherStatusSchema.default("active"),
  designation: z.string().optional().default(""),
  subjects: z.array(z.string()).default([]),
  assignedClassIds: z.array(z.string()).default([]),

  /** Denormalized from the latest salaryHistory entry — never edited directly, see finance-service. */
  currentSalary: moneySchema,
  salaryStartDate: isoDateSchema,

  isArchived: z.boolean().default(false),
});

export const teacherSchema = teacherBaseSchema.extend({ id: z.string() }).merge(auditFieldsSchema);
export type Teacher = z.infer<typeof teacherSchema>;

export const teacherFormSchema = teacherBaseSchema.omit({ currentSalary: true }).extend({
  /** Only used when creating a teacher, to seed the first salary-history entry. */
  initialSalary: moneySchema,
});
export type TeacherFormInput = z.infer<typeof teacherFormSchema>;

/** Append-only — a salary change never overwrites the previous entry. */
export const teacherSalaryHistorySchema = z.object({
  id: z.string(),
  teacherId: z.string(),
  previousSalary: moneySchema,
  newSalary: moneySchema,
  effectiveDate: isoDateSchema,
  reason: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  createdAt: z.string(),
  createdBy: z.string(),
});
export type TeacherSalaryHistoryEntry = z.infer<typeof teacherSalaryHistorySchema>;

export const salaryChangeFormSchema = z.object({
  newSalary: moneySchema,
  effectiveDate: isoDateSchema,
  reason: z.string().min(1, "وجہ درج کریں"),
  notes: z.string().optional().default(""),
});
export type SalaryChangeFormInput = z.infer<typeof salaryChangeFormSchema>;

export const salaryPaymentStatusSchema = z.enum(["pending", "partial", "paid"]);
export type SalaryPaymentStatus = z.infer<typeof salaryPaymentStatusSchema>;

/** One row per (teacher, period) is expected, but multiple partial payments can reference it via payments subcollection. */
export const salaryPaymentSchema = z.object({
  id: z.string(),
  teacherId: z.string(),
  period: z.string(), // YYYY-MM
  expectedAmount: moneySchema,
  paidAmount: moneySchema,
  remainingAmount: moneySchema,
  status: salaryPaymentStatusSchema,
  lastPaymentDate: isoDateSchema.optional().or(z.literal("")),
  paymentMethod: paymentMethodSchema.optional(),
  reference: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  ledgerEntryIds: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string(),
});
export type SalaryPayment = z.infer<typeof salaryPaymentSchema>;

export const recordSalaryPaymentFormSchema = z.object({
  teacherId: z.string().min(1),
  period: z.string().min(1),
  amount: moneySchema.refine((v) => v > 0, "رقم صفر سے زیادہ ہونی چاہیے"),
  paymentDate: isoDateSchema,
  paymentMethod: paymentMethodSchema,
  reference: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});
export type RecordSalaryPaymentInput = z.infer<typeof recordSalaryPaymentFormSchema>;

export const loanTypeSchema = z.enum(["loan", "salary_advance", "emergency"]);
export type LoanType = z.infer<typeof loanTypeSchema>;

export const teacherLoanSchema = z.object({
  id: z.string(),
  teacherId: z.string(),
  amount: moneySchema,
  outstandingAmount: moneySchema,
  issueDate: isoDateSchema,
  type: loanTypeSchema,
  reason: z.string().optional().default(""),
  deductFromSalary: z.boolean().default(false),
  notes: z.string().optional().default(""),
  isSettled: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  ledgerEntryId: z.string().optional(),
  createdAt: z.string(),
  createdBy: z.string(),
  updatedAt: z.string().optional(),
  updatedBy: z.string().optional(),
});
export type TeacherLoan = z.infer<typeof teacherLoanSchema>;

export const teacherLoanFormSchema = z.object({
  teacherId: z.string().min(1),
  amount: moneySchema.refine((v) => v > 0, "رقم صفر سے زیادہ ہونی چاہیے"),
  issueDate: isoDateSchema,
  type: loanTypeSchema,
  reason: z.string().optional().default(""),
  deductFromSalary: z.boolean().default(false),
  notes: z.string().optional().default(""),
});
export type TeacherLoanFormInput = z.infer<typeof teacherLoanFormSchema>;

export const loanRepaymentSchema = z.object({
  id: z.string(),
  loanId: z.string(),
  teacherId: z.string(),
  amount: moneySchema,
  date: isoDateSchema,
  paymentMethod: paymentMethodSchema,
  notes: z.string().optional().default(""),
  ledgerEntryId: z.string().optional(),
  createdAt: z.string(),
  createdBy: z.string(),
});
export type LoanRepayment = z.infer<typeof loanRepaymentSchema>;

export const loanRepaymentFormSchema = z.object({
  amount: moneySchema.refine((v) => v > 0, "رقم صفر سے زیادہ ہونی چاہیے"),
  date: isoDateSchema,
  paymentMethod: paymentMethodSchema,
  notes: z.string().optional().default(""),
});
export type LoanRepaymentFormInput = z.infer<typeof loanRepaymentFormSchema>;
