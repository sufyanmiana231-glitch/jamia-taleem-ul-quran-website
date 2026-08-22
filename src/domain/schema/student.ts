import { z } from "zod";
import { auditFieldsSchema, genderSchema, isoDateSchema } from "./common";

export const studentStatusSchema = z.enum(["active", "on_leave", "completed", "transferred", "left"]);
export type StudentStatus = z.infer<typeof studentStatusSchema>;

export const studentBaseSchema = z.object({
  fullName: z.string().min(2, "پورا نام درج کریں"),
  fatherName: z.string().min(2, "والد کا نام درج کریں"),
  dateOfBirth: isoDateSchema.optional().or(z.literal("")),
  gender: genderSchema.optional(),
  guardianName: z.string().optional().default(""),
  guardianRelation: z.string().optional().default(""),
  guardianPhone: z.string().min(7, "درست فون نمبر درج کریں"),
  altPhone: z.string().optional().default(""),
  cnic: z.string().optional().default(""),
  currentAddress: z.string().optional().default(""),
  permanentAddress: z.string().optional().default(""),
  photoUrl: z.string().optional().default(""),

  admissionDate: isoDateSchema,
  admissionNumber: z.string().min(1),
  classId: z.string().nullable().default(null),
  previousEducation: z.string().optional().default(""),
  status: studentStatusSchema.default("active"),
  specialRequirements: z.string().optional().default(""),

  program: z.string().optional().default(""),
  mentorTeacherId: z.string().nullable().optional().default(null),
  academicNotes: z.string().optional().default(""),
  hifzProgress: z.string().optional().default(""),
  tajweedLevel: z.string().optional().default(""),

  notes: z.string().optional().default(""),
  isArchived: z.boolean().default(false),
});

export const studentSchema = studentBaseSchema.extend({
  id: z.string(),
}).merge(auditFieldsSchema);
export type Student = z.infer<typeof studentSchema>;

export const studentFormSchema = studentBaseSchema;
export type StudentFormInput = z.infer<typeof studentFormSchema>;

/** Append-only log — class/status transitions are never overwritten in place. */
export const studentAcademicHistorySchema = z.object({
  id: z.string(),
  studentId: z.string(),
  date: isoDateSchema,
  previousClassId: z.string().nullable(),
  newClassId: z.string().nullable(),
  previousStatus: studentStatusSchema.nullable(),
  newStatus: studentStatusSchema.nullable(),
  reason: z.string().optional().default(""),
  createdAt: z.string(),
  createdBy: z.string(),
});
export type StudentAcademicHistoryEntry = z.infer<typeof studentAcademicHistorySchema>;
