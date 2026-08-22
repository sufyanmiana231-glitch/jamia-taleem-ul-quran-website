import { z } from "zod";
import { auditFieldsSchema } from "./common";

export const schoolClassBaseSchema = z.object({
  name: z.string().min(1, "جماعت کا نام درج کریں"),
  description: z.string().optional().default(""),
  teacherIds: z.array(z.string()).default([]),
  capacity: z.coerce.number().int().min(0).optional(),
  isArchived: z.boolean().default(false),
});

export const schoolClassSchema = schoolClassBaseSchema.extend({ id: z.string() }).merge(auditFieldsSchema);
export type SchoolClass = z.infer<typeof schoolClassSchema>;

export const schoolClassFormSchema = schoolClassBaseSchema;
export type SchoolClassFormInput = z.infer<typeof schoolClassFormSchema>;
