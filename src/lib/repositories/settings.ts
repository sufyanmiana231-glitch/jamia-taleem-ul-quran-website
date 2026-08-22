import { organizationSettingsSchema, type OrganizationSettings } from "@/domain/schema/settings";
import { createSingletonRepository } from "./firestoreRepository";

export const organizationSettingsRepository = createSingletonRepository<OrganizationSettings>(
  "settings",
  "organization",
  organizationSettingsSchema,
);
