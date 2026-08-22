import type { Role } from "@/domain/schema/user";

/**
 * Central permission matrix. UI code calls `can(role, permission)` instead
 * of checking `role === 'admin'` inline, so adding a role or changing what
 * it can do is a one-line change here — not a hunt through every page.
 * Firestore security rules (see firestore.rules) are the real enforcement;
 * this matrix drives what the UI shows/hides.
 */
export const PERMISSIONS = [
  "students:read",
  "students:write",
  "teachers:read",
  "teachers:write",
  "classes:read",
  "classes:write",
  "attendance:read",
  "attendance:write",
  "finance:read",
  "finance:write",
  "reports:read",
  "settings:read",
  "settings:write",
  "users:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL_PERMISSIONS = new Set<Permission>(PERMISSIONS);

const ROLE_PERMISSIONS: Record<Role, Set<Permission>> = {
  admin: ALL_PERMISSIONS,
  accountant: new Set<Permission>([
    "students:read",
    "teachers:read",
    "classes:read",
    "attendance:read",
    "finance:read",
    "finance:write",
    "reports:read",
    "settings:read",
  ]),
  teacher: new Set<Permission>([
    "students:read",
    "students:write",
    "teachers:read",
    "classes:read",
    "attendance:read",
    "attendance:write",
    "reports:read",
  ]),
  attendance_manager: new Set<Permission>([
    "students:read",
    "teachers:read",
    "classes:read",
    "attendance:read",
    "attendance:write",
    "reports:read",
  ]),
  viewer: new Set<Permission>([
    "students:read",
    "teachers:read",
    "classes:read",
    "attendance:read",
    "finance:read",
    "reports:read",
    "settings:read",
  ]),
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export function canAny(role: Role | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}
