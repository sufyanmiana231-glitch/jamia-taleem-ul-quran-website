import { z } from "zod";

/**
 * Roles are intentionally a flat, extensible enum rather than a fully dynamic
 * permission-builder — the org has a small, known set of staff roles. Adding a
 * role means adding one enum value + one row in the permission matrix
 * (see src/lib/auth/roles.ts), not a schema migration.
 */
export const roleSchema = z.enum(["admin", "accountant", "teacher", "attendance_manager", "viewer"]);
export type Role = z.infer<typeof roleSchema>;

export const appUserSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  role: roleSchema,
  isActive: z.boolean().default(true),
  linkedTeacherId: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type AppUser = z.infer<typeof appUserSchema>;
