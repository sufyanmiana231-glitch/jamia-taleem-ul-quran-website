import { z } from "zod";

/**
 * Shared primitives used across the domain model.
 * Dates are stored as ISO "YYYY-MM-DD" (date-only) unless the field name ends in "At",
 * in which case it is a full ISO-8601 timestamp.
 */

export const genderSchema = z.enum(["male", "female"]);
export type Gender = z.infer<typeof genderSchema>;

export const paymentMethodSchema = z.enum(["cash", "bank_transfer", "cheque", "mobile_wallet", "other"]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "درست تاریخ درج کریں (YYYY-MM-DD)");

export const periodSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "درست مہینہ منتخب کریں (YYYY-MM)");

export const moneySchema = z.coerce.number().finite().min(0, "رقم منفی نہیں ہو سکتی");

/** Fields present on every persisted document for auditability (see docs/BUSINESS_RULES.md). */
export const auditFieldsSchema = z.object({
  createdAt: z.string(),
  createdBy: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string(),
});
export type AuditFields = z.infer<typeof auditFieldsSchema>;

export const archivableSchema = z.object({
  isArchived: z.boolean().default(false),
});

export interface WithId {
  id: string;
}
