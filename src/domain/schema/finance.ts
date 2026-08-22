import { z } from "zod";
import { auditFieldsSchema, isoDateSchema, moneySchema, paymentMethodSchema, periodSchema } from "./common";

/**
 * Every rupee that moves is one ledger entry. Income, expenses, salary
 * payments, and loan disbursements/repayments all *write* a ledger entry
 * through the finance-service — nothing computes a running balance by
 * hand, and nothing edits a ledger entry after the fact (see
 * docs/BUSINESS_RULES.md). Reversals are posted as new offsetting entries.
 */
export const ledgerEntryTypeSchema = z.enum([
  "income",
  "expense",
  "salary_payment",
  "loan_disbursement",
  "loan_repayment",
]);
export type LedgerEntryType = z.infer<typeof ledgerEntryTypeSchema>;

export const ledgerDirectionSchema = z.enum(["credit", "debit"]);
export type LedgerDirection = z.infer<typeof ledgerDirectionSchema>;

export const ledgerEntrySchema = z.object({
  id: z.string(),
  type: ledgerEntryTypeSchema,
  direction: ledgerDirectionSchema,
  amount: moneySchema,
  date: isoDateSchema,
  description: z.string(),
  sourceCollection: z.string(),
  sourceDocId: z.string(),
  fundCategory: z.string().optional(),
  expenseCategoryId: z.string().optional(),
  linkedStudentId: z.string().optional(),
  linkedTeacherId: z.string().optional(),
  paymentMethod: paymentMethodSchema.optional(),
  reference: z.string().optional().default(""),
  isVoid: z.boolean().default(false),
  createdAt: z.string(),
  createdBy: z.string(),
});
export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;

/** Configurable, not a hard enum — orgs may add fund types their scholars require. */
export const DEFAULT_FUND_CATEGORIES = ["donation", "zakat", "sadaqah", "general", "scholarship_fund", "other"] as const;

export const incomeBaseSchema = z.object({
  amount: moneySchema.refine((v) => v > 0, "رقم صفر سے زیادہ ہونی چاہیے"),
  date: isoDateSchema,
  fundCategory: z.string().min(1, "فنڈ کی قسم منتخب کریں"),
  sourceName: z.string().optional().default(""),
  description: z.string().optional().default(""),
  paymentMethod: paymentMethodSchema,
  reference: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  isRestricted: z.boolean().default(false),
  isArchived: z.boolean().default(false),
});

export const incomeSchema = incomeBaseSchema.extend({ id: z.string(), ledgerEntryId: z.string() }).merge(auditFieldsSchema);
export type Income = z.infer<typeof incomeSchema>;

export const incomeFormSchema = incomeBaseSchema;
export type IncomeFormInput = z.infer<typeof incomeFormSchema>;

/** Configurable categories grouped for reporting; admin manages these from Settings. */
export const expenseGroupSchema = z.enum(["utilities", "kitchen", "student", "salary", "other"]);
export type ExpenseGroup = z.infer<typeof expenseGroupSchema>;

export const expenseCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  group: expenseGroupSchema,
  isDefault: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  createdAt: z.string(),
});
export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;

export const expenseCategoryFormSchema = z.object({
  name: z.string().min(1, "زمرہ کا نام درج کریں"),
  group: expenseGroupSchema,
});
export type ExpenseCategoryFormInput = z.infer<typeof expenseCategoryFormSchema>;

export const expensePaymentStatusSchema = z.enum(["pending", "paid"]);
export type ExpensePaymentStatus = z.infer<typeof expensePaymentStatusSchema>;

export const expenseBaseSchema = z.object({
  categoryId: z.string().min(1, "زمرہ منتخب کریں"),
  amount: moneySchema.refine((v) => v > 0, "رقم صفر سے زیادہ ہونی چاہیے"),
  billDate: isoDateSchema,
  dueDate: isoDateSchema.optional().or(z.literal("")),
  paymentDate: isoDateSchema.optional().or(z.literal("")),
  status: expensePaymentStatusSchema.default("paid"),
  description: z.string().min(1, "تفصیل درج کریں"),
  linkedStudentId: z.string().optional(),
  linkedTeacherId: z.string().optional(),
  paymentMethod: paymentMethodSchema.optional(),
  reference: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  isArchived: z.boolean().default(false),
});

export const expenseSchema = expenseBaseSchema.extend({ id: z.string(), ledgerEntryId: z.string().optional() }).merge(auditFieldsSchema);
export type Expense = z.infer<typeof expenseSchema>;

export const expenseFormSchema = expenseBaseSchema;
export type ExpenseFormInput = z.infer<typeof expenseFormSchema>;

/** One row per (category, period). Actual spend is derived from expenses, never stored redundantly. */
export const budgetSchema = z.object({
  id: z.string(), // `${categoryId}_${period}`
  categoryId: z.string(),
  period: periodSchema,
  allocatedAmount: moneySchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string(),
});
export type Budget = z.infer<typeof budgetSchema>;

export const budgetFormSchema = z.object({
  categoryId: z.string().min(1),
  period: periodSchema,
  allocatedAmount: moneySchema.refine((v) => v > 0, "رقم صفر سے زیادہ ہونی چاہیے"),
});
export type BudgetFormInput = z.infer<typeof budgetFormSchema>;

/** Student welfare support always creates a linked Expense (categoryId in the "student" group) to avoid double accounting. */
export const welfareSupportBaseSchema = z.object({
  studentId: z.string().min(1),
  categoryId: z.string().min(1, "زمرہ منتخب کریں"),
  amount: moneySchema.refine((v) => v > 0, "رقم صفر سے زیادہ ہونی چاہیے"),
  date: isoDateSchema,
  description: z.string().optional().default(""),
  approvedBy: z.string().optional().default(""),
});
export const welfareSupportSchema = welfareSupportBaseSchema.extend({
  id: z.string(),
  expenseId: z.string(),
  createdAt: z.string(),
  createdBy: z.string(),
});
export type WelfareSupport = z.infer<typeof welfareSupportSchema>;
export type WelfareSupportFormInput = z.infer<typeof welfareSupportBaseSchema>;
