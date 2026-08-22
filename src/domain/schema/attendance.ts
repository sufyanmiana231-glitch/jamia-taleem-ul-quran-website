import { z } from "zod";
import { isoDateSchema } from "./common";

export const attendanceStatusSchema = z.enum(["present", "absent", "leave", "late"]);
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;

const attendanceEntrySchema = z.object({
  status: attendanceStatusSchema,
  notes: z.string().optional().default(""),
});
export type AttendanceEntry = z.infer<typeof attendanceEntrySchema>;

/**
 * One document per (class, date) holding every student's status in a map.
 * This makes "mark the whole class in one screen" a single read + single
 * write instead of N documents, which matters for bulk-marking UX and cost.
 */
export const studentAttendanceDaySchema = z.object({
  id: z.string(), // `${classId}_${date}`
  classId: z.string(),
  date: isoDateSchema,
  records: z.record(z.string(), attendanceEntrySchema), // studentId -> entry
  createdAt: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string(),
});
export type StudentAttendanceDay = z.infer<typeof studentAttendanceDaySchema>;

/** One document per date holding every teacher's status in a map. */
export const teacherAttendanceDaySchema = z.object({
  id: z.string(), // date
  date: isoDateSchema,
  records: z.record(z.string(), attendanceEntrySchema), // teacherId -> entry
  createdAt: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string(),
});
export type TeacherAttendanceDay = z.infer<typeof teacherAttendanceDaySchema>;
