import { z } from "zod";

export const organizationSettingsSchema = z.object({
  id: z.literal("organization").default("organization"),
  name: z.string().min(1).default("جامعہ تعلیم القرآن"),
  address: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  currency: z.string().default("PKR"),
  fiscalYearStartMonth: z.coerce.number().int().min(1).max(12).default(1),
  updatedAt: z.string().optional(),
  updatedBy: z.string().optional(),
});
export type OrganizationSettings = z.infer<typeof organizationSettingsSchema>;

export const organizationSettingsFormSchema = organizationSettingsSchema.omit({ id: true, updatedAt: true, updatedBy: true });
export type OrganizationSettingsFormInput = z.infer<typeof organizationSettingsFormSchema>;
