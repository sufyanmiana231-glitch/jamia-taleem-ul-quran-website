import { auditLogEntrySchema, type AuditLogEntry } from "@/domain/schema/audit";
import { createLogRepository } from "./firestoreRepository";

export const auditLogRepository = createLogRepository<AuditLogEntry, Record<string, unknown>>(
  "auditLogs",
  auditLogEntrySchema,
  "performedAt",
);
