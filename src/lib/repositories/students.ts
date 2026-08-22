import { studentAcademicHistorySchema, studentSchema, type Student, type StudentAcademicHistoryEntry } from "@/domain/schema/student";
import { createLogRepository, createRepository } from "./firestoreRepository";

export const studentsRepository = createRepository<Student, Record<string, unknown>>("students", studentSchema);

export const studentAcademicHistoryRepository = createLogRepository<StudentAcademicHistoryEntry, Record<string, unknown>>(
  "studentAcademicHistory",
  studentAcademicHistorySchema,
);
