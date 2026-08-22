import { schoolClassSchema, type SchoolClass } from "@/domain/schema/schoolClass";
import { createRepository } from "./firestoreRepository";

export const schoolClassesRepository = createRepository<SchoolClass, Record<string, unknown>>(
  "schoolClasses",
  schoolClassSchema,
);
